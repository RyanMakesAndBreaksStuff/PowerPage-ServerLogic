import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canReviewFinding, evaluateSite } from '@/features/inspector/model/rules';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeFailure, FakeResponder } from '@/services/pptb/fakeHost';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import type { ReviewKey, ScanProgress, SiteFacts, SiteRef } from '@/types/inspector';
import { listSites, runScan, ScanAbandonedError } from './scan';
import type { ScanOptions } from './scan';

const guid = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const fileId = (n: number): string => guid(0x1000 + n);
const R_STAFF = guid(0x11);
const R_ANON = guid(0x12);
const R_AUTH = guid(0x13);
const DEFINITION_ID = guid(0x31);
const SCAN_ID = 'connection-1:site-1:1';
const CONNECTION: Connection = {
  id: 'connection-1',
  name: 'Development',
  url: 'https://example.crm.dynamics.com',
  environment: 'Dev',
};
const SITE: SiteRef = { id: guid(1), name: 'Development site', domain: 'dev.example.com', active: true };
const PLAIN_CODE = 'function get() { return "{}"; }';
const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';

type Row = Record<string, unknown>;
type Fake = ReturnType<typeof createFakeHost>;
type LogicSpec = {
  n: number;
  roleIds?: readonly string[];
  statecode?: number;
  /** Text of the file column; `null` means the host has no such file (404). */
  code?: string | null;
};
type World = {
  logic?: readonly LogicSpec[];
  extraLogicRows?: readonly unknown[];
  roles?: readonly Row[];
  permissions?: readonly Row[];
  settings?: readonly Row[];
  /** Definition rows by schema name, and value rows by definition id. */
  definitions?: Readonly<Record<string, readonly Row[]>>;
  values?: Readonly<Record<string, readonly Row[]>>;
  failures?: readonly FakeFailure[];
};

function component(type: number, id: string, name: string, content: unknown, statecode = 0): Row {
  return {
    powerpagecomponentid: id,
    name,
    content: JSON.stringify(content),
    statecode,
    powerpagecomponenttype: type,
  };
}

function logicRow(spec: LogicSpec): Row {
  return component(
    35,
    fileId(spec.n),
    `handler-${String(spec.n).padStart(2, '0')}`,
    { adx_serverlogic_adx_webrole: spec.roleIds ?? [R_STAFF] },
    spec.statecode ?? 0,
  );
}

const role = (id: string, name: string, flags: Row): Row => component(11, id, name, flags);
const permission = (n: number, name: string, content: Row, statecode = 0): Row =>
  component(18, guid(0x20 + n), name, content, statecode);
const setting = (n: number, name: string, content: Row, statecode = 0): Row =>
  component(9, guid(0x2000 + n), name, content, statecode);
const specs = (count: number): readonly LogicSpec[] =>
  Array.from({ length: count }, (_, index) => ({ n: index + 1 }));

const HAPPY: World = {
  logic: [
    { n: 1, roleIds: [R_STAFF], code: PLAIN_CODE },
    { n: 2, roleIds: [R_ANON], code: HTTP_CODE },
  ],
  roles: [
    role(R_STAFF, 'staff', {}),
    role(R_ANON, 'anonymous', { anonymoususersrole: true, authenticatedusersrole: false }),
    role(R_AUTH, 'authenticated', { anonymoususersrole: false, authenticatedusersrole: true }),
  ],
  permissions: [
    permission(1, 'contact-read', {
      scope: 756150001,
      entitylogicalname: 'contact',
      read: true,
      adx_entitypermission_webrole: [R_STAFF],
    }),
  ],
  settings: [
    setting(1, 'ServerLogic/AllowedDomains', { value: 'api.example.com', source: 0 }),
    setting(2, 'ServerLogic/AllowNetworkingToAllDomains', { value: 'false', source: 0 }),
  ],
};

const COMPONENT_TYPE_FILTER = /powerpagecomponenttype eq (\d+)/;
const DEFINITION_FILTER = /^schemaname eq '(.*)'$/;
const VALUE_FILTER = /^_environmentvariabledefinitionid_value eq (\S+) and statecode eq 0$/;

