import { HostReadError } from '@/services/pptb/host.types';
import { normalizeSettingName, SETTING_NAMES } from '@/features/inspector/model/settings';
import type {
  Readable,
  SettingName,
  SiteRef,
  TablePermissionFact,
  UnreadableRow,
  WebRoleFact,
} from '@/types/inspector';
import type { AccessType, Privilege } from '@/types/recipe';
import { GUID, SECRET_ENVVAR_TYPE } from './queries';

type JsonObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `statecode` 0 is Active and 1 is Inactive (Learn); anything else is not a row we can classify. */
function activeFlag(statecode: unknown): boolean | null {
  return statecode === 0 ? true : statecode === 1 ? false : null;
}

/** An absent key is `false`; a present non-boolean is unreadable (`null`). */
function optionalBoolean(content: JsonObject, key: string): boolean | null {
  const value = content[key];
  if (value === undefined) return false;
  return typeof value === 'boolean' ? value : null;
}

/** An absent key is `[]`; a present non-array, or an array with a non-string, is unreadable (`null`). */
function optionalIds(content: JsonObject, key: string): readonly string[] | null {
  const value = content[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    ids.push(item);
  }
  return ids;
}

/** One `powerpagecomponent` row after its envelope is validated. `content` is the parsed JSON object, or null. */
export type ComponentRow = {
  id: string;
  name: string;
  active: boolean;
  content: JsonObject | null;
};

function parseContent(raw: unknown): JsonObject | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Null when the id, name or state cannot be read; unreadable `content` is reported as `content: null`. */
export function parseComponentRow(raw: unknown): ComponentRow | null {
  if (!isObject(raw)) return null;
  const { powerpagecomponentid: id, name, statecode, content } = raw;
  const active = activeFlag(statecode);
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || active === null) {
    return null;
  }
  return { id, name, active, content: parseContent(content) };
}

export function parseSites(rows: readonly unknown[]): readonly SiteRef[] {
  return rows.map((raw): SiteRef => {
    if (isObject(raw)) {
      const { powerpagesiteid: id, name, primarydomainname: domain, statecode } = raw;
      const active = activeFlag(statecode);
      if (typeof id === 'string' && id !== '' && typeof name === 'string' && active !== null) {
        return { id, name, domain: typeof domain === 'string' ? domain : '', active };
      }
    }
    throw new HostReadError('Unexpected response from Dataverse.', null);
  });
}

/** A Server Logic record before its code is downloaded. */
export type FileRecord = {
  id: string;
  name: string;
  active: boolean;
  roleIds: Readable<readonly string[]>;
};

/** `skipped` counts rows without a readable id, name or state; the caller reports the inventory as incomplete. */
export function parseServerLogic(rows: readonly unknown[]): {
  records: readonly FileRecord[];
  skipped: number;
} {
  const records: FileRecord[] = [];
  let skipped = 0;
  for (const raw of rows) {
    const row = parseComponentRow(raw);
    if (row === null) {
      skipped += 1;
      continue;
    }
    const ids = row.content === null ? null : optionalIds(row.content, 'adx_serverlogic_adx_webrole');
    records.push({
      id: row.id,
      name: row.name,
      active: row.active,
      roleIds: ids === null ? { ok: false, reason: 'read-failed' } : { ok: true, value: ids },
    });
  }
  return { records, skipped };
}

/** The readable rows of a list, plus the rows that were skipped (R-14: the site banner names them). */
export type ParsedList<T> = { items: readonly T[]; unreadable: readonly UnreadableRow[] };

/** Id and name as far as they can be read; `''` when they cannot. */
function skippedRow(raw: unknown, type: 11 | 18): UnreadableRow {
  const fields = isObject(raw) ? raw : {};
  const { powerpagecomponentid: id, name } = fields;
  return { type, id: typeof id === 'string' ? id : '', name: typeof name === 'string' ? name : '' };
}

function parseRole(raw: unknown): WebRoleFact | null {
  const row = parseComponentRow(raw);
  const content = row?.content ?? null;
  if (row === null || content === null) return null;
  const anonymous = optionalBoolean(content, 'anonymoususersrole');
  const authenticated = optionalBoolean(content, 'authenticatedusersrole');
  if (anonymous === null || authenticated === null) return null;
  return { id: row.id, name: row.name, anonymous, authenticated };
}

export function parseRoles(rows: readonly unknown[]): ParsedList<WebRoleFact> {
  const items: WebRoleFact[] = [];
  const unreadable: UnreadableRow[] = [];
  for (const raw of rows) {
    const role = parseRole(raw);
    if (role === null) unreadable.push(skippedRow(raw, 11));
    else items.push(role);
  }
  return { items, unreadable };
}

const SCOPES = new Map<number, AccessType>([
  [756150000, 'Global'],
  [756150001, 'Contact'],
  [756150002, 'Account'],
  [756150003, 'Parent'],
  [756150004, 'Self'],
]);

const PRIVILEGE_KEYS = [
  ['read', 'Read'],
  ['write', 'Write'],
  ['create', 'Create'],
  ['delete', 'Delete'],
  ['append', 'Append'],
  ['appendto', 'AppendTo'],
] as const satisfies readonly (readonly [string, Privilege])[];

