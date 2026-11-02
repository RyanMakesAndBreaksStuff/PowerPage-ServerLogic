# Phase 15: Inspector scan reader implementation plan

> **Execution superseded — 2026-11-01.** `../../../phase-5/plans/p5-1_plan.md`, `../../../phase-5/plans/p5-2_plan.md` and `../../../phase-5/plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.

**Part:** `plan-inspector.md`, wave I2.

**Goal:** Read every known server logic file and the selected site's configuration, retaining completed evidence when a scan fails or is interrupted.

**Architecture:** `scan/parseRecords.ts` owns the S1 JSON-to-facts boundary, `scan/scan.ts` owns query construction and scan state, and `scan/pool.ts` owns the bounded work queue. Phase 01 continues to own paging, read retries and file transport; this phase adds partial-page evidence to its error contract. Phase 11 owns setting names and all finding evaluation, and Phase 23 owns connection comparison, scan ID generation and invalidation.

**Tech stack:** Existing TypeScript 6 strict configuration, Vitest 5, Phase 01's `PptbHost`, standard `Date`, `AbortSignal`, `encodeURIComponent` and promises. No package is added.

**Scope / Implements:** FR-7 data sources verified by S1, typed read failures, all-pages inventory, at most four reads, escaped filter literals, scan progress, inactive files and settings, environment-variable resolution, and NFR Reliability and scan Performance.

**Satisfies:**

- AC-7.2: `listSites` returns enhanced-model sites with active/inactive state and no selection decision. Phase 23 owns disabled options and the lack of auto-selection.
- AC-7.3: every known file keeps its name and active/inactive state; partial inventory stays `inventoryComplete: false`.
- AC-7.4: a successful empty inventory returns no files. Phase 23 owns the empty-state copy and disabled export.
- AC-7.6: the supplied scan ID is retained unchanged; abort suppresses queued work. Phase 23 owns comparison of connection id/URL, generation of the counter, clearing and stale-result rejection.
- AC-7.7: a failed configuration or file read is represented independently and does not become an absent/default value.
- AC-7.9 and AC-7.12: raw Enabled/Timeout and inactive-setting evidence reach Phase 11 unchanged.
- AC-7.10 and AC-8.11: 401/transport failure stops new reads, retains successful facts, and gives unread evidence the Not scanned state.
- AC-8.5: empty downloaded code remains `ok: true`; malformed code is analysed by Phase 11. Only a failed download is a handler-code read failure.
- NFR Performance: the deterministic 50-record fixture records scheduling time and peak reads. The 30 s live PPTB gate stays separate.

**Out of scope:** UI, report formatting, finding rules, scan ID generation, changing the active connection, writes to Dataverse, runtime access validation, and substituting an unverified PPTB transport.

**Depends on:** 01 (host adapter), 11 (types and setting-name owner), and ◆12 (S2 evidence and adapter fix-ups before executing this phase against PPTB). The scratch verification deliberately leaves `NEXT_LINK_UNVERIFIED` true.

**Files:**

- Create: `src/services/pptb/odataLiteral.ts`, `odataLiteral.test.ts`, `hostReadPartial.test.ts`.
- Modify: `src/services/pptb/host.types.ts`, `hostErrors.ts`, `dataverseRead.ts` and `src/skeleton.test.ts`.
- Create: `src/features/inspector/scan/pool.ts`, `pool.test.ts`, `parseRecords.ts`, `parseRecords.test.ts`, `scan.test.ts`.
- Replace the Phase 00 stub: `src/features/inspector/scan/scan.ts`.

**Interfaces:**

- Consumes `Connection`, `PptbHost`, `HostReadError`, `ODataQuery` from Phase 01; `Readable`, `SiteRef`, `SiteFacts`, `ServerLogicFileFacts`, `WebRoleFact`, `TablePermissionFact`, `SettingName` and `SettingValue` from Phase 11 and `plan-starter.md` Contracts.
- Consumes `normalizeSettingName(raw: string): SettingName | null` from Phase 11 `model/settings.ts`. Scan collection owns whether a successful query proved absence; Phase 11 owns matching and interpretation.
- Produces `odataString(value: string): string` in `services/pptb/odataLiteral.ts`.
- Produces unchanged `listSites(host: PptbHost): Promise<readonly SiteRef[]>` and `runScan(host, connection, site, scanId, onProgress, options?): Promise<SiteFacts>`.
- Produces `type ScanOptions = { now?: () => Date; signal?: AbortSignal }`; the five-argument call remains valid.
- Produces the optional error fields `transport: boolean` and `partialRows: readonly unknown[]`. The constructor is `HostReadError(message: string, status: number | null, transport = false, partialRows: readonly unknown[] = [])`.
- Feature-internal only: `mapLimit<T,R>`, `recordId`, `parseSite`, `parseFile`, `parseRoles`, `parsePermissions`, `collectSettings`, `parseDefinition`, `parseEnvironmentValue`, `PendingSetting`, `CollectedSettings` and `EnvironmentDefinition`.

## Decisions

1. **Exact S1 schema.** The queries select sites from `powerpagesites` and types 35, 11, 18 and 9 from `powerpagecomponents`, scoped through `_powerpagesiteid_value`. Component `content` is parsed JSON; code comes only from `filecontent/$value`. S1's `t35.json`, `t11.json`, `t18.json` and `t9-sl.json` support these names. The query fixture in Task 4 owns the exact select/filter/order strings. S2's first run (2026-10-22) showed `filecontent/$value` through `queryData` returns `{}`, which Learn explains (a raw byte body that a JSON-only call cannot carry). Until a spec change or a host feature opens a read-only byte path, every code read resolves to `code: { ok: false, reason: 'read-failed' }` and the outbound check reports "couldn't read handler code" (spec FR-7 fallback). The role and permission checks are unaffected.
2. **Paging remains Phase 01's responsibility.** Every list passes page size 5000 and orders by its selected primary key, with no `$top`. A logical `queryAll` reads its pages sequentially and retries 429/5xx at 1/2/4 s. The pool slot remains occupied throughout, so retries and paging cannot exceed four physical reads.
3. **Partial inventory needs an explicit host error amendment.** Phase 01 accumulated rows internally but discarded them when a later page rejected. Task 1 adds an immutable array snapshot to a new `HostReadError`, preserving the mapped status and transport flag. Only the inventory consumer accepts `partialRows`; partial roles, permissions, settings or environment variables remain failed reads. `queryAll` still resolves only complete arrays and retains its original signature.
4. **Transport classification is provisional S2 evidence.** An existing local `HostReadError` keeps `transport: false`, so response-shape guards are not connection loss. A raw host rejection with no status is conservatively mapped to `transport: true`; 401 also stops the scan, while 403 and exhausted 5xx do not. ◆12 must refine this mapping using observed host errors; a generic no-status exception alone does not prove a network failure. S2's first run recorded one such no-status `Error` from the host with the network up (a `getActiveConnection()` call that later succeeded), so this mapping stays provisional until the network-drop and expired-sign-in rows are filled, and `downloadFileColumn`'s `{}` result (a local `HostReadError`) is never transport.
5. **One queue includes all post-inventory reads.** Roles, permissions, settings plus their sequential environment-variable queries, and every code download share one `mapLimit(jobs, 4, ...)`. Inventory reads first so files and total progress are known. No second pool or unbounded `Promise.all` is introduced.
6. **Settings query and variable resolution have separate evidence.** Names match after trim and case-insensitive exact comparison using Phase 11. Inactive rows are ignored and their canonical names retained. Two active matches become duplicate before any variable query. After a successful settings query, inline values and already-resolved variables remain available even if another variable read stops. Phase 11's `SettingValue { kind: 'not-scanned' }` represents an interrupted variable; `envvar-unreadable` represents Secret, missing/ambiguous data or a non-connection read failure.
7. **Two environment-variable queries.** Definitions select their primary key, schema, type, default and state; active values select their primary key, definition lookup, value and state. No `$expand` exists in `ODataQuery`. A successful active current value, including empty string, takes precedence; no current value falls back to the definition default. Multiple definitions/values fail closed, rather than guessing which row the site uses. Secret variables are rejected before value reads.
8. **Encoding happens once.** `odataString` doubles apostrophes, URL-encodes the value and apostrophes, then wraps it in literal quotes. `buildQueryPath` already passes clause bytes through. Percent text such as `%20` is encoded as the data `%2520`, while an encoded apostrophe is never encoded again. Constant `serverlogic/` uses the same helper. Dataverse string filters are case-insensitive; `contains` finds prefixed settings even with surrounding spaces, and client matching excludes unrelated names.
9. **Parsing fails closed at the smallest existing fact boundary.** Malformed role/permission rows make that collection read-failed. Both default-role flags are required booleans: all seven S1 roles store both explicitly, so a missing flag cannot justify a clean anonymity result. A file with malformed role-link JSON keeps file metadata and a failed roleIds read. Unparseable inventory metadata is omitted and makes inventory incomplete. Missing/unknown permission scope becomes `null` for the reviewable Phase 11 rule. Optional absent link arrays mean no links, and inactive file/permission rows are retained.
10. **Progress is terminal file attempts, not readiness.** The callback begins with `(0, N)`; each successful download or non-connection failed download increments X once. Not scanned downloads do not increment X. With zero known files the only callback is `(0, 0)`. The UI in Phase 23 formats “Scanned X of N”.
11. **Abort and loss are distinct.** An aborted signal prevents the inventory and subsequent logical read calls. Already in-flight host calls are awaited, and successful facts can finish. Abort leaves `stopped: null`; Phase 23 discards that superseded scan ID. Connection loss returns `stopped: 'connection-lost'`. Phase 23 must serialize site-list loading and scans, abort the old scan, then await its settlement before starting another; the existing host contract cannot cancel an already-running page/retry chain.
12. **Time is injected only for deterministic evidence.** `now` defaults to `new Date()`, with ISO UTC timestamps at start and settlement. The 50-record test uses fake timers with 100 ms per read, records the interval and asserts peak reads, with no wall-clock duration assertion. A scan is a read interval, never an atomic snapshot.

**Official grounding checked 2026-10-22:** Microsoft Learn “Filter rows using OData” (single-value apostrophes doubled, special characters encoded, string filters case-insensitive), “Page results using OData” (same Prefer on pages, deterministic primary-key ordering, nextLink bytes never re-encoded), “Use file column data” (`GET <set>(<id>)/<column>/$value`), and the environmentvariablevalue EntityType (`_environmentvariabledefinitionid_value`). These establish Dataverse behavior; ◆12 owns PPTB's response shapes and read access.

---

- [ ] **Step 0: Preflight**

Run from the repository root on `001-logic-inspector`:

```powershell
git status --short
rg -n "not implemented: phase 15" src/features/inspector/scan/scan.ts
rg -n "normalizeSettingName|not-scanned|inactiveSettings" src/features/inspector/model/settings.ts src/types/inspector.ts
npx tsc -b
npx vitest run src/services/pptb
```

Expected: unrelated work identified and preserved; the two phase-15 stubs remain; Phase 11's normalized names, unknown-scope contract and interrupted-variable/inactive-setting types are present; typecheck and Phase 01 tests pass. Confirm the Phase 12 evidence table permits paging, file-column reads and variables before executing live reads. This docs-only planning session does not claim ◆12 is complete.

### Task 1: Host errors retain successful page evidence

**Owns:** AC-7.3 partial-page retention and AC-7.10 transport failure classification.

**Files:**

- Modify: `src/services/pptb/host.types.ts:17` — optional read-error evidence.
- Modify: `src/services/pptb/hostErrors.ts:48` — raw host rejection mapping.
- Modify: `src/services/pptb/dataverseRead.ts:92` — attach accumulated page snapshot.
- Create / Signal: `src/services/pptb/hostReadPartial.test.ts` — failure classification, partial pages, strict-link guard and byte-preserving pagination.

- [ ] **Step 1: Establish the observable pre-change signal**

`src/services/pptb/hostReadPartial.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import { fetchAllPages, queryAllRows } from './dataverseRead';
import { toHostReadError } from './hostErrors';
import type { ODataQuery } from './host.types';