/** The fake ignores `$select` and `$filter`, so this responder applies the filters the reader writes. */
function createWorld(world: World = {}): Fake {
  const logic = world.logic ?? [];
  const byType: Readonly<Record<number, readonly unknown[]>> = {
    35: [...logic.map(logicRow), ...(world.extraLogicRows ?? [])],
    11: world.roles ?? [],
    18: world.permissions ?? [],
    9: world.settings ?? [],
  };
  const responder: FakeResponder = (q) => {
    const filter = q.filter ?? '';
    if (q.entitySet === 'powerpagecomponents') {
      return byType[Number(COMPONENT_TYPE_FILTER.exec(filter)?.[1])] ?? [];
    }
    if (q.entitySet === 'environmentvariabledefinitions') {
      const literal = DEFINITION_FILTER.exec(filter)?.[1];
      const schema = literal === undefined ? undefined : decodeURIComponent(literal).replaceAll("''", "'");
      return schema === undefined ? [] : (world.definitions?.[schema] ?? []);
    }
    if (q.entitySet === 'environmentvariablevalues') {
      const id = VALUE_FILTER.exec(filter)?.[1];
      return id === undefined ? [] : (world.values?.[id] ?? []);
    }
    return undefined;
  };
  const fileColumns = Object.fromEntries(
    logic
      .filter((spec) => spec.code !== null)
      .map((spec): [string, string] => [
        `powerpagecomponent/${fileId(spec.n)}/filecontent`,
        spec.code ?? PLAIN_CODE,
      ]),
  );
  return createFakeHost({
    connection: CONNECTION,
    responders: [responder],
    failures: world.failures ?? [],
    fileColumns,
  });
}

function scan(
  host: PptbHost,
  options: ScanOptions = {},
  onProgress: (progress: ScanProgress) => void = () => undefined,
): Promise<SiteFacts> {
  return runScan(host, CONNECTION, SITE, SCAN_ID, onProgress, options);
}

