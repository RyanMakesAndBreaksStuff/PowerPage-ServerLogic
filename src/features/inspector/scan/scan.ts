import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, ODataQuery, PptbHost } from '@/services/pptb/host.types';
import { throwIfAborted } from '@/services/pptb/hostErrors';
import type {
  EnvVarCause,
  Readable,
  ScanProgress,
  ServerLogicFileFacts,
  SettingName,
  SettingValue,
  SiteFacts,
  SiteRef,
  UnreadableRow,
} from '@/types/inspector';
import { createLimiter } from './limiter';
import {
  parseDefinition,
  parsePermissions,
  parseRoles,
  parseServerLogic,
  parseSettings,
  parseSites,
  pickEnvVarValue,
} from './parseRecords';
import type { ParsedList, SettingBinding } from './parseRecords';
import { COMPONENT_TYPE, componentQuery, definitionQuery, SITES_QUERY, valueQuery } from './queries';

/** FR-7: at most four reads in flight. Every `queryAll` and `downloadFileColumn` call passes one limiter. */
export const SCAN_CONCURRENCY = 4;

export type ScanOptions = { signal?: AbortSignal; now?: () => Date };

/** The active connection changed (or none is active) while the scan ran; its facts must not be shown. */
export class ScanAbandonedError extends Error {
  constructor(message = 'The active connection changed while the scan was running.') {
    super(message);
    this.name = 'ScanAbandonedError';
  }
}

type Outcome<T> =
  | { kind: 'ok'; value: T }
  /** This one read failed (403, 404, exhausted 429/5xx, protocol); the scan goes on. */
  | { kind: 'failed'; error: HostReadError }
  /** Connection lost (this read or an earlier one): nothing further is requested. */
  | { kind: 'unread'; error: HostReadError | null };

type Reader = {
  query(q: ODataQuery): Promise<Outcome<readonly unknown[]>>;
  download(recordId: string): Promise<Outcome<string>>;
  lost(): boolean;
  close(): void;
};

/**
 * The only place that talks to the host during a scan. One limiter gates every call, so at most
 * SCAN_CONCURRENCY requests are in flight (each adapter call keeps its own pages and blocks sequential).
 * A transport failure or 401 is connection loss (AC-7.10): it aborts the internal signal so no further
 * request starts. A caller cancellation always rejects with the adapter's AbortError and is never stored.
 */
function createReader(host: PptbHost, external: AbortSignal | undefined): Reader {
  const limiter = createLimiter(SCAN_CONCURRENCY);
  const run = new AbortController();
  const cancel = (): void => {
    run.abort();
  };
  external?.addEventListener('abort', cancel, { once: true });
  let lost = false;
  const isLost = (): boolean => lost;

  function guarded<T>(task: () => Promise<T>): Promise<Outcome<T>> {
    return limiter.run(async (): Promise<Outcome<T>> => {
      if (isLost()) return { kind: 'unread', error: null };
      throwIfAborted(external);
      try {
        return { kind: 'ok', value: await task() };
      } catch (error) {
        throwIfAborted(external);
        if (error instanceof HostReadError) {
          if (!error.transport && error.status !== 401) {
            console.error('A Dataverse read failed; the scan goes on without it.');
            return { kind: 'failed', error };
          }
          lost = true;
          run.abort();
          return { kind: 'unread', error };
        }
        // Siblings in flight when the connection was lost are aborted by our own signal.
        if (isLost() && error instanceof DOMException && error.name === 'AbortError') {
          return { kind: 'unread', error: null };
        }
        throw error;
      }
    });
  }

  return {
    query: (q) => guarded(() => host.queryAll(q, run.signal)),
    download: (recordId) =>
      guarded(() =>
        host.downloadFileColumn(
          {
            entityLogicalName: 'powerpagecomponent',
            primaryIdAttribute: 'powerpagecomponentid',
            recordId,
            fileAttributeName: 'filecontent',
          },
          run.signal,
        ),
      ),
    lost: isLost,
    close: () => {
      external?.removeEventListener('abort', cancel);
      run.abort();
    },
  };
}

function failureOf(outcome: Exclude<Outcome<unknown>, { kind: 'ok' }>): {
  ok: false;
  reason: 'read-failed' | 'not-scanned';
} {
  return { ok: false, reason: outcome.kind === 'failed' ? 'read-failed' : 'not-scanned' };
}

/** A role or permission list: unreadable rows are skipped and reported, a failed read is the whole list. */
async function readList<T>(
  read: Promise<Outcome<readonly unknown[]>>,
  parse: (rows: readonly unknown[]) => ParsedList<T>,
): Promise<{ list: Readable<readonly T[]>; unreadable: readonly UnreadableRow[] }> {
  const outcome = await read;
  if (outcome.kind !== 'ok') return { list: failureOf(outcome), unreadable: [] };
  const { items, unreadable } = parse(outcome.value);
  return { list: { ok: true, value: items }, unreadable };
}