const query: ODataQuery = {
  entitySet: 'powerpagecomponents',
  select: ['powerpagecomponentid'],
  filter: null,
  orderBy: 'powerpagecomponentid',
  pageSize: 2,
};
const link = 'https://org.crm.dynamics.com/api/data/v9.2/powerpagecomponents?$skiptoken=%2520';

afterEach(() => vi.restoreAllMocks());

describe('read failure evidence', () => {
  it('distinguishes a host no-status rejection from a local response guard', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(new HostReadError('bad shape', null)).toMatchObject({
      transport: false,
      partialRows: [],
    });
    expect(toHostReadError('queryData', new TypeError('network'))).toMatchObject({
      status: null,
      transport: true,
    });
    expect(toHostReadError('queryData', { status: 403 })).toMatchObject({
      status: 403,
      transport: false,
    });
  });

  it.each([401, 403, 503, null])(
    'retains prior pages and the failure evidence (%s)',
    async (status) => {
      let calls = 0;
      const page = () => {
        calls += 1;
        if (calls === 1) return Promise.resolve({ rows: ['first', 'second'], nextLink: link });
        return Promise.reject(new HostReadError('failed', status, status === null));
      };
      await expect(fetchAllPages(page, query, false)).rejects.toMatchObject({
        status,
        transport: status === null,
        partialRows: ['first', 'second'],
      });
    },
  );

  it('keeps the full page when the S2 next-link guard rejects it', async () => {
    await expect(
      fetchAllPages(
        () => Promise.resolve({ rows: ['first', 'second'], nextLink: null }),
        query,
        true,
      ),
    ).rejects.toMatchObject({ transport: false, partialRows: ['first', 'second'] });
  });

  it('keeps next-link bytes and Prefer unchanged through a partial query', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const read = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ value: [1], '@odata.nextLink': link })
      .mockRejectedValue({ status: 403 });
    await expect(
      queryAllRows(query, { read, sleep: () => Promise.resolve() }),
    ).rejects.toMatchObject({
      partialRows: [1],
    });
    expect(read.mock.calls[1]).toEqual([
      'powerpagecomponents?$skiptoken=%2520',
      { Prefer: 'odata.maxpagesize=2' },
    ]);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/pptb/hostReadPartial.test.ts`

Expected at the baseline: seven failed tests; `transport` and `partialRows` are missing. The 401/403/503/no-status cases lose the first page. This RED signal was observed in scratch before Task 1.

- [ ] **Step 3: Implement the minimum fix**

In `src/services/pptb/host.types.ts`, add the two parameters inside `HostReadError.constructor` after `status`:

```ts
    readonly status: number | null,
    readonly transport = false,
    readonly partialRows: readonly unknown[] = [],
```

In `src/services/pptb/hostErrors.ts`, replace the return at the end of `toHostReadError`:

```ts
  const status = statusOf(error);
  return new HostReadError(messageForStatus(status), status, status === null);
```

In `fetchAllPages` in `src/services/pptb/dataverseRead.ts`, wrap the existing loop beginning at `let path` and its `return rows` in a `try`. Add only this catch; the paging and retry logic remain as Phase 01 implemented them:

```ts
  const rows: unknown[] = [];
  try {
    let path: string | null = buildQueryPath(q);
```

The closing boundary after the loop is:

```ts
    return rows;
  } catch (error) {
    const failure = toHostReadError('queryData', error);
    throw new HostReadError(failure.message, failure.status, failure.transport, [...rows]);
  }
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/services/pptb/hostReadPartial.test.ts`

Expected: seven passed tests.

Run: `npx vitest run src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts`

Expected: 112 passed tests; existing retry, paging, adapter and fake behavior remains green.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/services/pptb/host.types.ts src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/hostReadPartial.test.ts
git commit -m "fix(pptb): retain completed pages on read failure"
```

### Task 2: Encode OData literals once and bound one work queue

**Owns:** FR-7 string literal encoding and pool concurrency.

**Files:**

- Create / Signal: `src/services/pptb/odataLiteral.test.ts`, `src/features/inspector/scan/pool.test.ts`.
- Create: `src/services/pptb/odataLiteral.ts` — literal encoding.
- Create: `src/features/inspector/scan/pool.ts` — stable-order bounded workers.