function settingsOf(facts: SiteFacts): Readonly<Record<string, unknown>> {
  if (!facts.settings.ok) throw new Error('Settings were not read.');
  return facts.settings.value;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const definitionRow = (patch: Row = {}): Row => ({
  environmentvariabledefinitionid: DEFINITION_ID,
  schemaname: 'cfg_Domains',
  type: 100000000,
  defaultvalue: 'default.example.com',
  ...patch,
});
const ENVVAR_SETTING = setting(1, 'ServerLogic/AllowedDomains', {
  source: 1,
  envvar_schema: 'cfg_Domains',
});

describe('listSites', () => {
  it('lists active and inactive sites in server order', async () => {
    const fake = createFakeHost({
      tables: {
        powerpagesites: [
          { powerpagesiteid: guid(1), name: 'Zulu', primarydomainname: 'zulu.example.com', statecode: 0 },
          { powerpagesiteid: guid(2), name: 'Alpha', primarydomainname: null, statecode: 1 },
        ],
      },
    });
    await expect(listSites(fake)).resolves.toEqual([
      { id: guid(1), name: 'Zulu', domain: 'zulu.example.com', active: true },
      { id: guid(2), name: 'Alpha', domain: '', active: false },
    ]);
    expect(fake.callsOf('queryAll').map((call) => call.query)).toEqual([
      {
        entitySet: 'powerpagesites',
        select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
        filter: null,
        orderBy: 'name,powerpagesiteid',
        pageSize: 5000,
      },
    ]);
  });

  it('returns an empty list, not an error, for an environment with no sites', async () => {
    await expect(listSites(createFakeHost({ tables: { powerpagesites: [] } }))).resolves.toEqual([]);
  });

  it('rethrows a failed read instead of returning an empty list', async () => {
    const fake = createFakeHost({
      tables: { powerpagesites: [] },
      failures: [
        {
          operation: 'query',
          entitySet: 'powerpagesites',
          status: 503,
          partialRows: [{ powerpagesiteid: guid(1), name: 'Zulu', statecode: 0 }],
        },
      ],
    });
    const failure = await listSites(fake).then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(HostReadError);
    expect(failure).toMatchObject({ status: 503 });
  });
});

describe('runScan facts', () => {
  it('reads a site and lets the model grade a configured file and an anonymous file', async () => {
    const fake = createWorld(HAPPY);
    const facts = await scan(fake);
    expect(facts).toMatchObject({
      scanId: SCAN_ID,
      site: SITE,
      connection: CONNECTION,
      inactiveSettings: [],
      inventoryComplete: true,
      stopped: null,
    });
    expect(facts.finishedAt).not.toBeNull();
    const result = evaluateSite(facts, new Set<ReviewKey>());
    expect(result.files.map((file) => file.name)).toEqual(['handler-01', 'handler-02']);
    expect(result.files.map((file) => file.findings.map((finding) => finding.status))).toEqual([
      ['configured', 'configured', 'configured'],
      ['needs-review', 'configured', 'configured'],
    ]);
    expect(result.files[1]?.findings[0].summary).toBe('Callable by unauthenticated visitors.');
    expect(result.banners).toEqual([]);
    expect(new Set(fake.calls.map((call) => call.method))).toEqual(
      new Set(['queryAll', 'downloadFileColumn', 'getActiveConnection']),
    );
  });

  it('reads both default-role flags and treats an absent flag as false', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        roles: [
          role(R_STAFF, 'both', { anonymoususersrole: true, authenticatedusersrole: true }),
          role(R_AUTH, 'neither', {}),
        ],
      }),
    );
    expect(facts.roles).toEqual({
      ok: true,
      value: [
        { id: R_STAFF, name: 'both', anonymous: true, authenticated: true },
        { id: R_AUTH, name: 'neither', anonymous: false, authenticated: false },
      ],
    });
  });

  it('parses a Parent permission chain from the parent link, with no roles of its own', async () => {
    const top = permission(1, 'top', {
      scope: 756150000,
      entitylogicalname: 'contact',
      read: true,
      adx_entitypermission_webrole: [R_STAFF],
    });
    const child = permission(2, 'child', {
      scope: 756150003,
      entitylogicalname: 'account',
      read: true,
      write: true,
      parententitypermission: guid(0x21),
    });
    const facts = await scan(createWorld({ ...HAPPY, permissions: [top, child] }));
    expect(facts.permissions).toMatchObject({
      ok: true,
      value: [
        { id: guid(0x21), scope: 'Global', roleIds: [R_STAFF], parentId: null },
        { id: guid(0x22), scope: 'Parent', roleIds: [], parentId: guid(0x21), privileges: ['Read', 'Write'] },
      ],
    });
    const tables = evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings[1];
    expect(tables?.status).toBe('needs-review');
    expect(tables?.summary).toContain('Global access to `contact`');
  });

  it.each(['{not json', ''])(
    'skips a role or permission row with unreadable content %j, keeps the rest and reports it',
    async (content) => {
      const facts = await scan(
        createWorld({
          ...HAPPY,
          roles: [...(HAPPY.roles ?? []), { ...role(guid(0x14), 'broken-role', {}), content }],
          permissions: [...(HAPPY.permissions ?? []), { ...permission(9, 'broken-perm', {}), content }],
        }),
      );
      expect(facts.roles).toMatchObject({ ok: true, value: [{ id: R_STAFF }, { id: R_ANON }, { id: R_AUTH }] });
      expect(facts.permissions).toMatchObject({ ok: true, value: [{ id: guid(0x21) }] });
      expect(facts.unreadableRows).toEqual([
        { type: 11, id: guid(0x14), name: 'broken-role' },
        { type: 18, id: guid(0x29), name: 'broken-perm' },
      ]);
      const result = evaluateSite(facts, new Set<ReviewKey>());
      const clean = evaluateSite(await scan(createWorld(HAPPY)), new Set<ReviewKey>());
      expect(result.files).toEqual(clean.files);
      expect(result.files[0]?.findings.map((item) => item.hasUnscannedEvidence)).toEqual([false, false, false]);
      expect(result.banners).toEqual([
        "2 web role or table permission rows couldn't be read and were skipped: `broken-role`, `broken-perm`. Findings were graded without them; fix the rows and rescan.",
      ]);
    },
  );

  it('reports no unreadable rows for a clean site', async () => {
    const facts = await scan(createWorld(HAPPY));
    expect(facts.unreadableRows).toEqual([]);
  });

  it('reads an unknown or missing scope as null and lets the model flag it', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        permissions: [
          permission(1, 'odd', {
            scope: 42,
            entitylogicalname: 'contact',
            read: true,
            adx_entitypermission_webrole: [R_STAFF],
          }),
          permission(2, 'bare', { entitylogicalname: 'contact', read: true }),
        ],
      }),
    );
    expect(facts.permissions).toMatchObject({ ok: true, value: [{ scope: null }, { scope: null }] });
    const tables = evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings[1];
    expect(tables?.summary).toBe("Couldn't interpret the scope of `odd`");
  });
});