/**
 * The value of a settled read, or its rejection rethrown. Callers wait with `Promise.allSettled` first, so a
 * scan never settles while one of its reads is still in flight: the adapter cannot interrupt a `queryData`
 * call in progress, and the session starts the next scan's reads as soon as this one settles (S-02).
 */
function fulfilledValue<T>(result: PromiseSettledResult<T>): T {
  if (result.status === 'rejected') {
    const reason: unknown = result.reason;
    throw reason;
  }
  return result.value;
}

async function readFiles(
  reader: Reader,
  inventory: Promise<Outcome<readonly unknown[]>>,
  onProgress: (progress: ScanProgress) => void,
): Promise<{ files: readonly ServerLogicFileFacts[]; inventoryComplete: boolean }> {
  const outcome = await inventory;
  // Only the inventory keeps the rows a failed later page already delivered (WR-003).
  const rows = outcome.kind === 'ok' ? outcome.value : (outcome.error?.partialRows ?? []);
  const { records, skipped } = parseServerLogic(rows);
  const inventoryComplete = outcome.kind === 'ok' && skipped === 0;
  const total = records.length;
  onProgress({ scanned: 0, total, inventoryComplete });
  let scanned = 0;
  const settled = await Promise.allSettled(
    records.map(async (record): Promise<ServerLogicFileFacts> => {
      const result = await reader.download(record.id);
      if (result.kind !== 'unread') {
        scanned += 1;
        onProgress({ scanned, total, inventoryComplete });
      }
      return { ...record, code: result.kind === 'ok' ? { ok: true, value: result.value } : failureOf(result) };
    }),
  );
  const files = settled.map(fulfilledValue);
  return { files, inventoryComplete };
}

function unreadableVariable(cause: EnvVarCause): SettingValue {
  return { kind: 'envvar-unreadable', cause };
}

/** 403 is `denied`; any other failed read is `failed`. */
function readCause(error: HostReadError): EnvVarCause {
  return error.status === 403 ? 'denied' : 'failed';
}