- [ ] **Step 1: Establish the observable pre-change signal**

`src/services/pptb/odataLiteral.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildQueryPath } from './dataverseRead';
import { odataString } from './odataLiteral';

describe('odataString', () => {
  it('doubles apostrophes before encoding the literal once', () => {
    expect(odataString("a'b c+%&#")).toBe("'a%27%27b%20c%2B%25%26%23'");
    expect(decodeURIComponent(odataString("a'b c+%&#"))).toBe("'a''b c+%&#'");
  });

  it('passes an encoded literal through buildQueryPath unchanged', () => {
    const path = buildQueryPath({
      entitySet: 'environmentvariabledefinitions',
      select: ['environmentvariabledefinitionid'],
      filter: `schemaname eq ${odataString("ryan_' %20")}`,
      orderBy: 'environmentvariabledefinitionid',
      pageSize: 5000,
    });
    expect(path).toBe(
      "environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq 'ryan_%27%27%20%2520'&$orderby=environmentvariabledefinitionid",
    );
    expect(path).not.toContain('%2527');
  });
});
```

`src/features/inspector/scan/pool.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapLimit } from './pool';

describe('mapLimit', () => {
  it('runs at most four reads together and preserves input order', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapLimit([0, 1, 2, 3, 4, 5, 6, 7, 8], 4, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(peak).toBe(4);
    expect(result).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16]);
  });

  it('does not call a worker for no items', async () => {
    await expect(mapLimit([], 4, () => Promise.reject(new Error('called')))).resolves.toEqual([]);
  });

  it('rejects the impossible pool configuration', async () => {
    await expect(mapLimit([1], 0, (n) => Promise.resolve(n))).rejects.toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/pptb/odataLiteral.test.ts src/features/inspector/scan/pool.test.ts`

Expected at baseline: two suites fail import resolution for the absent `odataLiteral` and `pool` modules. This RED signal was observed in scratch.

- [ ] **Step 3: Implement the minimum fix**

`src/services/pptb/odataLiteral.ts`:

```ts
/** An OData string literal, escaped and encoded once before buildQueryPath passes it through. */
export function odataString(value: string): string {
  return `'${encodeURIComponent(value.replaceAll("'", "''")).replaceAll("'", '%27')}'`;
}
```

`src/features/inspector/scan/pool.ts`:

```ts
/** Runs bounded workers over one shared iterator, returning values in input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<readonly R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Pool limit must be positive.');
  const iterator = items.entries();
  const results: { index: number; value: R }[] = [];
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (const [index, item] of iterator) {
        results.push({ index, value: await worker(item, index) });
      }
    }),
  );
  return results.sort((a, b) => a.index - b.index).map(({ value }) => value);
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/services/pptb/odataLiteral.test.ts src/features/inspector/scan/pool.test.ts`

Expected: five passed tests; decoded values retain doubled apostrophes and literal percent data; peak workers equals four; output order follows input.

Run: `npx vitest run src/services/pptb/dataverseRead.test.ts`

Expected: 29 passed tests; `buildQueryPath` still validates and passes encoded clauses through.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/services/pptb/odataLiteral.ts src/services/pptb/odataLiteral.test.ts src/features/inspector/scan/pool.ts src/features/inspector/scan/pool.test.ts
git commit -m "feat(inspector): add bounded reads and escaped literals"
```

### Task 3: Parse the enhanced data model into typed facts

**Owns:** FR-7 S1 content schema, inactive-setting evidence, missing/unknown scope, and environment-variable value resolution.

**Files:**

- Create / Signal: `src/features/inspector/scan/parseRecords.test.ts`.
- Create: `src/features/inspector/scan/parseRecords.ts` — unknown JSON-to-facts boundary.

- [ ] **Step 1: Establish the observable pre-change signal**

`src/features/inspector/scan/parseRecords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HostReadError } from '@/services/pptb/host.types';
import {
  collectSettings,
  parseDefinition,
  parseEnvironmentValue,
  parseFile,
  parsePermissions,
  parseRoles,
  parseSite,
} from './parseRecords';

const id = '00000000-0000-0000-0000-000000000001';
const roleId = '00000000-0000-0000-0000-000000000002';
const component = (name: string, content: unknown, statecode = 0) => ({
  powerpagecomponentid: id,
  name,
  statecode,
  content: JSON.stringify(content),
});