describe('runScan settings', () => {
  it('reads the current value of an environment variable', async () => {
    const fake = createWorld({
      ...HAPPY,
      settings: [ENVVAR_SETTING],
      definitions: { cfg_Domains: [definitionRow()] },
      values: { [DEFINITION_ID]: [{ environmentvariablevalueid: guid(0x41), value: 'api.example.com' }] },
    });
    const facts = await scan(fake);
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'value',
      raw: 'api.example.com',
      fromEnvVar: true,
    });
    const filters = fake.callsOf('queryAll').map((call) => call.query.filter);
    expect(filters).toContain("schemaname eq 'cfg_Domains'");
    expect(filters).toContain(`_environmentvariabledefinitionid_value eq ${DEFINITION_ID} and statecode eq 0`);
  });

  it('falls back to the definition default when there is no value row', async () => {
    const facts = await scan(
      createWorld({ ...HAPPY, settings: [ENVVAR_SETTING], definitions: { cfg_Domains: [definitionRow()] } }),
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'value',
      raw: 'default.example.com',
      fromEnvVar: true,
    });
  });

  it('reads a missing definition, and a value with no default, as unreadable: missing', async () => {
    for (const world of [
      { definitions: {} },
      { definitions: { cfg_Domains: [definitionRow({ defaultvalue: null })] } },
    ]) {
      const facts = await scan(createWorld({ ...HAPPY, settings: [ENVVAR_SETTING], ...world }));
      expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
        kind: 'envvar-unreadable',
        cause: 'missing',
      });
    }
  });

  it('reads an ambiguous definition as unreadable: failed', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [ENVVAR_SETTING],
        definitions: { cfg_Domains: [definitionRow(), definitionRow()] },
      }),
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'envvar-unreadable',
      cause: 'failed',
    });
  });

  it.each([
    [403, 'denied'],
    [500, 'failed'],
  ] as const)('reads a %i on the definition as unreadable: %s', async (status, cause) => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [ENVVAR_SETTING],
        failures: [{ operation: 'query', entitySet: 'environmentvariabledefinitions', status }],
      }),
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({ kind: 'envvar-unreadable', cause });
  });

  it('never requests the value of a Secret definition', async () => {
    const fake = createWorld({
      ...HAPPY,
      settings: [ENVVAR_SETTING],
      definitions: { cfg_Domains: [definitionRow({ type: 100000005 })] },
      values: { [DEFINITION_ID]: [{ environmentvariablevalueid: guid(0x41), value: 'secret' }] },
    });
    const facts = await scan(fake);
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'envvar-unreadable',
      cause: 'secret',
    });
    const sets = fake.callsOf('queryAll').map((call) => call.query.entitySet);
    expect(sets).toContain('environmentvariabledefinitions');
    expect(sets).not.toContain('environmentvariablevalues');
  });

  it('reads a denied value as unreadable: denied, and keeps the scan going', async () => {
    const fake = createWorld({
      ...HAPPY,
      settings: [ENVVAR_SETTING],
      definitions: { cfg_Domains: [definitionRow()] },
      failures: [{ operation: 'query', entitySet: 'environmentvariablevalues', status: 403 }],
    });
    const facts = await scan(fake);
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'envvar-unreadable',
      cause: 'denied',
    });
    expect(facts.stopped).toBeNull();
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
  });

  it('escapes an apostrophe in the schema name', async () => {
    const fake = createWorld({
      ...HAPPY,
      settings: [setting(1, 'ServerLogic/AllowedDomains', { source: 1, envvar_schema: "cfg_O'Brien" })],
      definitions: { "cfg_O'Brien": [definitionRow()] },
    });
    const facts = await scan(fake);
    expect(fake.callsOf('queryAll').map((call) => call.query.filter)).toContain(
      "schemaname eq 'cfg_O''Brien'",
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toMatchObject({ kind: 'value' });
  });

  it('marks the variable Not scanned when its read hits a 401', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [ENVVAR_SETTING, setting(2, 'ServerLogic/Enabled', { value: 'true', source: 0 })],
        definitions: { cfg_Domains: [definitionRow()] },
        failures: [{ operation: 'query', entitySet: 'environmentvariabledefinitions', status: 401 }],
      }),
    );
    expect(facts.stopped).toBe('connection-lost');
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({ kind: 'not-scanned' });
    expect(settingsOf(facts)['ServerLogic/Enabled']).toEqual({
      kind: 'value',
      raw: 'true',
      fromEnvVar: false,
    });
  });

  it('reports two active settings with one name as a duplicate', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [
          setting(1, 'ServerLogic/Enabled', { value: 'true', source: 0 }),
          setting(2, 'serverlogic/ENABLED', { value: 'false', source: 0 }),
        ],
      }),
    );
    expect(settingsOf(facts)['ServerLogic/Enabled']).toEqual({ kind: 'duplicate' });
  });

  it('lists an inactive setting and reads it as absent', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [setting(1, 'ServerLogic/TimeoutInSeconds', { value: '30', source: 0 }, 1)],
      }),
    );
    expect(facts.inactiveSettings).toEqual(['ServerLogic/TimeoutInSeconds']);
    expect(settingsOf(facts)['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'absent' });
  });

  it('matches names ignoring case and surrounding whitespace, among unrelated settings', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [
          setting(1, 'Footer/OutputCache/Enabled', { value: 'True' }),
          setting(2, '  serverlogic/ALLOWEDDOMAINS ', { value: 'a.example.com', source: 0 }),
        ],
      }),
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({
      kind: 'value',
      raw: 'a.example.com',
      fromEnvVar: false,
    });
  });

  it('degrades one malformed setting to an unparseable value without failing the others', async () => {
    const broken = { ...setting(1, 'ServerLogic/TimeoutInSeconds', {}), content: '{not json' };
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [broken, setting(2, 'ServerLogic/Enabled', { value: 'false', source: 0 })],
      }),
    );
    expect(facts.settings.ok).toBe(true);
    expect(settingsOf(facts)['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'unparseable' });
    const banners = evaluateSite(facts, new Set<ReviewKey>()).banners;
    expect(banners).toContain("`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240");
    expect(banners).toContain('Server logic is disabled on this site (`ServerLogic/Enabled` = false)');
  });
});