function safely(build: () => ODataQuery): ODataQuery | null {
  try {
    return build();
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/** Definition first (type and default), then the value only for a non-secret definition. */
async function readEnvVar(reader: Reader, schema: string): Promise<SettingValue> {
  const definitionQ = safely(() => definitionQuery(schema));
  if (definitionQ === null) return unreadableVariable('failed');
  const definitionRead = await reader.query(definitionQ);
  if (definitionRead.kind === 'unread') return { kind: 'not-scanned' };
  if (definitionRead.kind === 'failed') return unreadableVariable(readCause(definitionRead.error));
  if (definitionRead.value.length === 0) return unreadableVariable('missing');
  const definition = parseDefinition(definitionRead.value);
  if (definition === null) return unreadableVariable('failed');
  if (definition.secret) return unreadableVariable('secret');
  const valueRead = await reader.query(valueQuery(definition.id));
  if (valueRead.kind === 'unread') return { kind: 'not-scanned' };
  if (valueRead.kind === 'failed') return unreadableVariable(readCause(valueRead.error));
  const raw = pickEnvVarValue(valueRead.value, definition);
  return raw === null ? unreadableVariable('missing') : { kind: 'value', raw, fromEnvVar: true };
}

function resolveBinding(reader: Reader, binding: SettingBinding): Promise<SettingValue> {
  switch (binding.kind) {
    case 'absent':
      return Promise.resolve({ kind: 'absent' });
    case 'duplicate':
      return Promise.resolve({ kind: 'duplicate' });
    case 'value':
      return Promise.resolve({ kind: 'value', raw: binding.raw, fromEnvVar: false });
    case 'unparseable':
      return Promise.resolve({ kind: 'unparseable' });
    case 'envvar':
      return readEnvVar(reader, binding.schema);
  }
}

async function readSettings(
  reader: Reader,
  read: Promise<Outcome<readonly unknown[]>>,
): Promise<{
  settings: Readable<Readonly<Record<SettingName, SettingValue>>>;
  inactive: readonly SettingName[];
}> {
  const outcome = await read;
  if (outcome.kind !== 'ok') return { settings: failureOf(outcome), inactive: [] };
  const parsed = parseSettings(outcome.value);
  if (parsed === null) return { settings: { ok: false, reason: 'read-failed' }, inactive: [] };
  const { bindings } = parsed;
  const [enabledRead, domainsRead, allowAllRead, timeoutRead] = await Promise.allSettled([
    resolveBinding(reader, bindings['ServerLogic/Enabled']),
    resolveBinding(reader, bindings['ServerLogic/AllowedDomains']),
    resolveBinding(reader, bindings['ServerLogic/AllowNetworkingToAllDomains']),
    resolveBinding(reader, bindings['ServerLogic/TimeoutInSeconds']),
  ]);
  const enabled = fulfilledValue(enabledRead);
  const allowedDomains = fulfilledValue(domainsRead);
  const allowAll = fulfilledValue(allowAllRead);
  const timeout = fulfilledValue(timeoutRead);
  return {
    settings: {
      ok: true,
      value: {
        'ServerLogic/Enabled': enabled,
        'ServerLogic/AllowedDomains': allowedDomains,
        'ServerLogic/AllowNetworkingToAllDomains': allowAll,
        'ServerLogic/TimeoutInSeconds': timeout,
      },
    },
    inactive: parsed.inactive,
  };
}

/**
 * Reads the active connection again once every read has settled (AC-7.6). A different identity, or none,
 * abandons the scan. A refresh that rejects is transient: P5.5 keeps the last confirmed identity, so the
 * finished scan is accepted.
 */
async function confirmIdentity(host: PptbHost, connection: Connection): Promise<void> {
  let active: Connection | null;
  try {
    active = await host.getActiveConnection();
  } catch {
    console.error('The active connection could not be re-read after the scan; accepting the result.');
    return;
  }
  if (active?.id !== connection.id || active.url !== connection.url) {
    throw new ScanAbandonedError();
  }
}

/**
 * Reads one site's Server Logic facts. The reads are separate requests, not an atomic snapshot.
 * Rejects with the adapter's AbortError when `options.signal` aborts, and with ScanAbandonedError when the
 * active connection changed. Connection loss resolves with `stopped: 'connection-lost'` instead.
 * It settles only after every read it started has settled, so a caller that starts the next scan after this
 * one never runs more than four reads at once (FR-7, S-02).
 */
export async function runScan(
  host: PptbHost,
  connection: Connection,
  site: SiteRef,
  scanId: string,
  onProgress: (progress: ScanProgress) => void,
  options: ScanOptions = {},
): Promise<SiteFacts> {
  const { signal } = options;
  const now = options.now ?? (() => new Date());
  throwIfAborted(signal);
  const startedAt = now().toISOString();
  // Any connection change during the scan abandons it, even one that switches back (N3).
  const connectionEvents = { changed: false };
  const unsubscribe = host.onEvent((event) => {
    if (event.kind === 'connection-changed') connectionEvents.changed = true;
  });
  const reader = createReader(host, signal);
  try {
    const inventory = reader.query(componentQuery(site.id, COMPONENT_TYPE.serverLogic));
    const roles = reader.query(componentQuery(site.id, COMPONENT_TYPE.webRole));
    const permissions = reader.query(componentQuery(site.id, COMPONENT_TYPE.tablePermission));
    const settings = reader.query(componentQuery(site.id, COMPONENT_TYPE.siteSetting));
    const [inventoryRead, rolesRead, permissionsRead, settingsRead] = await Promise.allSettled([
      readFiles(reader, inventory, onProgress),
      readList(roles, parseRoles),
      readList(permissions, parsePermissions),
      readSettings(reader, settings),
    ]);
    const inventoryResult = fulfilledValue(inventoryRead);
    const rolesResult = fulfilledValue(rolesRead);
    const permissionsResult = fulfilledValue(permissionsRead);
    const settingsResult = fulfilledValue(settingsRead);
    throwIfAborted(signal);
    await confirmIdentity(host, connection);
    throwIfAborted(signal);
    if (connectionEvents.changed) throw new ScanAbandonedError();
    return {
      scanId,
      site,
      connection,
      startedAt,
      finishedAt: now().toISOString(),
      roles: rolesResult.list,
      permissions: permissionsResult.list,
      settings: settingsResult.settings,
      inactiveSettings: settingsResult.inactive,
      files: inventoryResult.files,
      inventoryComplete: inventoryResult.inventoryComplete,
      unreadableRows: [...rolesResult.unreadable, ...permissionsResult.unreadable],
      stopped: reader.lost() ? 'connection-lost' : null,
    };
  } finally {
    try {
      unsubscribe();
    } finally {
      reader.close();
    }
  }
}

/** Every Power Pages site in the environment, in server order. A failed read rejects; it is never an empty list. */
export async function listSites(host: PptbHost): Promise<readonly SiteRef[]> {
  return parseSites(await host.queryAll(SITES_QUERY));
}