describe('S1 configuration parsing', () => {
  it('reads enhanced sites, including disabled inactive sites and a missing domain', () => {
    expect(
      parseSite({ powerpagesiteid: id, name: 'Site', primarydomainname: null, statecode: 1 }),
    ).toEqual({ id, name: 'Site', domain: '', active: false });
    expect(() => parseSite({ powerpagesiteid: 'bad', name: 'Site', statecode: 0 })).toThrow(
      HostReadError,
    );
  });

  it('reads role links from content, while an unreadable link retains file metadata', () => {
    expect(
      parseFile(component('handler', { adx_serverlogic_adx_webrole: [roleId] }, 1)),
    ).toMatchObject({ id, name: 'handler', active: false, roleIds: { ok: true, value: [roleId] } });
    expect(parseFile(component('handler', {})).roleIds).toEqual({ ok: true, value: [] });
    expect(parseFile({ ...component('handler', {}), content: '{bad' }).roleIds).toEqual({
      ok: false,
      reason: 'read-failed',
    });
    expect(
      parseFile(component('handler', { adx_serverlogic_adx_webrole: ['invalid'] })).roleIds,
    ).toEqual({ ok: false, reason: 'read-failed' });
  });

  it('identifies default roles by flags and guards malformed flag values', () => {
    expect(
      parseRoles([
        component('Renamed', { anonymoususersrole: true, authenticatedusersrole: false }),
      ]),
    ).toEqual([{ id, name: 'Renamed', anonymous: true, authenticated: false }]);
    expect(() => parseRoles([component('Bad', { anonymoususersrole: 'true' })])).toThrow(
      HostReadError,
    );
  });

  it.each([{ anonymoususersrole: true }, { authenticatedusersrole: false }])(
    'rejects missing default-role flags instead of inferring false (%j)',
    (content) => {
      expect(() => parseRoles([component('Incomplete flags', content)])).toThrow(HostReadError);
    },
  );

  it.each([
    [756150000, 'Global'],
    [756150001, 'Contact'],
    [756150002, 'Account'],
    [756150003, 'Parent'],
    [756150004, 'Self'],
    [null, null],
    [999, null],
  ])('maps permission scope %s to %s without hiding unknown values', (scope, expected) => {
    expect(
      parsePermissions([
        component(
          'Permission',
          {
            entitylogicalname: 'account',
            scope,
            read: true,
            appendto: true,
            adx_entitypermission_webrole: [roleId],
            parententitypermission: roleId,
          },
          1,
        ),
      ]),
    ).toEqual([
      {
        id,
        name: 'Permission',
        table: 'account',
        scope: expected,
        privileges: ['Read', 'AppendTo'],
        roleIds: [roleId],
        active: false,
        parentId: roleId,
      },
    ]);
  });

  it('accepts a Parent permission without direct roles and treats a missing scope as unknown', () => {
    const parsed = parsePermissions([
      component('Child', { entitylogicalname: 'account', read: true }),
    ]);
    expect(parsed).toMatchObject([{ scope: null, roleIds: [], parentId: null }]);
  });

  it('matches trimmed case-insensitive active settings and preserves inactive names', () => {
    const parsed = collectSettings([
      component(' serverlogic/enabled ', { source: 0, value: ' FALSE ' }),
      component('ServerLogic/TimeoutInSeconds', { source: 0, value: '240' }, 1),
      component('ServerLogic/Other', { source: 0, value: 'ignored' }),
    ]);
    expect(parsed.values['ServerLogic/Enabled']).toEqual({
      kind: 'value',
      raw: ' FALSE ',
      fromEnvVar: false,
    });
    expect(parsed.values['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'absent' });
    expect(parsed.inactiveSettings).toEqual(['ServerLogic/TimeoutInSeconds']);
  });

  it('detects duplicates before resolving their environment variables', () => {
    const parsed = collectSettings([
      component('serverlogic/alloweddomains', { source: 1, envvar_schema: 'dup' }),
      component(' ServerLogic/AllowedDomains ', { source: 0, value: 'example.com' }),
    ]);
    expect(parsed.values['ServerLogic/AllowedDomains']).toEqual({ kind: 'duplicate' });
    expect(parsed.pending).toEqual([]);
  });

  it('keeps valid envvar schema names exact and starts their values Not scanned', () => {
    const parsed = collectSettings([
      component('ServerLogic/AllowedDomains', { source: 1, envvar_schema: "ryan_' %20" }),
    ]);
    expect(parsed.pending).toEqual([{ name: 'ServerLogic/AllowedDomains', schema: "ryan_' %20" }]);
    expect(parsed.values['ServerLogic/AllowedDomains']).toEqual({ kind: 'not-scanned' });
    expect(
      collectSettings([component('ServerLogic/Enabled', { source: 1 })]).values[
        'ServerLogic/Enabled'
      ],
    ).toEqual({ kind: 'envvar-unreadable' });
  });

  it('fails closed for malformed inline configuration instead of applying absent defaults', () => {
    expect(() =>
      collectSettings([component('ServerLogic/Enabled', { source: 0, value: 42 })]),
    ).toThrow(HostReadError);
  });

  it('uses current environment values before defaults, including empty strings', () => {
    const definition = parseDefinition([
      {
        environmentvariabledefinitionid: id,
        type: 100000000,
        defaultvalue: 'default',
        statecode: 0,
      },
    ]);
    if (definition === null) throw new Error('Definition should parse.');
    expect(parseEnvironmentValue([], definition)).toEqual({
      kind: 'value',
      raw: 'default',
      fromEnvVar: true,
    });
    expect(
      parseEnvironmentValue(
        [
          {
            environmentvariablevalueid: roleId,
            _environmentvariabledefinitionid_value: id,
            value: '',
            statecode: 0,
          },
        ],
        definition,
      ),
    ).toEqual({ kind: 'value', raw: '', fromEnvVar: true });
    expect(
      parseEnvironmentValue(
        [
          {
            environmentvariablevalueid: roleId,
            _environmentvariabledefinitionid_value: id,
            value: 'current',
            statecode: 0,
          },
        ],
        definition,
      ),
    ).toEqual({ kind: 'value', raw: 'current', fromEnvVar: true });
  });

  it('does not read secrets, missing variables or ambiguous values as ordinary strings', () => {
    expect(parseDefinition([])).toBeNull();
    expect(
      parseDefinition([
        {
          environmentvariabledefinitionid: id,
          type: 100000005,
          defaultvalue: 'secret',
          statecode: 0,
        },
      ]),
    ).toBeNull();
    const definition = { id, defaultValue: null };
    expect(parseEnvironmentValue([], definition)).toEqual({ kind: 'envvar-unreadable' });
    const value = {
      environmentvariablevalueid: roleId,
      _environmentvariabledefinitionid_value: id,
      value: 'first',
      statecode: 0,
    };
    expect(parseEnvironmentValue([value, value], definition)).toEqual({
      kind: 'envvar-unreadable',
    });
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/scan/parseRecords.test.ts`

Expected at baseline: the suite fails to resolve `./parseRecords`. This RED signal was observed in scratch.

- [ ] **Step 3: Implement the minimum fix**

`src/features/inspector/scan/parseRecords.ts`:

```ts
import { HostReadError } from '@/services/pptb/host.types';
import type {
  Readable,
  ServerLogicFileFacts,
  SettingName,
  SettingValue,
  SiteRef,
  TablePermissionFact,
  WebRoleFact,
} from '@/types/inspector';
import type { AccessType, Privilege } from '@/types/recipe';
import { normalizeSettingName } from '../model/settings';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(): HostReadError {
  return new HostReadError('Unexpected configuration from Dataverse.', null);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw invalid();
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw invalid();
  return value;
}

export function recordId(value: unknown): string {
  const id = text(value);
  if (!GUID.test(id)) throw invalid();
  return id.toLowerCase();
}

function active(value: unknown): boolean {
  if (value !== 0 && value !== 1) throw invalid();
  return value === 0;
}

function flag(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') throw invalid();
  return value;
}

function ids(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid();
  return value.map(recordId);
}

function content(value: unknown): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text(value));
    return record(parsed);
  } catch {
    throw invalid();
  }
}

export function parseSite(value: unknown): SiteRef {
  const row = record(value);
  return {
    id: recordId(row.powerpagesiteid),
    name: text(row.name),
    domain:
      row.primarydomainname === null || row.primarydomainname === undefined
        ? ''
        : text(row.primarydomainname),
    active: active(row.statecode),
  };
}

export function parseFile(value: unknown): ServerLogicFileFacts {
  const row = record(value);
  let roleIds: Readable<readonly string[]>;
  try {
    roleIds = { ok: true, value: ids(content(row.content).adx_serverlogic_adx_webrole) };
  } catch {
    roleIds = { ok: false, reason: 'read-failed' };
  }
  return {
    id: recordId(row.powerpagecomponentid),
    name: text(row.name),
    active: active(row.statecode),
    roleIds,
    code: { ok: false, reason: 'not-scanned' },
  };
}

export function parseRoles(values: readonly unknown[]): readonly WebRoleFact[] {
  return values.map((value) => {
    const row = record(value);
    const data = content(row.content);
    if (
      typeof data.anonymoususersrole !== 'boolean' ||
      typeof data.authenticatedusersrole !== 'boolean'
    )
      throw invalid();
    return {
      id: recordId(row.powerpagecomponentid),
      name: text(row.name),
      anonymous: flag(data.anonymoususersrole),
      authenticated: flag(data.authenticatedusersrole),
    };
  });
}

function scope(value: unknown): AccessType | null {
  switch (value) {
    case 756150000:
      return 'Global';
    case 756150001:
      return 'Contact';
    case 756150002:
      return 'Account';
    case 756150003:
      return 'Parent';
    case 756150004:
      return 'Self';
    default:
      return null;
  }
}

const PRIVILEGES: readonly (readonly [string, Privilege])[] = [
  ['read', 'Read'],
  ['write', 'Write'],
  ['create', 'Create'],
  ['delete', 'Delete'],
  ['append', 'Append'],
  ['appendto', 'AppendTo'],
];

export function parsePermissions(values: readonly unknown[]): readonly TablePermissionFact[] {
  return values.map((value) => {
    const row = record(value);
    const data = content(row.content);
    return {
      id: recordId(row.powerpagecomponentid),
      name: text(row.name),
      table: text(data.entitylogicalname),
      scope: scope(data.scope),
      privileges: PRIVILEGES.filter(([key]) => flag(data[key])).map(([, privilege]) => privilege),
      roleIds: ids(data.adx_entitypermission_webrole),
      active: active(row.statecode),
      parentId:
        data.parententitypermission === undefined || data.parententitypermission === null
          ? null
          : recordId(data.parententitypermission),
    };
  });
}

export type PendingSetting = { name: SettingName; schema: string };
export type CollectedSettings = {
  values: Record<SettingName, SettingValue>;
  inactiveSettings: readonly SettingName[];
  pending: readonly PendingSetting[];
};

export function collectSettings(rows: readonly unknown[]): CollectedSettings {
  const groups = new Map<SettingName, Record<string, unknown>[]>();
  const inactiveSettings = new Set<SettingName>();
  for (const value of rows) {
    const row = record(value);
    const name = normalizeSettingName(text(row.name));
    if (name === null) continue;
    if (!active(row.statecode)) {
      inactiveSettings.add(name);
      continue;
    }
    const group = groups.get(name) ?? [];
    group.push(row);
    groups.set(name, group);
  }
  const pending: PendingSetting[] = [];
  const values: Record<SettingName, SettingValue> = {
    'ServerLogic/Enabled': { kind: 'absent' },
    'ServerLogic/AllowedDomains': { kind: 'absent' },
    'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
    'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
  };
  for (const [name, group] of groups) {
    if (group.length > 1) {
      values[name] = { kind: 'duplicate' };
      continue;
    }
    const row = group[0];
    if (row === undefined) continue;
    const data = content(row.content);
    if (data.source === 1) {
      if (typeof data.envvar_schema !== 'string' || data.envvar_schema.trim() === '') {
        values[name] = { kind: 'envvar-unreadable' };
      } else {
        values[name] = { kind: 'not-scanned' };
        pending.push({ name, schema: data.envvar_schema });
      }
    } else if (data.source === 0) {
      values[name] = { kind: 'value', raw: text(data.value), fromEnvVar: false };
    } else {
      throw invalid();
    }
  }
  return { values, inactiveSettings: [...inactiveSettings], pending };
}

export type EnvironmentDefinition = { id: string; defaultValue: string | null };

export function parseDefinition(rows: readonly unknown[]): EnvironmentDefinition | null {
  try {
    if (rows.length !== 1) return null;
    const row = record(rows[0]);
    if (!active(row.statecode) || row.type === 100000005 || typeof row.type !== 'number')
      return null;
    return {
      id: recordId(row.environmentvariabledefinitionid),
      defaultValue:
        row.defaultvalue === null || row.defaultvalue === undefined ? null : text(row.defaultvalue),
    };
  } catch {
    return null;
  }
}

export function parseEnvironmentValue(
  rows: readonly unknown[],
  definition: EnvironmentDefinition,
): SettingValue {
  try {
    if (rows.length > 1) return { kind: 'envvar-unreadable' };
    const value = rows[0];
    let raw = definition.defaultValue;
    if (value !== undefined) {
      const row = record(value);
      recordId(row.environmentvariablevalueid);
      if (
        !active(row.statecode) ||
        recordId(row._environmentvariabledefinitionid_value) !== definition.id
      )
        return { kind: 'envvar-unreadable' };
      if (row.value !== null && row.value !== undefined) raw = text(row.value);
    }
    return raw === null ? { kind: 'envvar-unreadable' } : { kind: 'value', raw, fromEnvVar: true };
  } catch {
    return { kind: 'envvar-unreadable' };
  }
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/scan/parseRecords.test.ts`

Expected: 19 passed tests, including all five scope mappings, unknown scope, missing default-role flags, invalid file links, trimmed active settings, duplicates, interrupted variables and empty current-value precedence. The two missing-flag cases failed before the required-boolean guard and passed after it.

Run: `npx vitest run src/features/inspector/model/settings.test.ts`

Expected: Phase 11's settings tests pass; scan uses its name owner rather than a second interpretation rule.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/features/inspector/scan/parseRecords.ts src/features/inspector/scan/parseRecords.test.ts
git commit -m "feat(inspector): parse enhanced-model scan facts"
```

### Task 4: Scan the site while keeping successful evidence

**Owns:** AC-7.2/7.3/7.4 read results, AC-7.6 scan ID passthrough/cancel, AC-7.7 per-read failure, AC-7.10 partial retention, AC-8.5 successful-empty-code evidence, progress and scheduling performance.

**Files:**

- Create / Signal: `src/features/inspector/scan/scan.test.ts`.
- Replace: `src/features/inspector/scan/scan.ts` — scan orchestration and exact queries.
- Modify: `src/skeleton.test.ts:21` and `:137` — acknowledge the optional sixth argument in the pinned contract.

- [ ] **Step 1: Establish the observable pre-change signal**

`src/features/inspector/scan/scan.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { queryAllRows } from '@/services/pptb/dataverseRead';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, ODataQuery, PptbHost } from '@/services/pptb/host.types';
import type { SiteRef } from '@/types/inspector';
import { listSites, runScan } from './scan';

const site: SiteRef = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Site',
  domain: 'site.example',
  active: true,
};
const connection: Connection = {
  id: 'connection',
  name: 'DEV',
  url: 'https://org.example',
  environment: 'Dev',
};
const roleId = '00000000-0000-0000-0000-000000000002';
const definitionId = '00000000-0000-0000-0000-000000000003';
const code = 'function get() { return "ok"; }';
const component = (id: string, name: string, content: unknown, statecode = 0) => ({
  powerpagecomponentid: id,
  name,
  statecode,
  content: JSON.stringify(content),
});
const file = (n: number, statecode = 0) =>
  component(
    `00000000-0000-0000-0000-${String(n + 100).padStart(12, '0')}`,
    `handler-${String(n)}`,
    { adx_serverlogic_adx_webrole: [roleId] },
    statecode,
  );
const select = ['powerpagecomponentid', 'name', 'statecode', 'content'];
const typeFilter = (type: number) =>
  `_powerpagesiteid_value eq ${site.id} and powerpagecomponenttype eq ${String(type)}`;
const query = (type: number): ODataQuery => ({
  entitySet: 'powerpagecomponents',
  select,
  filter: typeFilter(type),
  orderBy: 'powerpagecomponentid',
  pageSize: 5000,
});
const settingsFilter = `${typeFilter(9)} and contains(name,'serverlogic%2F')`;

function fixture(
  files: readonly ReturnType<typeof file>[] = [file(0)],
  settings: readonly unknown[] = [],
) {
  return createFakeHost({
    connection,
    responders: [
      (q) => {
        if (q.entitySet === 'powerpagesites')
          return [
            {
              powerpagesiteid: site.id,
              name: site.name,
              primarydomainname: site.domain,
              statecode: 0,
            },
            { powerpagesiteid: roleId, name: 'Inactive', primarydomainname: null, statecode: 1 },
          ];
        if (q.filter === typeFilter(35)) return files;
        if (q.filter === typeFilter(11))
          return [
            component(roleId, 'Role', { anonymoususersrole: false, authenticatedusersrole: false }),
          ];
        if (q.filter === typeFilter(18))
          return [
            component(definitionId, 'Permission', {
              entitylogicalname: 'account',
              scope: 756150001,
              read: true,
              adx_entitypermission_webrole: [roleId],
            }),
          ];
        if (q.filter === settingsFilter) return settings;
        if (q.entitySet === 'environmentvariabledefinitions')
          return [
            {
              environmentvariabledefinitionid: definitionId,
              schemaname: "ryan_' %20",
              type: 100000000,
              defaultvalue: 'default.example',
              statecode: 0,
            },
          ];
        if (q.entitySet === 'environmentvariablevalues')
          return [
            {
              environmentvariablevalueid: roleId,
              _environmentvariabledefinitionid_value: definitionId,
              value: 'current.example',
              statecode: 0,
            },
          ];
        return undefined;
      },
    ],
    fileColumns: Object.fromEntries(
      files.map((f) => [`powerpagecomponents/${f.powerpagecomponentid}/filecontent`, code]),
    ),
  });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function microtasks(): Promise<void> {
  for (let n = 0; n < 40; n += 1) await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Inspector scan', () => {
  it('lists enhanced sites with active and inactive metadata and the exact sites query', async () => {
    const host = fixture();
    const sites = await listSites(host);
    expect(sites).toEqual([site, { id: roleId, name: 'Inactive', domain: '', active: false }]);
    expect(host.callsOf('queryAll').map((call) => call.query)).toEqual([
      {
        entitySet: 'powerpagesites',
        select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
        filter: null,
        orderBy: 'powerpagesiteid',
        pageSize: 5000,
      },
    ]);
  });

  it('runs every exact S1 query and both environment-variable reads with escaped literals', async () => {
    const files = [file(0), file(1, 1)];
    const host = fixture(files, [
      component(roleId, ' ServerLogic/AllowedDomains ', { source: 1, envvar_schema: "ryan_' %20" }),
      component(definitionId, 'ServerLogic/TimeoutInSeconds', { source: 0, value: '240' }, 1),
    ]);
    const progress = vi.fn<(scanned: number, total: number) => void>();
    const result = await runScan(host, connection, site, 'connection:site:1', progress);
    expect(host.callsOf('queryAll').map((call) => call.query)).toEqual([
      query(35),
      query(11),
      query(18),
      { ...query(9), filter: settingsFilter },
      {
        entitySet: 'environmentvariabledefinitions',
        select: [
          'environmentvariabledefinitionid',
          'schemaname',
          'type',
          'defaultvalue',
          'statecode',
        ],
        filter: "schemaname eq 'ryan_%27%27%20%2520' and statecode eq 0",
        orderBy: 'environmentvariabledefinitionid',
        pageSize: 5000,
      },
      {
        entitySet: 'environmentvariablevalues',
        select: [
          'environmentvariablevalueid',
          '_environmentvariabledefinitionid_value',
          'value',
          'statecode',
        ],
        filter: `_environmentvariabledefinitionid_value eq ${definitionId} and statecode eq 0`,
        orderBy: 'environmentvariablevalueid',
        pageSize: 5000,
      },
    ]);
    expect(
      host
        .callsOf('downloadFileColumn')
        .map(({ entitySet, id, column }) => ({ entitySet, id, column })),
    ).toEqual(
      files.map((f) => ({
        entitySet: 'powerpagecomponents',
        id: f.powerpagecomponentid,
        column: 'filecontent',
      })),
    );
    expect(result).toMatchObject({
      scanId: 'connection:site:1',
      inventoryComplete: true,
      stopped: null,
      inactiveSettings: ['ServerLogic/TimeoutInSeconds'],
      settings: {
        ok: true,
        value: {
          'ServerLogic/AllowedDomains': { kind: 'value', raw: 'current.example', fromEnvVar: true },
        },
      },
      files: [
        { active: true, code: { ok: true, value: code } },
        { active: false, code: { ok: true, value: code } },
      ],
    });
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });

  it('returns a successful empty inventory without code downloads and with zero progress', async () => {
    const host = fixture([]);
    const progress = vi.fn<(scanned: number, total: number) => void>();
    const result = await runScan(host, connection, site, 'empty', progress);
    expect(result.files).toEqual([]);
    expect(result.inventoryComplete).toBe(true);
    expect(progress.mock.calls).toEqual([[0, 0]]);
    expect(host.callsOf('downloadFileColumn')).toHaveLength(0);
  });

  it('retains successfully listed inventory pages and marks the inventory incomplete on 403', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = fixture([file(0)]);
    const read = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({
        value: [file(0)],
        '@odata.nextLink': 'https://org.example/api/data/v9.2/powerpagecomponents?$skiptoken=x',
      })
      .mockRejectedValue({ status: 403 });
    const host: PptbHost = {
      ...base,
      queryAll: (q) =>
        q.filter === typeFilter(35)
          ? queryAllRows(q, { read, sleep: () => Promise.resolve() }, false)
          : base.queryAll(q),
    };
    const result = await runScan(host, connection, site, 'partial', () => undefined);
    expect(result).toMatchObject({
      inventoryComplete: false,
      stopped: null,
      files: [{ name: 'handler-0', code: { ok: true, value: code } }],
    });
  });

  it('retains inventory metadata on a network paging failure and skips future reads', async () => {
    const base = fixture([file(0)]);
    const host: PptbHost = {
      ...base,
      queryAll: () => Promise.reject(new HostReadError('network', null, true, [file(0)])),
    };
    const result = await runScan(host, connection, site, 'partial-loss', () => undefined);
    expect(result).toMatchObject({
      inventoryComplete: false,
      stopped: 'connection-lost',
      roles: { ok: false, reason: 'not-scanned' },
      files: [
        {
          roleIds: { ok: true, value: [roleId] },
          code: { ok: false, reason: 'not-scanned' },
        },
      ],
    });
    expect(base.callsOf('downloadFileColumn')).toHaveLength(0);
  });

  it.each([403, 503])('isolates configuration and code failures with status %s', async (status) => {
    const base = fixture([file(0), file(1)]);
    const host: PptbHost = {
      ...base,
      queryAll: (q) =>
        q.filter === typeFilter(11)
          ? Promise.reject(
              new HostReadError('failed', status, false, [component(roleId, 'Role', {})]),
            )
          : base.queryAll(q),
      downloadFileColumn: (set, id, column) =>
        id === file(0).powerpagecomponentid
          ? Promise.reject(new HostReadError('failed', status))
          : base.downloadFileColumn(set, id, column),
    };
    const result = await runScan(host, connection, site, 'failed-check', () => undefined);
    expect(result.roles).toEqual({ ok: false, reason: 'read-failed' });
    expect(result.permissions.ok).toBe(true);
    expect(result.settings.ok).toBe(true);
    expect(result.files.map((f) => f.code)).toEqual([
      { ok: false, reason: 'read-failed' },
      { ok: true, value: code },
    ]);
    expect(result.stopped).toBeNull();
  });

  it('treats malformed configuration as read failure, and preserves other inventory rows', async () => {
    const base = fixture();
    const host: PptbHost = {
      ...base,
      queryAll: (q) =>
        q.filter === typeFilter(35)
          ? Promise.resolve([file(0), { powerpagecomponentid: 'invalid' }, file(1)])
          : q.filter === typeFilter(18)
            ? Promise.resolve([{ ...component(roleId, 'Bad', {}), content: '{' }])
            : base.queryAll(q),
    };
    const result = await runScan(host, connection, site, 'bad-shape', () => undefined);
    expect(result.permissions).toEqual({ ok: false, reason: 'read-failed' });
    expect(result.files.map((f) => f.name)).toEqual(['handler-0', 'handler-1']);
    expect(result.inventoryComplete).toBe(false);
    expect(result.stopped).toBeNull();
  });

  it.each([401, null])(
    'keeps in-flight successful facts but starts no new reads after loss (%s)',
    async (status) => {
      const files = Array.from({ length: 8 }, (_, n) => file(n));
      const base = fixture(files);
      const first = deferred<string>();
      const late = deferred<string>();
      let downloads = 0;
      const host: PptbHost = {
        ...base,
        downloadFileColumn: () => {
          downloads += 1;
          return downloads === 1 ? first.promise : late.promise;
        },
      };
      const progress = vi.fn<(scanned: number, total: number) => void>();
      const scan = runScan(host, connection, site, 'loss', progress);
      await microtasks();
      expect(downloads).toBe(4);
      first.reject(new HostReadError('lost', status, status === null));
      await microtasks();
      late.resolve(code);
      const result = await scan;
      expect(downloads).toBe(4);
      expect(result.stopped).toBe('connection-lost');
      expect(result.roles.ok).toBe(true);
      expect(result.permissions.ok).toBe(true);
      expect(result.files.filter((f) => f.code.ok)).toHaveLength(3);
      expect(
        result.files.filter((f) => !f.code.ok && f.code.reason === 'not-scanned'),
      ).toHaveLength(5);
      expect(progress.mock.calls.at(-1)).toEqual([3, 8]);
    },
  );

  it('retains inline settings when an envvar query loses its connection', async () => {
    const base = fixture(
      [file(0)],
      [
        component(roleId, 'ServerLogic/Enabled', { source: 0, value: 'false' }),
        component(definitionId, 'ServerLogic/AllowedDomains', { source: 1, envvar_schema: 'lost' }),
      ],
    );
    const host: PptbHost = {
      ...base,
      queryAll: (q) =>
        q.entitySet === 'environmentvariabledefinitions'
          ? Promise.reject(new HostReadError('lost', 401))
          : base.queryAll(q),
    };
    const result = await runScan(host, connection, site, 'env-loss', () => undefined);
    expect(result.settings).toMatchObject({
      ok: true,
      value: {
        'ServerLogic/Enabled': { kind: 'value', raw: 'false', fromEnvVar: false },
        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
      },
    });
    expect(result.stopped).toBe('connection-lost');
  });

  it('keeps other settings after an envvar access failure', async () => {
    const base = fixture(
      [file(0)],
      [
        component(roleId, 'ServerLogic/Enabled', { source: 0, value: 'false' }),
        component(definitionId, 'ServerLogic/AllowedDomains', {
          source: 1,
          envvar_schema: 'denied',
        }),
      ],
    );
    const host: PptbHost = {
      ...base,
      queryAll: (q) =>
        q.entitySet === 'environmentvariabledefinitions'
          ? Promise.reject(new HostReadError('denied', 403))
          : base.queryAll(q),
    };
    const result = await runScan(host, connection, site, 'env-denied', () => undefined);
    expect(result.settings).toMatchObject({
      ok: true,
      value: {
        'ServerLogic/Enabled': { kind: 'value', raw: 'false', fromEnvVar: false },
        'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' },
      },
    });
    expect(result.stopped).toBeNull();
  });

  it('does no read if already aborted and suppresses queued reads when a scan is superseded', async () => {
    const controller = new AbortController();
    controller.abort();
    const base = fixture();
    await runScan(base, connection, site, 'already-aborted', () => undefined, {
      signal: controller.signal,
    });
    expect(base.calls).toHaveLength(0);
    const next = new AbortController();
    const late = deferred<string>();
    let downloads = 0;
    const host: PptbHost = {
      ...fixture(Array.from({ length: 8 }, (_, n) => file(n))),
      downloadFileColumn: () => {
        downloads += 1;
        return late.promise;
      },
    };
    const scan = runScan(host, connection, site, 'cancel', () => undefined, {
      signal: next.signal,
    });
    await microtasks();
    expect(downloads).toBe(4);
    next.abort();
    late.resolve(code);
    const result = await scan;
    expect(downloads).toBe(4);
    expect(result.files.filter((f) => !f.code.ok && f.code.reason === 'not-scanned')).toHaveLength(
      4,
    );
    expect(result.stopped).toBeNull();
  });

  it.each([11, 18, 9])(
    'marks only the failed configuration query as read-failed (type %s)',
    async (type) => {
      const base = fixture();
      const host: PptbHost = {
        ...base,
        queryAll: (q) =>
          (type === 9 ? q.filter === settingsFilter : q.filter === typeFilter(type))
            ? Promise.reject(new HostReadError('denied', 403))
            : base.queryAll(q),
      };
      const result = await runScan(
        host,
        connection,
        site,
        'configuration-failure',
        () => undefined,
      );
      expect(result.roles.ok).toBe(type !== 11);
      expect(result.permissions.ok).toBe(type !== 18);
      expect(result.settings.ok).toBe(type !== 9);
      expect(
        type === 11 ? result.roles : type === 18 ? result.permissions : result.settings,
      ).toEqual({ ok: false, reason: 'read-failed' });
      expect(result.files[0]?.code).toEqual({ ok: true, value: code });
      expect(result.stopped).toBeNull();
    },
  );

  it.each([403, 503, 401])(
    'classifies an environment-variable value read failure (%s)',
    async (status) => {
      const base = fixture(
        [file(0)],
        [
          component(roleId, 'ServerLogic/AllowedDomains', {
            source: 1,
            envvar_schema: 'value-failure',
          }),
        ],
      );
      const host: PptbHost = {
        ...base,
        queryAll: (q) =>
          q.entitySet === 'environmentvariablevalues'
            ? Promise.reject(new HostReadError('failed', status))
            : base.queryAll(q),
      };
      const result = await runScan(host, connection, site, 'env-value-failure', () => undefined);
      expect(result.settings).toMatchObject({
        ok: true,
        value: {
          'ServerLogic/AllowedDomains': {
            kind: status === 401 ? 'not-scanned' : 'envvar-unreadable',
          },
        },
      });
      expect(result.stopped).toBe(status === 401 ? 'connection-lost' : null);
    },
  );

  it('keeps downloaded empty code as successful evidence for the analysis-limit rule', async () => {
    const host: PptbHost = { ...fixture(), downloadFileColumn: () => Promise.resolve('') };
    const result = await runScan(host, connection, site, 'empty-code', () => undefined);
    expect(result.files[0]?.code).toEqual({ ok: true, value: '' });
    expect(result.stopped).toBeNull();
  });

  it('records a 50-record scan with injected virtual time and all reads capped at four', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T10:00:00.000Z'));
    const files = Array.from({ length: 50 }, (_, n) => file(n));
    const base = fixture(files);
    let active = 0;
    let peak = 0;
    const timed = async <T>(read: () => Promise<T>): Promise<T> => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      try {
        return await read();
      } finally {
        active -= 1;
      }
    };
    const host: PptbHost = {
      ...base,
      queryAll: (q) => timed(() => base.queryAll(q)),
      downloadFileColumn: (set, id, column) =>
        timed(() => base.downloadFileColumn(set, id, column)),
    };
    const scan = runScan(host, connection, site, 'fifty', () => undefined, {
      now: () => new Date(),
    });
    await vi.runAllTimersAsync();
    const result = await scan;
    expect(result.files.filter((f) => f.code.ok)).toHaveLength(50);
    expect(peak).toBe(4);
    const duration =
      new Date(result.finishedAt ?? '').getTime() - new Date(result.startedAt).getTime();
    console.info('Phase 15 virtual timing', {
      records: result.files.length,
      peakReads: peak,
      durationMs: duration,
    });
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/scan/scan.test.ts`

Expected at baseline: the two stub functions throw `not implemented: phase 15`. The initial 14-test scan suite failed all 14 in scratch. The seven additional configuration/env-value/empty-code cases extend the same missing behavior, giving the final 21-test suite below.

- [ ] **Step 3: Implement the minimum fix**

`src/features/inspector/scan/scan.ts`:

```ts
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, ODataQuery, PptbHost } from '@/services/pptb/host.types';
import { odataString } from '@/services/pptb/odataLiteral';
import type { Readable, ServerLogicFileFacts, SiteFacts, SiteRef } from '@/types/inspector';
import { mapLimit } from './pool';
import {
  collectSettings,
  parseDefinition,
  parseEnvironmentValue,
  parseFile,
  parsePermissions,
  parseRoles,
  parseSite,
  recordId,
} from './parseRecords';

const PAGE_SIZE = 5000;
const COMPONENT_SELECT = ['powerpagecomponentid', 'name', 'statecode', 'content'] as const;

export type ScanOptions = { now?: () => Date; signal?: AbortSignal };

function componentQuery(siteId: string, type: number): ODataQuery {
  return {
    entitySet: 'powerpagecomponents',
    select: COMPONENT_SELECT,
    filter: `_powerpagesiteid_value eq ${recordId(siteId)} and powerpagecomponenttype eq ${String(type)}`,
    orderBy: 'powerpagecomponentid',
    pageSize: PAGE_SIZE,
  };
}

export async function listSites(host: PptbHost): Promise<readonly SiteRef[]> {
  const rows = await host.queryAll({
    entitySet: 'powerpagesites',
    select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
    filter: null,
    orderBy: 'powerpagesiteid',
    pageSize: PAGE_SIZE,
  });
  return rows.map(parseSite);
}

export async function runScan(
  host: PptbHost,
  connection: Connection,
  site: SiteRef,
  scanId: string,
  onProgress: (scanned: number, total: number) => void,
  options: ScanOptions = {},
): Promise<SiteFacts> {
  const now = options.now ?? (() => new Date());
  const files: ServerLogicFileFacts[] = [];
  const facts: SiteFacts = {
    scanId,
    site,
    connection,
    startedAt: now().toISOString(),
    finishedAt: null,
    roles: { ok: false, reason: 'not-scanned' },
    permissions: { ok: false, reason: 'not-scanned' },
    settings: { ok: false, reason: 'not-scanned' },
    inactiveSettings: [],
    files,
    inventoryComplete: false,
    stopped: null,
  };
  let scanned = 0;
  const stopped = () => options.signal?.aborted === true || facts.stopped !== null;

  function readFailure(error: unknown): 'read-failed' | 'not-scanned' {
    if (options.signal?.aborted === true) return 'not-scanned';
    if (error instanceof HostReadError && (error.status === 401 || error.transport)) {
      facts.stopped = 'connection-lost';
      return 'not-scanned';
    }
    return 'read-failed';
  }

  async function read<T>(op: () => Promise<T>): Promise<Readable<T>> {
    if (stopped()) return { ok: false, reason: 'not-scanned' };
    try {
      return { ok: true, value: await op() };
    } catch (error) {
      return { ok: false, reason: readFailure(error) };
    }
  }

  let inventory: readonly unknown[] = [];
  if (!stopped()) {
    try {
      inventory = await host.queryAll(componentQuery(site.id, 35));
      facts.inventoryComplete = true;
    } catch (error) {
      readFailure(error);
      if (error instanceof HostReadError) inventory = error.partialRows;
    }
  }
  for (const row of inventory) {
    try {
      files.push(parseFile(row));
    } catch {
      facts.inventoryComplete = false;
    }
  }
  onProgress(0, files.length);

  const jobs: (() => Promise<void>)[] = [
    async () => {
      facts.roles = await read(async () =>
        parseRoles(await host.queryAll(componentQuery(site.id, 11))),
      );
    },
    async () => {
      facts.permissions = await read(async () =>
        parsePermissions(await host.queryAll(componentQuery(site.id, 18))),
      );
    },
    async () => {
      const q = componentQuery(site.id, 9);
      const settings = await read(async () =>
        collectSettings(
          await host.queryAll({
            ...q,
            filter: `${q.filter ?? ''} and contains(name,${odataString('serverlogic/')})`,
          }),
        ),
      );
      if (!settings.ok) {
        facts.settings = settings;
        return;
      }
      const collected = settings.value;
      facts.inactiveSettings = collected.inactiveSettings;
      facts.settings = { ok: true, value: collected.values };
      for (const { name, schema } of collected.pending) {
        const definitions = await read(() =>
          host.queryAll({
            entitySet: 'environmentvariabledefinitions',
            select: [
              'environmentvariabledefinitionid',
              'schemaname',
              'type',
              'defaultvalue',
              'statecode',
            ],
            filter: `schemaname eq ${odataString(schema)} and statecode eq 0`,
            orderBy: 'environmentvariabledefinitionid',
            pageSize: PAGE_SIZE,
          }),
        );
        if (!definitions.ok) {
          collected.values[name] = {
            kind: definitions.reason === 'not-scanned' ? 'not-scanned' : 'envvar-unreadable',
          };
          continue;
        }
        const definition = parseDefinition(definitions.value);
        if (definition === null) {
          collected.values[name] = { kind: 'envvar-unreadable' };
          continue;
        }
        const values = await read(() =>
          host.queryAll({
            entitySet: 'environmentvariablevalues',
            select: [
              'environmentvariablevalueid',
              '_environmentvariabledefinitionid_value',
              'value',
              'statecode',
            ],
            filter: `_environmentvariabledefinitionid_value eq ${definition.id} and statecode eq 0`,
            orderBy: 'environmentvariablevalueid',
            pageSize: PAGE_SIZE,
          }),
        );
        collected.values[name] = values.ok
          ? parseEnvironmentValue(values.value, definition)
          : { kind: values.reason === 'not-scanned' ? 'not-scanned' : 'envvar-unreadable' };
      }
    },
    ...files.map((file) => async () => {
      file.code = await read(() =>
        host.downloadFileColumn('powerpagecomponents', file.id, 'filecontent'),
      );
      if (file.code.ok || file.code.reason === 'read-failed') {
        scanned += 1;
        onProgress(scanned, files.length);
      }
    }),
  ];
  await mapLimit(jobs, 4, (job) => job());
  facts.finishedAt = now().toISOString();
  return facts;
}
```

In `src/skeleton.test.ts`, immediately after the scan import, add the type import:

```ts
import { listSites, runScan } from '@/features/inspector/scan/scan';
import type { ScanOptions } from '@/features/inspector/scan/scan';
```

In the `expectTypeOf(runScan).toEqualTypeOf<...>` parameters, add `options`:

```ts
        scanId: string,
        onProgress: (scanned: number, total: number) => void,
        options?: ScanOptions,
      ) => Promise<SiteFacts>
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/scan/scan.test.ts`

Expected: 21 passed tests. The deterministic performance case prints `Phase 15 virtual timing { records: 50, peakReads: 4, durationMs: 1500 }`. Treat 1500 ms as fixture scheduling evidence only.

Run: `npx vitest run src/features/inspector/scan src/services/pptb/odataLiteral.test.ts src/services/pptb/hostReadPartial.test.ts src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/skeleton.test.ts`

Expected: scan, transport and pinned-contract tests pass. Every query uses selected primary-key order; partial configuration is failed evidence, while partial inventory is visible.

Run: `npx tsc -b`

Expected: exit 0, including the optional sixth-argument contract and strict unknown-value narrowing.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/features/inspector/scan/scan.ts src/features/inspector/scan/scan.test.ts src/skeleton.test.ts
git commit -m "feat(inspector): scan sites with partial evidence"
```

## Integration verification

Run after all four tasks in the implementation checkout:

```powershell
npx tsc -b
npx eslint . --max-warnings=0
npx prettier --check src/features/inspector/scan src/services/pptb/odataLiteral.ts src/services/pptb/odataLiteral.test.ts src/services/pptb/host.types.ts src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/hostReadPartial.test.ts src/skeleton.test.ts
npx vitest run
npx vite build
```

Expected: typecheck, lint, changed-file formatting, full Vitest and single-IIFE build pass. Also run `npx prettier --check .` and record its result; this planning baseline has 176 pre-existing formatting failures, so it is an explicit repository-wide exception, not permission to rewrite unrelated files.

◆ After Phase 23, use the S2-approved adapter in PPTB on the development site. Record the number of server logic files, request count/peak reads, start/finish timestamps, successful statuses, and elapsed seconds for up to 50 files. Expected: all known files appear, inactive files are checked, “Scanned X of N” updates, no more than four reads, and elapsed time ≤30 s. Force a later inventory page failure and a mid-download network/sign-in failure: inventory-incomplete and connection-lost states must differ, facts already read stay visible, future evidence is Not scanned, and rescan replaces the old ID. Repeat a 403 and exhausted 5xx: only affected findings are read-failed.

◆ If S2 contradicts paging, file response or error status shape, execute Phase 12's decision table first and repeat Task 1/Task 4 tests with the observed shape. A prohibited transport is a spec/rules stop, never an inferred authorization to use `execute`.

## Verified while planning

Scratch root: `C:/Users/RyanDev/source/repos/Server Logic/.scratch/inspector-plan`; primary baseline `42c2809`, branch `001-logic-inspector`. Dates below are 2026-10-22. Scratch code proves the documented implementations; the primary checkout contains this phase document only.

| Evidence class | Check | Observed result |
| --- | --- | --- |
| Source | S1 artifacts and current Phase 01 code inspected before edits | Real lookup/filter/content keys used; `queryAll` partial-row loss traced to its authoritative paging owner. |
| RED tests | Task 1, Task 2, Task 3, initial Task 4 | Seven failed partial-error tests; absent literal/pool/parser imports; both scan stubs made all initial 14 scan tests fail. |
| Focused tests | `npx vitest run src/features/inspector/scan src/services/pptb/odataLiteral.test.ts src/services/pptb/hostReadPartial.test.ts src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/skeleton.test.ts` | 9 files, 170 tests passed after the two missing-role-flag regressions changed from RED to GREEN. |
| Scheduling | Injected 50-record fixture, 100 ms per read | 50 code reads completed; peak 4; printed 1500 ms virtual interval. No wall-clock or live-host claim. |
| Typecheck | `npx tsc -b` | Exit 0 after the shared Phase 11 contract and skeleton optional-argument update. |
| Lint | Targeted scan, transport edits and `src/skeleton.test.ts`, `--max-warnings=0` | Exit 0. |
| Formatting | Same changed files, `npx prettier --check` | All matched files use Prettier code style. |
| Full integration | Full Vitest, full lint and Vite build | The assembled gate is recorded in `plan-inspector.md` after sibling drafts settle. This phase's final local evidence is the 170-test focused run above; it does not claim the pending assembled rerun as passed. |
| Formatting exception | Primary baseline `npx prettier --check .` | 176 pre-existing files fail. No unrelated formatting changes are included. |
| Rendered browser | Phase 23 UI against these facts | ◆ Separate UI acceptance; this reader phase has no rendered surface. |
| Live PPTB | S2 read shapes, 50-record ≤30 s, loss/403 smoke | ◆ Unverified until the owner records Phase 12 and the release smoke. |

## Done when

- [ ] Source: Tasks 1–4 are implemented with the seven documented contract amendments owned in `plan-starter.md`; no second settings interpretation, query pool or paging mechanism exists.
- [ ] Tests/build: focused cases, pinned signatures, whole-tree typecheck/lint, changed-file formatting, full Vitest and IIFE build pass, with the known broad formatting exception recorded.
- [ ] Rendered browser: Phase 23 proves the known/incomplete inventory, progress, per-check failure and Not scanned states from this reader's facts.
- [ ] Live PPTB: ◆12 evidence approves the adapter; owner-run site scan and interruption scenarios pass, including the ≤30 s budget. A virtual fixture does not complete this gate.