describe('runScan unreadable allow list', () => {
  it('asks for review, not "outbound calls are blocked", when AllowedDomains content cannot be read', async () => {
    const broken = { ...setting(1, 'ServerLogic/AllowedDomains', {}), content: '{not json' };
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [
          broken,
          setting(2, 'ServerLogic/AllowNetworkingToAllDomains', { value: 'false', source: 0 }),
        ],
      }),
    );
    expect(settingsOf(facts)['ServerLogic/AllowedDomains']).toEqual({ kind: 'unparseable' });
    const outbound = evaluateSite(facts, new Set<ReviewKey>()).files[1]?.findings[2];
    expect(outbound?.status).toBe('needs-review');
    expect(outbound?.summary).toBe("Couldn't interpret `ServerLogic/AllowedDomains`");
    expect(outbound?.reasons).toEqual([
      { text: "Couldn't interpret `ServerLogic/AllowedDomains`", readFailure: false },
    ]);
    expect(outbound !== undefined && canReviewFinding(outbound)).toBe(true);
  });
});

describe('runScan files', () => {
  it('downloads every file with no cap', async () => {
    const fake = createWorld({ ...HAPPY, logic: specs(51) });
    const facts = await scan(fake);
    expect(facts.files).toHaveLength(51);
    expect(fake.callsOf('downloadFileColumn')).toHaveLength(51);
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
    expect(facts.inventoryComplete).toBe(true);
  });

  it('returns no files, complete, for a site without server logic', async () => {
    const progress: ScanProgress[] = [];
    const facts = await scan(createWorld({ ...HAPPY, logic: [] }), {}, (value) => {
      progress.push(value);
    });
    expect(facts.files).toEqual([]);
    expect(facts.inventoryComplete).toBe(true);
    expect(progress).toEqual([{ scanned: 0, total: 0, inventoryComplete: true }]);
  });

  it('includes and downloads an inactive record', async () => {
    const fake = createWorld({ ...HAPPY, logic: [{ n: 1, statecode: 1, code: PLAIN_CODE }] });
    const facts = await scan(fake);
    expect(facts.files).toMatchObject([{ id: fileId(1), active: false, code: { ok: true, value: PLAIN_CODE } }]);
  });

  it('reads an empty file as readable empty code', async () => {
    const facts = await scan(createWorld({ ...HAPPY, logic: [{ n: 1, code: '' }] }));
    expect(facts.files[0]?.code).toEqual({ ok: true, value: '' });
    const tables = evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings[1];
    expect(tables?.reasons).toContainEqual({ text: "Couldn't analyse handler code", readFailure: false });
  });

  it('keeps the role link when only the download fails', async () => {
    const facts = await scan(createWorld({ ...HAPPY, logic: [{ n: 1, code: null }] }));
    expect(facts.files[0]).toMatchObject({
      roleIds: { ok: true, value: [R_STAFF] },
      code: { ok: false, reason: 'read-failed' },
    });
    expect(facts.stopped).toBeNull();
    const [web, tables] = evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings ?? [];
    expect(web?.status).toBe('configured');
    expect(tables?.reasons.some((reason) => reason.readFailure)).toBe(true);
  });

  it('skips an unreadable inventory row and reports the inventory incomplete', async () => {
    const fake = createWorld({ ...HAPPY, extraLogicRows: [{ name: 'broken' }] });
    const facts = await scan(fake);
    expect(facts.files).toHaveLength(2);
    expect(facts.inventoryComplete).toBe(false);
    expect(fake.callsOf('downloadFileColumn')).toHaveLength(2);
  });
});