function parsePermission(raw: unknown): TablePermissionFact | null {
  const row = parseComponentRow(raw);
  const content = row?.content ?? null;
  if (row === null || content === null) return null;
  const roleIds = optionalIds(content, 'adx_entitypermission_webrole');
  const parent = content.parententitypermission;
  const table = content.entitylogicalname;
  const scope = content.scope;
  const privileges: Privilege[] = [];
  for (const [key, privilege] of PRIVILEGE_KEYS) {
    const granted = optionalBoolean(content, key);
    if (granted === null) return null;
    if (granted) privileges.push(privilege);
  }
  if (roleIds === null || typeof table !== 'string' || table === '') return null;
  if (parent !== undefined && parent !== null && typeof parent !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    table,
    scope: typeof scope === 'number' ? (SCOPES.get(scope) ?? null) : null,
    privileges,
    roleIds,
    active: row.active,
    parentId: typeof parent === 'string' ? parent : null,
  };
}

export function parsePermissions(rows: readonly unknown[]): ParsedList<TablePermissionFact> {
  const items: TablePermissionFact[] = [];
  const unreadable: UnreadableRow[] = [];
  for (const raw of rows) {
    const permission = parsePermission(raw);
    if (permission === null) unreadable.push(skippedRow(raw, 18));
    else items.push(permission);
  }
  return { items, unreadable };
}

/** What a matched, active `ServerLogic/*` row says, before any environment variable is read. */
export type SettingBinding =
  | { kind: 'absent' }
  | { kind: 'duplicate' }
  | { kind: 'value'; raw: string }
  | { kind: 'envvar'; schema: string };

export type ParsedSettings = {
  bindings: Readonly<Record<SettingName, SettingBinding>>;
  inactive: readonly SettingName[];
};

function bindingFromContent(content: JsonObject | null): SettingBinding {
  if (content === null) return { kind: 'value', raw: '' };
  const schema = content.envvar_schema;
  if (content.source === 1 && typeof schema === 'string' && schema.trim() !== '') {
    return { kind: 'envvar', schema: schema.trim() };
  }
  return { kind: 'value', raw: typeof content.value === 'string' ? content.value : '' };
}

function bindingOf(rows: readonly ComponentRow[]): SettingBinding {
  const [first, second] = rows.filter((row) => row.active);
  if (first === undefined) return { kind: 'absent' };
  return second === undefined ? bindingFromContent(first.content) : { kind: 'duplicate' };
}

/**
 * Matches every type-9 row by trimmed, case-insensitive name. Rows with other names are ignored whatever
 * else they hold, and a matched row whose own content is unreadable only degrades that one setting.
 * Null means a matched row had no readable id or state, so the duplicate count cannot be trusted.
 */
export function parseSettings(rows: readonly unknown[]): ParsedSettings | null {
  const matches = new Map<SettingName, ComponentRow[]>();
  for (const raw of rows) {
    const name = isObject(raw) ? raw.name : undefined;
    const setting = typeof name === 'string' ? normalizeSettingName(name) : null;
    if (setting === null) continue;
    const row = parseComponentRow(raw);
    if (row === null) return null;
    matches.set(setting, [...(matches.get(setting) ?? []), row]);
  }
  const rowsOf = (name: SettingName): readonly ComponentRow[] => matches.get(name) ?? [];
  return {
    bindings: {
      'ServerLogic/Enabled': bindingOf(rowsOf('ServerLogic/Enabled')),
      'ServerLogic/AllowedDomains': bindingOf(rowsOf('ServerLogic/AllowedDomains')),
      'ServerLogic/AllowNetworkingToAllDomains': bindingOf(
        rowsOf('ServerLogic/AllowNetworkingToAllDomains'),
      ),
      'ServerLogic/TimeoutInSeconds': bindingOf(rowsOf('ServerLogic/TimeoutInSeconds')),
    },
    inactive: SETTING_NAMES.filter((name) => rowsOf(name).some((row) => !row.active)),
  };
}

export type EnvVarDefinition = { id: string; secret: boolean; defaultValue: string | null };

/** Exactly one definition row is expected; zero, several or an unreadable row is null. */
export function parseDefinition(rows: readonly unknown[]): EnvVarDefinition | null {
  const [only, extra] = rows;
  if (!isObject(only) || extra !== undefined) return null;
  const { environmentvariabledefinitionid: id, type, defaultvalue } = only;
  if (typeof id !== 'string' || !GUID.test(id) || typeof type !== 'number') return null;
  if (defaultvalue !== undefined && defaultvalue !== null && typeof defaultvalue !== 'string') {
    return null;
  }
  return { id, secret: type === SECRET_ENVVAR_TYPE, defaultValue: defaultvalue ?? null };
}

/** The first value row's string, else the definition's default, else null (nothing to read). */
export function pickEnvVarValue(
  rows: readonly unknown[],
  definition: EnvVarDefinition,
): string | null {
  const [first] = rows;
  if (isObject(first) && typeof first.value === 'string') return first.value;
  return definition.defaultValue;
}