describe('runScan failures and connection loss', () => {
  it('reads a denied role list as a read failure and keeps scanning', async () => {
    const fake = createWorld({
      ...HAPPY,
      failures: [
        { operation: 'query', entitySet: 'powerpagecomponents', status: 403, contains: 'powerpagecomponenttype eq 11' },
      ],
    });
    const facts = await scan(fake);
    expect(facts.roles).toEqual({ ok: false, reason: 'read-failed' });
    expect(facts.permissions.ok).toBe(true);
    expect(facts.settings.ok).toBe(true);
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
    expect(facts.stopped).toBeNull();
  });

  it('treats a confirmed transport failure like a 401', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        failures: [
          {
            operation: 'query',
            entitySet: 'powerpagecomponents',
            status: null,
            transport: true,
            contains: 'powerpagecomponenttype eq 11',
          },
        ],
      }),
    );
    expect(facts.stopped).toBe('connection-lost');
    expect(facts.roles).toEqual({ ok: false, reason: 'not-scanned' });
  });

  it('keeps the rows received before a later inventory page failed and scans them', async () => {
    const fake = createWorld({
      ...HAPPY,
      logic: specs(3),
      failures: [
        {
          operation: 'query',
          entitySet: 'powerpagecomponents',
          status: 503,
          contains: 'powerpagecomponenttype eq 35',
          partialRows: [logicRow({ n: 1 }), logicRow({ n: 2 })],
        },
      ],
    });
    const facts = await scan(fake);
    expect(facts.inventoryComplete).toBe(false);
    expect(facts.files.map((file) => file.id)).toEqual([fileId(1), fileId(2)]);
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
    expect(facts.stopped).toBeNull();
    expect(evaluateSite(facts, new Set<ReviewKey>()).banners).toContain(
      'Inventory incomplete. Reconnect and rescan.',
    );
  });

  it('marks every unread file Not scanned when the inventory read loses the connection', async () => {
    const facts = await scan(
      createWorld({
        ...HAPPY,
        failures: [
          {
            operation: 'query',
            entitySet: 'powerpagecomponents',
            status: 401,
            contains: 'powerpagecomponenttype eq 35',
            partialRows: [logicRow({ n: 1 })],
          },
        ],
      }),
    );
    expect(facts.stopped).toBe('connection-lost');
    expect(facts.inventoryComplete).toBe(false);
    expect(facts.files).toMatchObject([{ id: fileId(1), code: { ok: false, reason: 'not-scanned' } }]);
  });

  it('keeps earlier codes, marks the failing and later files Not scanned, and stops requesting', async () => {
    const fake = createWorld({ ...HAPPY, logic: specs(8) });
    const gate = gated(fake, {
      holdFiles: true,
      failFiles: { [fileId(3)]: new HostReadError('Authentication failed.', 401) },
    });
    const progress: ScanProgress[] = [];
    const result = scan(gate.host, {}, (value) => {
      progress.push(value);
    });
    await gate.waitFor(fileId(4));
    gate.release(fileId(1));
    await gate.waitFor(fileId(5));
    gate.release(fileId(2));
    await gate.waitFor(fileId(6));
    gate.release(fileId(3));
    await flush();
    gate.releaseAll();
    const facts = await result;
    expect(facts.stopped).toBe('connection-lost');
    expect(facts.files.map((file) => file.code)).toEqual([
      { ok: true, value: PLAIN_CODE },
      { ok: true, value: PLAIN_CODE },
      ...Array.from({ length: 6 }, () => ({ ok: false, reason: 'not-scanned' })),
    ]);
    expect(facts.files.every((file) => file.roleIds.ok)).toBe(true);
    expect(gate.stats.fileStarts).toEqual([1, 2, 3, 4, 5, 6].map(fileId));
    expect(progress.at(-1)).toEqual({ scanned: 2, total: 8, inventoryComplete: true });
    expect(facts.roles.ok && facts.permissions.ok && facts.settings.ok).toBe(true);
  });
});

describe('runScan progress, time and identity', () => {
  it('reports Scanned X of N from zero to the total', async () => {
    const progress: ScanProgress[] = [];
    await scan(createWorld({ ...HAPPY, logic: specs(3) }), {}, (value) => {
      progress.push(value);
    });
    expect(progress).toEqual([0, 1, 2, 3].map((scanned) => ({ scanned, total: 3, inventoryComplete: true })));
  });

  it('flags a partial total in every progress report', async () => {
    const progress: ScanProgress[] = [];
    await scan(createWorld({ ...HAPPY, extraLogicRows: [{ name: 'broken' }] }), {}, (value) => {
      progress.push(value);
    });
    expect(progress.map((value) => value.inventoryComplete)).toEqual([false, false, false]);
  });

  it('stamps start and finish from the injected clock and stores the scan id as given', async () => {
    const start = new Date('2026-11-01T10:00:00.000Z');
    const finish = new Date('2026-11-01T10:00:07.500Z');
    const now = vi.fn<() => Date>().mockReturnValueOnce(start).mockReturnValueOnce(finish);
    const facts = await scan(createWorld(HAPPY), { now });
    expect(facts.startedAt).toBe('2026-11-01T10:00:00.000Z');
    expect(facts.finishedAt).toBe('2026-11-01T10:00:07.500Z');
    expect(facts.scanId).toBe(SCAN_ID);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a different id', { ...CONNECTION, id: 'connection-2' }],
    ['a different URL', { ...CONNECTION, url: 'https://other.crm.dynamics.com' }],
    ['no active connection', null],
  ] satisfies readonly (readonly [string, Connection | null])[])(
    'abandons the scan when the end-of-scan identity has %s',
    async (_label, active) => {
      const fake = createWorld(HAPPY);
      fake.setConnection(active);
      const failure = await scan(fake).then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(ScanAbandonedError);
      expect(failure).toMatchObject({ name: 'ScanAbandonedError' });
      expect(fake.calls.at(-1)?.method).toBe('getActiveConnection');
      expect(fake.callsOf('getActiveConnection')).toHaveLength(1);
    },
  );

  it('abandons the scan when the connection switches away and back while it runs', async () => {
    const fake = createWorld(HAPPY);
    const listenersBefore = fake.listenerCount();
    let switched = false;
    const host: PptbHost = {
      ...fake,
      queryAll: (q, signal) => {
        if (!switched) {
          switched = true;
          fake.setConnection({ ...CONNECTION, id: 'connection-2', url: 'https://other.crm.dynamics.com' });
          fake.emit({ kind: 'connection-changed' });
          fake.setConnection(CONNECTION);
          fake.emit({ kind: 'connection-changed' });
        }
        return fake.queryAll(q, signal);
      },
    };
    const failure = await scan(host).then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ScanAbandonedError);
    expect(fake.listenerCount()).toBe(listenersBefore);
  });

  it('accepts the finished scan when the identity refresh rejects', async () => {
    const fake = createWorld(HAPPY);
    const host: PptbHost = {
      ...fake,
      getActiveConnection: () => Promise.reject(new Error('transient')),
    };
    const facts = await scan(host);
    expect(facts.finishedAt).not.toBeNull();
    expect(facts.stopped).toBeNull();
  });
});

describe('runScan cancellation and concurrency', () => {
  it('rejects with AbortError and makes no call when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fake = createWorld(HAPPY);
    await expect(scan(fake, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.calls).toEqual([]);
  });

  it('still closes the reader when the event unsubscribe throws, and surfaces that error', async () => {
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, 'removeEventListener');
    const failure = new Error('unsubscribe failed');
    const host: PptbHost = {
      ...createWorld(HAPPY),
      onEvent: () => () => {
        throw failure;
      },
    };
    await expect(scan(host, { signal: controller.signal })).rejects.toBe(failure);
    expect(removed).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('rejects with AbortError during downloads and starts no further request', async () => {
    const controller = new AbortController();
    const fake = createWorld({ ...HAPPY, logic: specs(6) });
    const gate = gated(fake, { holdFiles: true });
    const result = scan(gate.host, { signal: controller.signal });
    const rejection = expect(result).rejects.toBeInstanceOf(DOMException);
    await gate.waitFor(fileId(4));
    controller.abort();
    gate.releaseAll();
    await rejection;
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(gate.stats.fileStarts).toHaveLength(4);
    expect(fake.callsOf('getActiveConnection')).toHaveLength(0);
  });

  it('never has more than four reads in flight', async () => {
    const fake = createWorld({ ...HAPPY, logic: specs(12) });
    const gate = gated(fake, { holdQueries: true, holdFiles: true });
    const state = { done: false };
    const result = scan(gate.host).finally(() => {
      state.done = true;
    });
    while (!state.done) {
      await vi.waitFor(
        () => {
          expect(state.done || gate.holds.length > 0).toBe(true);
        },
        { interval: 1 },
      );
      gate.releaseAll();
    }
    const facts = await result;
    expect(gate.stats.peak).toBe(4);
    expect(gate.stats.fileStarts).toHaveLength(12);
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
  });

  it('does not settle after an abort until every query already in flight has settled', async () => {
    const controller = new AbortController();
    const gate = gated(createWorld(HAPPY), { holdQueries: true });
    const result = scan(gate.host, { signal: controller.signal });
    const state = { settled: false };
    const outcome = result.then(
      () => {
        state.settled = true;
      },
      () => {
        state.settled = true;
      },
    );
    await vi.waitFor(
      () => {
        expect(gate.holds).toHaveLength(4);
      },
      { interval: 1 },
    );
    controller.abort();
    gate.holds.splice(0, 1)[0]?.release();
    await flush();
    expect(state.settled).toBe(false);
    expect(gate.stats.inFlight).toBe(3);
    gate.releaseAll();
    await outcome;
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(gate.stats.inFlight).toBe(0);
  });

  it('does not settle after an abort until every download already in flight has settled', async () => {
    const controller = new AbortController();
    const gate = gated(createWorld({ ...HAPPY, logic: specs(4) }), { holdFiles: true });
    const result = scan(gate.host, { signal: controller.signal });
    const state = { settled: false };
    const outcome = result.then(
      () => {
        state.settled = true;
      },
      () => {
        state.settled = true;
      },
    );
    await vi.waitFor(
      () => {
        expect(gate.holds).toHaveLength(4);
      },
      { interval: 1 },
    );
    controller.abort();
    gate.holds.splice(0, 1)[0]?.release();
    await flush();
    expect(state.settled).toBe(false);
    expect(gate.stats.inFlight).toBe(3);
    gate.releaseAll();
    await outcome;
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(gate.stats.inFlight).toBe(0);
  });
});

type Hold = { key: string; release: () => void };

/**
 * Wraps a fake so a test decides when each read settles, and measures how many reads overlap.
 * A released call then runs against the fake, which honours the signal like the real adapter.
 */
function gated(
  fake: Fake,
  config: {
    holdQueries?: boolean;
    holdFiles?: boolean;
    failFiles?: Readonly<Record<string, HostReadError>>;
  },
): {
  host: PptbHost;
  holds: Hold[];
  stats: { inFlight: number; peak: number; fileStarts: string[] };
  waitFor(key: string): Promise<void>;
  release(key: string): void;
  releaseAll(): void;
} {
  const holds: Hold[] = [];
  const fileStarts: string[] = [];
  const stats = { inFlight: 0, peak: 0, fileStarts };
  async function enter(key: string, held: boolean): Promise<void> {
    stats.inFlight += 1;
    stats.peak = Math.max(stats.peak, stats.inFlight);
    if (!held) return;
    const gate = deferred();
    holds.push({ key, release: gate.resolve });
    await gate.promise;
  }
  const host: PptbHost = {
    ...fake,
    queryAll: async (q, signal) => {
      try {
        await enter(q.entitySet, config.holdQueries === true);
        return await fake.queryAll(q, signal);
      } finally {
        stats.inFlight -= 1;
      }
    },
    downloadFileColumn: async (ref, signal) => {
      stats.fileStarts.push(ref.recordId);
      try {
        await enter(ref.recordId, config.holdFiles === true);
        const failure = config.failFiles?.[ref.recordId];
        if (failure !== undefined) throw failure;
        return await fake.downloadFileColumn(ref, signal);
      } finally {
        stats.inFlight -= 1;
      }
    },
  };
  return {
    host,
    holds,
    stats,
    waitFor: (key) =>
      vi.waitFor(
        () => {
          expect(holds.map((hold) => hold.key)).toContain(key);
        },
        { interval: 1 },
      ),
    release: (key) => {
      const index = holds.findIndex((hold) => hold.key === key);
      if (index < 0) throw new Error(`No pending read for ${key}.`);
      holds.splice(index, 1)[0]?.release();
    },
    releaseAll: () => {
      for (const hold of holds.splice(0)) hold.release();
    },
  };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  const holder: { resolve: () => void } = { resolve: () => undefined };
  const promise = new Promise<void>((resolve) => {
    holder.resolve = resolve;
  });
  return { promise, resolve: () => { holder.resolve(); } };
}

/** Lets every pending microtask run, so a rejection has reached the reader before the next release. */
function flush(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
