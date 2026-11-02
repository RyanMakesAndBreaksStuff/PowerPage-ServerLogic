# P5.4 plan — Implement the real site reader

**Date:** 2026-11-02
**Baseline:** branch `logic-inspector-v2-build`, HEAD `071415c`; P5.1, P5.2 (`bae8611`) and P5.3 (`85de3ff`) are executed. The checkout has 95 test files and 1504 tests (P5.3 evidence).
**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v4.1.0, FR-7 (L623–L682), AC-7.2, AC-7.3, AC-7.4, AC-7.7, AC-7.8, AC-7.10, AC-7.12, FR-8 "Not scanned", Error Scenarios L926–L928, and the 4.2.0 amendments this plan makes (R-14 option B, R-15 option B).
**Audit items:** CR-002 (reader half), WR-003 (reader half), RG-001/RG-003/RG-004 evidence producer (the live runs stay open).
**Status:** Accepted by the owner 2026-11-02 (R-06 revised, R-14 B, R-15 B); not yet executed.
**Supersedes:** Task 5 of `docs/plans/11-01-2026-phase-5-transport-reader.md` (L1462–L2495). That draft is reference only; its defects (a non-existent `isAbortError`, a pre-flight identity throw and `ScanConfirmationError`, `localeCompare` re-sorting, `%27` pre-encoding, one bad setting row failing every setting, serial config reads) are not repeated.

## Goal

Replace the two throwing stubs in `src/features/inspector/scan/scan.ts` with a reader that uses only the P5.2 adapter (`PptbHost.queryAll`, `downloadFileColumn`, `HostReadError`) and returns the `SiteFacts` the P5.3 model already consumes. It lists sites, reads a site's Server Logic, web-role, table-permission and site-setting components, resolves environment-variable settings (never reading a Secret value), downloads every handler file, keeps completed evidence and partial inventory, marks unread evidence Not scanned on connection loss, honours a caller `AbortSignal`, keeps at most four requests in flight, and reconfirms the active connection before accepting the result. Nothing under `src/services/pptb/` changes; the model changes only for the two owner decisions of 2026-11-02 (R-13 to R-15): a site banner names the role and permission rows the reader skipped as unreadable (findings are graded from the readable rows), and environment-variable failures carry a cause.

## Decisions adopted (the owner approves these with the plan)

| ID | Decision |
|---|---|
| R-01 | **Signature change.** `runScan(host, connection, site, scanId, onProgress, options?)` with `onProgress: (progress: ScanProgress) => void`, `ScanProgress = { scanned: number; total: number; inventoryComplete: boolean }` (added to `src/types/inspector.ts`) and `options?: { signal?: AbortSignal; now?: () => Date }`. `src/skeleton.test.ts` L131–L139 pins the old five-parameter shape with `toEqualTypeOf`; Phase C1 updates that pin deliberately. `listSites(host)` keeps its signature. `src/types/contracts.test.ts` pins `SiteFacts['stopped']` to `'connection-lost' \| null`; unchanged. |
| R-02 | **Cancellation.** `options.signal` reaches every `queryAll` and `downloadFileColumn` call (through an internal controller that also carries R-03's abort). When the caller's signal is aborted, `runScan` rejects with the adapter's `DOMException` named `AbortError` (P5.2 T3-02: cancellation exists only when **our** signal is aborted). Cancellation is never stored in `SiteFacts.stopped`. `listSites` keeps its pinned one-parameter signature, so it has no signal: P5.5 cancels a site-list load by discarding its result, and may add an optional second parameter later without breaking the pin. |
| R-03 | **Connection loss.** A `HostReadError` with `transport === true` or `status === 401` from any read is connection loss (AC-7.10): `stopped: 'connection-lost'`, the internal controller aborts so no further request starts, completed facts are kept, and everything unread is Not scanned: `Readable` `{ ok: false, reason: 'not-scanned' }`, per-setting `{ kind: 'not-scanned' }`, and `code: { ok: false, reason: 'not-scanned' }` for files not yet downloaded, **including the file whose download raised the loss**. Any other `HostReadError` (403, 404, exhausted 429/5xx, protocol or shape) is a `read-failed` for that one fact; the scan continues. A request in flight when the loss is detected is aborted by our own signal and also reads as Not scanned. |
| R-04 | **Partial inventory.** Only the type-35 inventory consumes `HostReadError.partialRows`: they are parsed, `inventoryComplete` becomes `false`, and those files are still scanned (unless the failure was connection loss, when R-03 applies as well). A partially paged roles, permissions or settings list becomes `read-failed` (the model has no partial variant). `listSites` rethrows its `HostReadError` unchanged (the "Couldn't load sites" + Retry state is P5.5) and never returns an empty list on failure. |
| R-05 | **Concurrency.** One scan-private limiter (`createLimiter(4)` in `scan/limiter.ts`: `run<T>(task): Promise<T>` over a FIFO queue that hands a finishing task's slot straight to the next waiter) gates every `queryAll` and `downloadFileColumn` call. Each adapter call keeps one request in flight at a time (pages and blocks are sequential inside the call), so gating whole calls bounds requests at 4. Schedule: the four component queries (35, 11, 18, 9) start together; file downloads start as soon as the inventory is parsed; environment-variable definition reads, then value reads, queue behind them through the same limiter. No nested pool. |
| R-06 | **OData literals** follow FR-7 L632 exactly: `odataString(value)` doubles each `'`, percent-encodes the result with `encodeURIComponent`, and wraps it in `'…'` (so `a&b` is `'a%26b'`, a space is `%20`, and `'` stays `''`, which is how OData reads the doubling). Control characters raise a `RangeError` (the adapter rejects them anyway and a schema name never contains them). Evidence that the PPTB host builds the request URL from the path as given, so the caller must encode: mxrm-fetchxml-studio `src/features/fetchxml/api/odata.ts` (dev, 2026-11-02) and its issues #173/#176. GUIDs are validated with `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` and inserted bare; spaces around `eq` and `and` stay raw, as in P5.2. RG-001's live probe now only confirms wire fidelity; spec and code agree. |
| R-07 | **Queries.** Sites: `powerpagesites`, select `powerpagesiteid,name,primarydomainname,statecode`, no filter, orderBy `name,powerpagesiteid`, pageSize 5000. Components: `powerpagecomponents`, select `powerpagecomponentid,name,content,statecode,powerpagecomponenttype`, filter `_powerpagesiteid_value eq <guid> and powerpagecomponenttype eq <35\|11\|18\|9>`, orderBy `name,powerpagecomponentid`, pageSize 5000. Site settings: **all** type-9 rows of the site (no name-prefix filter), matched with the existing `normalizeSettingName`; only `statecode` 0 rows count; two active matches are `{ kind: 'duplicate' }`; inactive matches are listed in `inactiveSettings`. Environment variables: `environmentvariabledefinitions` (select `environmentvariabledefinitionid,schemaname,type,defaultvalue`, filter `schemaname eq <odataString(schema)>`, orderBy `environmentvariabledefinitionid`), then `environmentvariablevalues` (select `environmentvariablevalueid,value`, filter `_environmentvariabledefinitionid_value eq <guid> and statecode eq 0`, orderBy `environmentvariablevalueid`). Exactly one definition row is expected. A failure is `{ kind: 'envvar-unreadable', cause }` with the cause of R-15; Type `100000005` (Secret) is `secret` with **no** value query. The value is the first value row's string `value`, else the definition's string `defaultvalue`, else `missing`. A connection loss on either read is `not-scanned` plus `stopped` (R-03). Order comes from the server `$orderby`; there is no client re-sort. |
| R-08 | **Parsing at the boundary.** `scan/parseRecords.ts` validates every row with hand-written guards (`unknown` in, domain types out, no `as`). `content` is a JSON string parsed per type. Type 11: `anonymoususersrole` and `authenticatedusersrole` default to `false` when absent. Type 18: `scope` 756150000…756150004 maps to `'Global'\|'Contact'\|'Account'\|'Parent'\|'Self'`, anything else or missing is `null`; privileges come from the six booleans (`read`→`Read`, `write`→`Write`, `create`→`Create`, `delete`→`Delete`, `append`→`Append`, `appendto`→`AppendTo`); `roleIds` from `adx_entitypermission_webrole` (absent → `[]`); `parentId` from `parententitypermission` (absent → `null`); `table` from `entitylogicalname`. Type 35: `roleIds` from `adx_serverlogic_adx_webrole` (`{ ok: true, value }`; absent → `{ ok: true, value: [] }`; unparseable content or a malformed link → `{ ok: false, reason: 'read-failed' }`), `name` as stored. Type 9: a matched `ServerLogic/*` row with `source` 1 and a string `envvar_schema` takes the environment-variable path; otherwise `{ kind: 'value', raw: <content.value if a string, else ''>, fromEnvVar: false }`, so a malformed row is a per-setting "Couldn't interpret", never a whole-settings failure. A type-35 row whose `powerpagecomponentid`, `name` or `statecode` fails validation is skipped and counted in the `skipped` field `parseServerLogic` returns; any skip sets `inventoryComplete: false`. |
| R-09 | **File download.** `downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: id, fileAttributeName: 'filecontent' }, signal)` per file, all files including inactive ones, no cap. Success is `code: { ok: true, value: text }` (an empty string is readable empty code). A non-loss failure is `{ ok: false, reason: 'read-failed' }`. Progress: `onProgress` is called once after the inventory with `{ scanned: 0, total: files.length, inventoryComplete }`, then after each file's download settles with the running count. A file never requested, or interrupted by connection loss, is not counted as scanned, so "Scanned X of N" never over-reports. |
| R-10 | **Identity reconfirmation.** After all reads settle, `runScan` calls `host.getActiveConnection()`. A result of `null`, or a connection whose `id` or `url` differs from the `connection` argument, rejects with `new ScanAbandonedError(...)` (exported from `scan.ts`, `extends Error`, name `'ScanAbandonedError'`). A rejected call is transient: the result is accepted (P5.5 owns the last confirmed identity) and a fixed `console.error` line records it. There is no pre-flight check. |
| R-11 | **Timestamps and ID.** `startedAt = now().toISOString()` before the first read; `finishedAt = now().toISOString()` after the reconfirmation; `now` defaults to `() => new Date()`. `scanId` is stored as given. |
| R-12 | **Tests only through the fake.** Tests use `createFakeHost`. It ignores `$select` and `$filter`, so the test responder filters by `q.entitySet` and parses `powerpagecomponenttype eq N`, the schema literal and the definition id out of `q.filter`. Scripted `failures` fire before responders. The file key is `powerpagecomponent/<guid>/filecontent`. The fake has no delay or in-flight counter, so the concurrency, cancellation and 401-ordering tests wrap it in a gate that holds each call on a deferred promise and counts overlap. |
| R-13 | No new runtime dependencies; nothing under `src/services/pptb/` changes. **Relaxed 2026-11-02** (with R-14 and R-15): P5.4 may edit `src/features/inspector/model/rules.ts`, `copy.ts`, `settings.ts` and `fixtures.ts`, and `report/reportFixtures.ts`, only for the skipped-row banner and environment-variable causes; `checks.ts` is not edited. |
| R-14 | **Unreadable role and permission rows (owner decision, option B, 2026-11-02).** A type 11 or 18 row whose envelope, `content` JSON or required keys (`entitylogicalname`, the flags, the link arrays) fail validation is skipped, the readable rows stay in the list, and `SiteFacts` gains `unreadableRows: readonly UnreadableRow[]` with `UnreadableRow = { type: 11 \| 18; id: string; name: string }` (id and name as far as they could be read, `''` otherwise) recording what was skipped. The model grades Web role and Table permissions from the readable rows exactly as before: `checks.ts` is not edited, no finding gains `hasUnscannedEvidence` or a detail line, and a finding stays reviewable as today (FR-8 precedence and AC-8.11 are not amended). The site gets one banner naming the skipped rows, in row order, with the id when a name is empty: "1 web role or table permission row couldn't be read and was skipped: `broken-role`. Findings were graded without it; fix the row and rescan." for one row, or "2 web role or table permission rows couldn't be read and were skipped: `broken-role`, `broken-perm`. Findings were graded without them; fix the rows and rescan." for several. Banners already flow into every export, so the banner is repeated there. Accepted cost: a skipped row can hide evidence (a role's anonymous flag, a permission's Global grant), so a Configured finding on that site may be unsound; the banner says so by naming the rows and telling the reader to fix them and rescan. A failed read of the whole list stays `read-failed` (R-04). Other boundary rules: a permission whose `entitylogicalname` is missing or not a string is an unreadable row, never `table: ''`; a site row that cannot be read makes `listSites` reject with a `HostReadError`; a row whose name matches a `ServerLogic/*` setting but whose id or state cannot be read makes the settings list `read-failed` (the duplicate count cannot be trusted), and rows with other names are ignored whatever else they hold. Spec: amended in 4.2.0 (C2). |
| R-15 | **Environment-variable causes (owner decision, option B, 2026-11-02).** `SettingValue`'s `{ kind: 'envvar-unreadable' }` becomes `{ kind: 'envvar-unreadable'; cause: 'secret' \| 'missing' \| 'denied' \| 'failed' }`. `secret` is a definition of type 100000005. `missing` is no definition row, or no value row and no `defaultvalue`. `denied` is a `HostReadError` with status 403 on either read. `failed` is anything else: an ambiguous or unreadable definition, an unusable schema name, any other `HostReadError`. The reader sets the cause; `settings.ts` `unavailable()` and the snapshot line render four texts through one function (`envVarFailureText` in `copy.ts`): secret "Couldn't read `<setting>`: its environment variable is a secret"; missing "Couldn't read `<setting>`: its environment variable isn't defined or has no value"; denied "Couldn't read `<setting>`: access to its environment variable was denied"; failed "Couldn't read `<setting>` from its environment variable". All four keep `readFailure: true`; `not-scanned` stays the distinct unscanned case. The reader logs no cause line because the cause is in the type. Spec: FR-7 L658 amended in 4.2.0 (C2). |

## Spec items missing from the build (gap table)

| # | Spec item | Current code (verbatim) | Gap |
|---|---|---|---|
| G1 | FR-7 end-to-end facts path (CR-002) | `scan.ts` L4–L12 `export function runScan(` … `  throw new Error('not implemented: phase 15');` L14–L16 `export function listSites(_host: PptbHost): Promise<readonly SiteRef[]> {` `  throw new Error('not implemented: phase 15');` | Both functions are stubs; nothing reads a site. |
| G2 | Scan contract: progress, signal, clock | `scan.ts` L9 `  _onProgress: (scanned: number, total: number) => void,` `skeleton.test.ts` L137 `        onProgress: (scanned: number, total: number) => void,` | No way to say "N is only the discovered set", no signal and no clock. The pin forces a deliberate update (R-01). |
| G3 | Brief: `Scanned X of N` with incomplete-inventory context | `src/types/inspector.ts` L48–L50 `  stopped: 'connection-lost' \| null;` `};` `export type CheckId = 'webRole' \| 'tablePermissions' \| 'outbound';` | No `ScanProgress` type. |
| G4 | FR-7 "write every string value as an OData literal" | `dataverseRead.ts` L38–L39 `    if (UNSAFE_CLAUSE.test(q.filter)) throw invalid('filter');` `    parts.push(\`$filter=${q.filter}\`);` | The adapter inserts the filter verbatim and does not escape quotes; no encoder exists anywhere in `src/` (searched 2026-11-01). Callers own the literal (R-06). |
| G5 | FR-7 "at most 4 reads in flight" | `dataverseRead.ts` L119 `      const page = await readPage(path);` `dataverseFiles.ts` L91 `  for (let offset = 0; offset < initial.size; ) {` L94 `    const block = await withRetry(` | Pages and blocks are sequential inside one adapter call, so one limiter around whole calls is the only budget needed; no limiter exists. |
| G6 | WR-003 consumer | `host.types.ts` L24 `    readonly partialRows: readonly unknown[] = [],` | Nothing reads `partialRows` yet. |
| G7 | R-02 consumer | `hostErrors.ts` L59–L60 `export function throwIfAborted(signal: AbortSignal \| undefined): void {` `  if (signal?.aborted === true) throw new DOMException('Scan cancelled.', 'AbortError');` | No caller passes a signal to `queryAll` or `downloadFileColumn`. |
| G8 | FR-7 setting-name matching | `settings.ts` L19–L22 `export function normalizeSettingName(raw: string): SettingName \| null {` `  const name = raw.trim().toLowerCase();` `  return SETTING_NAMES.find((candidate) => candidate.toLowerCase() === name) ?? null;` | Exists and is reused; the reader must hand it every type-9 row of the site. |
| G9 | Paging fails closed | `dataverseRead.ts` L124 `      } else if (strict && page.rows.length >= q.pageSize) {` | While `NEXT_LINK_UNVERIFIED` is true a page of exactly `pageSize` rows with no link is a failure. The 5000 page size and the `HostReadError.partialRows` rule (R-04) are what keep that survivable. |

| G10 | R-14: no way to say a row was lost | `rules.ts` L41–L44 ``      ...settingBanners(facts),`` ``      ...defaultRoleBanners(facts),`` and `types/inspector.ts` L47–L48 ``  inventoryComplete: boolean;`` ``  stopped: 'connection-lost' \| null;`` | `SiteFacts` has no field for skipped rows and the site has no banner for them, so a corrupt role or permission could only be dropped silently or fail a whole list. |
| G11 | R-15: no cause on the environment-variable failure | `types/inspector.ts` L26 ``  \| { kind: 'envvar-unreadable' } // secret type, missing variable or failed read`` `settings.ts` L40 ``      [{ text: `Couldn't read \`${name}\` from its environment variable`, readFailure: true }],`` and L154–L155 ``    if (setting.kind === 'envvar-unreadable')`` ``      return `Couldn't read \`${name}\` from its environment variable`;`` | One kind and one text for secret, missing, denied and failed. |
| G12 | Spec text to amend | `spec.md` L658 "A Secret-type variable (`type` 100000005), a missing variable or a failed read is Needs review "Couldn't read `<setting>` from its environment variable" on the check that uses it." | The spec has one text and no skipped-row rule (C2). |

Existing behaviour that must not change: the P5.3 model outputs whatever `unreadableRows` holds (only the banners gain an entry) and when the cause is `failed` (the 64-state table, wildcard ordering, snapshot ownership), `Readable` shapes, `HostReadError` fields, `PptbHost` methods, and `createFakeHost`.

## Files

| Action | Path |
|---|---|
| Create | `src/features/inspector/scan/limiter.ts`, `limiter.test.ts` |
| Create | `src/features/inspector/scan/queries.ts`, `queries.test.ts` |
| Create | `src/features/inspector/scan/parseRecords.ts`, `parseRecords.test.ts` |
| Create | `src/features/inspector/scan/scan.test.ts` |
| Create | `src/features/inspector/model/unreadableRows.test.ts`, `envvarCause.test.ts` |
| Replace | `src/features/inspector/scan/scan.ts` (16 lines → full reader) |
| Edit | `src/types/inspector.ts` (`EnvVarCause`, the `envvar-unreadable` cause, `UnreadableRow`, `SiteFacts.unreadableRows`, `ScanProgress`) |
| Edit | `src/features/inspector/model/copy.ts`, `settings.ts`, `rules.ts`, `fixtures.ts` (R-13/R-14/R-15 only; `checks.ts` is not edited) |
| Edit | `src/features/inspector/report/reportFixtures.ts` (one field in the `SiteFacts` literal) |
| Edit | `src/features/inspector/model/checks.test.ts`, `evidence.test.ts`, `settings.test.ts` (ten `envvar-unreadable` literals gain `cause: 'failed'`; no expectation changes) |
| Edit | `src/skeleton.test.ts` (the `runScan` pin and one type import) |
| Edit | `docs/specs/001-server-logic-starter-inspector/spec.md` (4.2.0: version header, change-log row, FR-7 L658, a new FR-7 bullet) |
| Create | `docs/phase-5/evidence/p5-4/execution.md` (C6) |

Goldens: `src/features/inspector/report/__golden__/file.md` and `site.md` render the fixture's literal `detail` and banners, which contain no environment-variable text and no skipped-row banner, so neither changes (the full suite passes unchanged against them).

---

## Execution convention

The working tree uses CRLF and `core.autocrlf` is `true`. New files in this plan are pasted whole and saved with CRLF endings. Anchored edits (the diffs in B1 and B6, the C1 pin) are written as LF blocks: match each anchor line by line ignoring `\r`, or normalise the file to LF, apply the edit and convert it back; the edited file must end up CRLF throughout. The spec file is LF; keep it LF. `git diff --check` in C4 fails on a mixed result. The pin in C1 is type-level, so Vitest does not prove it; `npm run typecheck` in C4 does.

---

## Phase A — Failing tests

**Files:** create `src/features/inspector/scan/limiter.test.ts`, `queries.test.ts`, `parseRecords.test.ts`, `scan.test.ts` and `src/features/inspector/model/unreadableRows.test.ts`, `envvarCause.test.ts`.

- [ ] **A1. Create `src/features/inspector/scan/limiter.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { createLimiter } from './limiter';

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  const holder: { resolve: () => void } = { resolve: () => undefined };
  const promise = new Promise<void>((resolve) => {
    holder.resolve = resolve;
  });
  return { promise, resolve: () => { holder.resolve(); } };
}

describe('createLimiter', () => {
  it('rejects a limit that is not a positive whole number', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => createLimiter(bad)).toThrow(RangeError);
    }
  });

  it('returns each task result', async () => {
    const limiter = createLimiter(2);
    await expect(limiter.run(() => Promise.resolve('a'))).resolves.toBe('a');
  });

  it('never runs more than the limit and starts waiting tasks in arrival order', async () => {
    const limiter = createLimiter(2);
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    const started: number[] = [];
    const running = { now: 0, peak: 0 };
    const results = gates.map((gate, index) =>
      limiter.run(async () => {
        started.push(index);
        running.now += 1;
        running.peak = Math.max(running.peak, running.now);
        await gate.promise;
        running.now -= 1;
        return index;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    gates[0]?.resolve();
    await expect(results[0]).resolves.toBe(0);
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);
    for (const gate of gates) gate.resolve();
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(running.peak).toBe(2);
  });

  it('frees the slot when a task rejects', async () => {
    const limiter = createLimiter(1);
    const failing = limiter.run(() => Promise.reject(new Error('boom')));
    const next = limiter.run(() => Promise.resolve('after'));
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('after');
  });
});
```

- [ ] **A2. Create `src/features/inspector/scan/queries.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { buildQueryPath } from '@/services/pptb/dataverseRead';
import {
  COMPONENT_TYPE,
  componentQuery,
  definitionQuery,
  odataGuid,
  odataString,
  SITES_QUERY,
  valueQuery,
} from './queries';

const SITE = '0A1B2C3D-0000-4000-8000-000000000001';
const DEFINITION = '0a1b2c3d-0000-4000-8000-000000000002';

describe('odataString', () => {
  it.each([
    ['plain', "'plain'"],
    ["O'Brien", "'O''Brien'"],
    ["'", "''''"],
    ['', "''"],
    ['has space', "'has%20space'"],
    ['a&b#c', "'a%26b%23c'"],
    ['100%', "'100%25'"],
    ['a+b', "'a%2Bb'"],
    ["it's a&b", "'it''s%20a%26b'"],
  ])('writes %j as %s', (value, literal) => {
    expect(odataString(value)).toBe(literal);
  });

  it.each(['a\nb', 'a\tb', 'a\u0000b', 'a\ud800b'])('refuses %j', (value) => {
    expect(() => odataString(value)).toThrow(RangeError);
  });
});

describe('odataGuid', () => {
  it('inserts a GUID bare, whatever its case', () => {
    expect(odataGuid(SITE)).toBe(SITE);
  });

  it.each(['', 'not-a-guid', `${SITE}'`, `'${SITE}'`, `${SITE} or 1 eq 1`])('refuses %j', (value) => {
    expect(() => odataGuid(value)).toThrow(RangeError);
  });
});

describe('query builders', () => {
  it('lists sites with an explicit select and a deterministic order', () => {
    expect(buildQueryPath(SITES_QUERY)).toBe(
      'powerpagesites?$select=powerpagesiteid,name,primarydomainname,statecode&$orderby=name,powerpagesiteid',
    );
  });

  it.each([
    ['serverLogic', 35],
    ['webRole', 11],
    ['tablePermission', 18],
    ['siteSetting', 9],
  ] as const)('reads every %s row of the site and nothing else', (key, type) => {
    expect(COMPONENT_TYPE[key]).toBe(type);
    expect(buildQueryPath(componentQuery(SITE, COMPONENT_TYPE[key]))).toBe(
      'powerpagecomponents?$select=powerpagecomponentid,name,content,statecode,powerpagecomponenttype' +
        `&$filter=_powerpagesiteid_value eq ${SITE} and powerpagecomponenttype eq ${String(type)}` +
        '&$orderby=name,powerpagecomponentid',
    );
  });

  it('reads site settings without a name filter', () => {
    expect(componentQuery(SITE, COMPONENT_TYPE.siteSetting).filter).not.toContain('ServerLogic');
  });

  it('writes the environment-variable schema name as an escaped literal', () => {
    expect(buildQueryPath(definitionQuery("cfg_O'Brien"))).toBe(
      'environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,type,defaultvalue' +
        "&$filter=schemaname eq 'cfg_O''Brien'&$orderby=environmentvariabledefinitionid",
    );
  });

  it('encodes a schema name that needs it and still passes the adapter check', () => {
    expect(buildQueryPath(definitionQuery('a b&c'))).toContain("$filter=schemaname eq 'a%20b%26c'&");
  });

  it('reads only active values of one definition', () => {
    expect(buildQueryPath(valueQuery(DEFINITION))).toBe(
      'environmentvariablevalues?$select=environmentvariablevalueid,value' +
        `&$filter=_environmentvariabledefinitionid_value eq ${DEFINITION} and statecode eq 0` +
        '&$orderby=environmentvariablevalueid',
    );
  });

  it('refuses a site id that is not a GUID', () => {
    expect(() => componentQuery("x' or 1 eq 1", COMPONENT_TYPE.webRole)).toThrow(RangeError);
  });
});
```

- [ ] **A3. Create `src/features/inspector/scan/parseRecords.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { HostReadError } from '@/services/pptb/host.types';
import {
  parseComponentRow,
  parseDefinition,
  parsePermissions,
  parseRoles,
  parseServerLogic,
  parseSettings,
  parseSites,
  pickEnvVarValue,
} from './parseRecords';

function row(id: string, name: string, content: unknown, statecode = 0): Record<string, unknown> {
  return { powerpagecomponentid: id, name, statecode, content: JSON.stringify(content) };
}

const DEFINITION_ID = '0a1b2c3d-0000-4000-8000-000000000002';

describe('parseComponentRow', () => {
  it('validates the envelope and parses content', () => {
    expect(parseComponentRow(row('a', 'n', { x: 1 }))).toEqual({
      id: 'a',
      name: 'n',
      active: true,
      content: { x: 1 },
    });
    expect(parseComponentRow(row('a', 'n', {}, 1))?.active).toBe(false);
  });

  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['no id', { name: 'n', statecode: 0, content: '{}' }],
    ['an empty id', { powerpagecomponentid: '', name: 'n', statecode: 0, content: '{}' }],
    ['no name', { powerpagecomponentid: 'a', statecode: 0, content: '{}' }],
    ['an unknown state', { powerpagecomponentid: 'a', name: 'n', statecode: 2, content: '{}' }],
  ])('refuses a row that is %s', (_label, raw) => {
    expect(parseComponentRow(raw)).toBeNull();
  });

  it.each([['{not json'], ['[1]'], ['"text"'], [null], [5]])(
    'keeps the row but reports unreadable content %j',
    (content) => {
      const parsed = parseComponentRow({ powerpagecomponentid: 'a', name: 'n', statecode: 0, content });
      expect(parsed).toMatchObject({ id: 'a', content: null });
    },
  );
});

describe('parseSites', () => {
  it('maps sites in the given order and reads a missing domain as empty', () => {
    const rows = [
      { powerpagesiteid: 's1', name: 'B', primarydomainname: 'b.example.com', statecode: 0 },
      { powerpagesiteid: 's2', name: 'A', primarydomainname: null, statecode: 1 },
    ];
    expect(parseSites(rows)).toEqual([
      { id: 's1', name: 'B', domain: 'b.example.com', active: true },
      { id: 's2', name: 'A', domain: '', active: false },
    ]);
  });

  it('fails the whole list when one row cannot be read', () => {
    expect(() => parseSites([{ powerpagesiteid: 's1', name: 'B', statecode: 0 }, { name: 'x' }])).toThrow(
      HostReadError,
    );
  });
});

describe('parseServerLogic', () => {
  it('reads the role link from content and keeps inactive records', () => {
    const { records, skipped } = parseServerLogic([
      row('f1', 'one', { adx_serverlogic_adx_webrole: ['r1', 'r2'] }),
      row('f2', 'two', { display_name: 'no link key' }, 1),
    ]);
    expect(skipped).toBe(0);
    expect(records).toEqual([
      { id: 'f1', name: 'one', active: true, roleIds: { ok: true, value: ['r1', 'r2'] } },
      { id: 'f2', name: 'two', active: false, roleIds: { ok: true, value: [] } },
    ]);
  });

  it('marks the role link unreadable, not empty, when content or the link is malformed', () => {
    const { records } = parseServerLogic([
      { powerpagecomponentid: 'f1', name: 'one', statecode: 0, content: '{not json' },
      row('f2', 'two', { adx_serverlogic_adx_webrole: 'r1' }),
      row('f3', 'three', { adx_serverlogic_adx_webrole: ['r1', 2] }),
    ]);
    expect(records.map((record) => record.roleIds)).toEqual([
      { ok: false, reason: 'read-failed' },
      { ok: false, reason: 'read-failed' },
      { ok: false, reason: 'read-failed' },
    ]);
  });

  it('skips and counts a row without a readable id, name or state', () => {
    const { records, skipped } = parseServerLogic([{ name: 'x' }, row('f1', 'one', {})]);
    expect(records.map((record) => record.id)).toEqual(['f1']);
    expect(skipped).toBe(1);
  });
});

describe('parseRoles', () => {
  it('defaults an absent flag to false', () => {
    expect(parseRoles([row('r1', 'a', { anonymoususersrole: true }), row('r2', 'b', {})])).toEqual({
      items: [
        { id: 'r1', name: 'a', anonymous: true, authenticated: false },
        { id: 'r2', name: 'b', anonymous: false, authenticated: false },
      ],
      unreadable: [],
    });
  });

  it.each([
    ['a non-boolean flag', row('r1', 'a', { anonymoususersrole: 'yes' }), 'r1', 'a'],
    ['unreadable content', { powerpagecomponentid: 'r1', name: 'a', statecode: 0, content: '{x' }, 'r1', 'a'],
    ['empty content', { powerpagecomponentid: 'r1', name: 'a', statecode: 0, content: '' }, 'r1', 'a'],
    ['an unreadable envelope', { name: 'a' }, '', 'a'],
    ['no readable id or name', 'text', '', ''],
  ])('skips a role row with %s, keeps the others and reports it', (_label, bad, id, name) => {
    const parsed = parseRoles([row('r0', 'ok', {}), bad]);
    expect(parsed.items.map((role) => role.id)).toEqual(['r0']);
    expect(parsed.unreadable).toEqual([{ type: 11, id, name }]);
  });
});

describe('parsePermissions', () => {
  it('maps scope, privileges, roles and the parent link', () => {
    const parsed = parsePermissions([
      row('p1', 'top', {
        scope: 756150001,
        entitylogicalname: 'contact',
        read: true,
        write: true,
        create: false,
        delete: false,
        append: true,
        appendto: true,
        adx_entitypermission_webrole: ['r1'],
      }),
      row(
        'p2',
        'child',
        { scope: 756150003, entitylogicalname: 'account', parententitypermission: 'p1', read: true },
        1,
      ),
    ]);
    expect(parsed.unreadable).toEqual([]);
    expect(parsed.items).toEqual(
      [
        {
          id: 'p1',
          name: 'top',
          table: 'contact',
          scope: 'Contact',
          privileges: ['Read', 'Write', 'Append', 'AppendTo'],
          roleIds: ['r1'],
          active: true,
          parentId: null,
        },
        {
          id: 'p2',
          name: 'child',
          table: 'account',
          scope: 'Parent',
          privileges: ['Read'],
          roleIds: [],
          active: false,
          parentId: 'p1',
        },
      ],
    );
  });

  it.each([
    [756150000, 'Global'],
    [756150001, 'Contact'],
    [756150002, 'Account'],
    [756150003, 'Parent'],
    [756150004, 'Self'],
  ])('reads scope %i as %s', (scope, expected) => {
    const parsed = parsePermissions([row('p1', 'p', { scope, entitylogicalname: 'contact' })]);
    expect(parsed.items[0]?.scope).toBe(expected);
  });

  it.each([[756150005], ['756150000'], [null], [undefined]])('reads scope %j as unknown', (scope) => {
    const parsed = parsePermissions([row('p1', 'p', { scope, entitylogicalname: 'contact' })]);
    expect(parsed.items[0]?.scope).toBeNull();
  });

  it.each([
    ['a missing table name', { read: true }],
    ['a non-string table name', { entitylogicalname: 7 }],
    ['a non-boolean privilege', { entitylogicalname: 'contact', read: 'true' }],
    ['a non-array role link', { entitylogicalname: 'contact', adx_entitypermission_webrole: 'r1' }],
    ['a non-string parent link', { entitylogicalname: 'contact', parententitypermission: 7 }],
  ])('skips a permission row with %s and reports it', (_label, content) => {
    const parsed = parsePermissions([row('p0', 'ok', { entitylogicalname: 'contact' }), row('p1', 'p', content)]);
    expect(parsed.items.map((permission) => permission.id)).toEqual(['p0']);
    expect(parsed.unreadable).toEqual([{ type: 18, id: 'p1', name: 'p' }]);
  });

  it('skips a row with unreadable or empty content and keeps the good rows', () => {
    const good = row('p0', 'ok', { entitylogicalname: 'contact' });
    for (const content of ['{x', '']) {
      const bad = { powerpagecomponentid: 'p1', name: 'p', statecode: 0, content };
      const parsed = parsePermissions([good, bad]);
      expect(parsed.items.map((permission) => permission.id)).toEqual(['p0']);
      expect(parsed.unreadable).toEqual([{ type: 18, id: 'p1', name: 'p' }]);
    }
  });
});

describe('parseSettings', () => {
  const named = (name: string, content: unknown, statecode = 0): Record<string, unknown> =>
    row(`id-${name}-${String(statecode)}`, name, content, statecode);

  it('matches by trimmed, case-insensitive name and ignores every other row', () => {
    const parsed = parseSettings([
      named('Footer/OutputCache/Enabled', { value: 'True' }),
      { name: 5 },
      named('  serverlogic/ALLOWEDDOMAINS ', { value: 'a.example.com', source: 0 }),
    ]);
    expect(parsed?.bindings['ServerLogic/AllowedDomains']).toEqual({ kind: 'value', raw: 'a.example.com' });
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'absent' });
  });

  it('reports two active matches as a duplicate and lists inactive matches', () => {
    const parsed = parseSettings([
      named('ServerLogic/Enabled', { value: 'true' }),
      named('serverlogic/enabled', { value: 'false' }),
      named('ServerLogic/TimeoutInSeconds', { value: '30' }, 1),
    ]);
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'duplicate' });
    expect(parsed?.bindings['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'absent' });
    expect(parsed?.inactive).toEqual(['ServerLogic/TimeoutInSeconds']);
  });

  it('binds an environment-variable setting to its trimmed schema name', () => {
    const parsed = parseSettings([
      named('ServerLogic/AllowedDomains', { source: 1, envvar_schema: ' cfg_Domains ' }),
    ]);
    expect(parsed?.bindings['ServerLogic/AllowedDomains']).toEqual({ kind: 'envvar', schema: 'cfg_Domains' });
  });

  it.each([
    ['unreadable content', { powerpagecomponentid: 'a', name: 'ServerLogic/Enabled', statecode: 0, content: '{x' }],
    ['no value', named('ServerLogic/Enabled', { source: 0 })],
    ['a numeric value', named('ServerLogic/Enabled', { value: 1 })],
    ['a blank schema name', named('ServerLogic/Enabled', { source: 1, envvar_schema: '  ' })],
  ])('degrades only that setting to an empty value for %s', (_label, bad) => {
    const parsed = parseSettings([bad, named('ServerLogic/TimeoutInSeconds', { value: '30' })]);
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'value', raw: '' });
    expect(parsed?.bindings['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'value', raw: '30' });
  });

  it('is unreadable when a matched row has no readable id or state', () => {
    expect(parseSettings([{ name: 'ServerLogic/Enabled', statecode: 'x' }])).toBeNull();
  });
});

describe('environment variables', () => {
  const definition = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
    environmentvariabledefinitionid: DEFINITION_ID,
    schemaname: 'cfg_Domains',
    type: 100000000,
    defaultvalue: 'default.example.com',
    ...patch,
  });

  it('reads exactly one definition and recognises Secret by type', () => {
    expect(parseDefinition([definition()])).toEqual({
      id: DEFINITION_ID,
      secret: false,
      defaultValue: 'default.example.com',
    });
    expect(parseDefinition([definition({ type: 100000005, defaultvalue: null })])).toEqual({
      id: DEFINITION_ID,
      secret: true,
      defaultValue: null,
    });
  });

  it.each([
    ['no rows', []],
    ['two rows', [definition(), definition()]],
    ['a non-GUID id', [definition({ environmentvariabledefinitionid: 'x' })]],
    ['a non-numeric type', [definition({ type: 'Secret' })]],
    ['a numeric default', [definition({ defaultvalue: 3 })]],
  ])('is unreadable for %s', (_label, rows) => {
    expect(parseDefinition(rows)).toBeNull();
  });

  it('prefers the first value row, then the default, then nothing', () => {
    const withDefault = { id: DEFINITION_ID, secret: false, defaultValue: 'd' };
    const noDefault = { id: DEFINITION_ID, secret: false, defaultValue: null };
    expect(pickEnvVarValue([{ value: 'v1' }, { value: 'v2' }], withDefault)).toBe('v1');
    expect(pickEnvVarValue([{ value: null }], withDefault)).toBe('d');
    expect(pickEnvVarValue([], withDefault)).toBe('d');
    expect(pickEnvVarValue([], noDefault)).toBeNull();
    expect(pickEnvVarValue([{ value: '' }], withDefault)).toBe('');
  });
});
```

- [ ] **A4. Create `src/features/inspector/scan/scan.test.ts`**

The file imports no module that does not already exist at the baseline except through `./scan`, so every test reaches the stub. `ScanAbandonedError` is a missing named export at the baseline; Vitest resolves it to `undefined`, which fails the identity tests at their assertion. The `gated` helper at the end wraps a fake so a test decides when each read settles (a released call then runs against the fake, which honours the signal exactly as the adapter does) and counts overlapping reads.

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateSite } from '@/features/inspector/model/rules';
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

  it('degrades one malformed setting to an empty value without failing the others', async () => {
    const broken = { ...setting(1, 'ServerLogic/TimeoutInSeconds', {}), content: '{not json' };
    const facts = await scan(
      createWorld({
        ...HAPPY,
        settings: [broken, setting(2, 'ServerLogic/Enabled', { value: 'false', source: 0 })],
      }),
    );
    expect(facts.settings.ok).toBe(true);
    expect(settingsOf(facts)['ServerLogic/TimeoutInSeconds']).toEqual({
      kind: 'value',
      raw: '',
      fromEnvVar: false,
    });
    const banners = evaluateSite(facts, new Set<ReviewKey>()).banners;
    expect(banners).toContain("`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240");
    expect(banners).toContain('Server logic is disabled on this site (`ServerLogic/Enabled` = false)');
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
```

- [ ] **A5. Create `src/features/inspector/model/unreadableRows.test.ts`** (R-14 option B, model side)

```typescript
import { describe, expect, it } from 'vitest';
import type { Finding, ReviewKey, SiteFacts, UnreadableRow } from '@/types/inspector';
import { unreadableRowsBanner } from './copy';
import { read, role, siteFacts } from './fixtures';
import { canReviewFinding, evaluateSite } from './rules';

const ROLE_ROW: UnreadableRow = { type: 11, id: 'role-9', name: 'broken-role' };
const PERMISSION_ROW: UnreadableRow = { type: 18, id: 'perm-9', name: 'broken-perm' };
const NO_NAME: UnreadableRow = { type: 18, id: 'perm-8', name: '' };

const ONE_ROW =
  "1 web role or table permission row couldn't be read and was skipped: `broken-role`. Findings were graded without it; fix the row and rescan.";
const TWO_ROWS =
  "2 web role or table permission rows couldn't be read and were skipped: `broken-role`, `broken-perm`. Findings were graded without them; fix the rows and rescan.";

function findingsOf(facts: SiteFacts): readonly Finding[] {
  return evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings ?? [];
}

describe('skipped role and permission rows (R-14 option B)', () => {
  it('leaves a site without skipped rows exactly as it was, with no banner', () => {
    const result = evaluateSite(siteFacts(), new Set<ReviewKey>());
    expect(result.files[0]?.findings.map((item) => item.status)).toEqual([
      'configured',
      'configured',
      'configured',
    ]);
    expect(result.banners).toEqual([]);
  });

  it.each([
    ['role', ROLE_ROW],
    ['permission', PERMISSION_ROW],
  ] as const)(
    'grades every finding of a site with a skipped %s row exactly as the clean site',
    (_label, row) => {
      const clean = findingsOf(siteFacts());
      const skipped = findingsOf(siteFacts({ unreadableRows: [row] }));
      expect(skipped).toEqual(clean);
      expect(skipped.map((item) => item.status)).toEqual(['configured', 'configured', 'configured']);
      expect(skipped.map((item) => item.hasUnscannedEvidence)).toEqual([false, false, false]);
      expect(skipped.map((item) => canReviewFinding(item))).toEqual(
        clean.map((item) => canReviewFinding(item)),
      );
    },
  );

  it('keeps a Needs review finding graded and reviewable, as on the clean site', () => {
    const rows = { roles: read([role('staff', { anonymous: true })]) };
    const clean = findingsOf(siteFacts(rows));
    const skipped = findingsOf(siteFacts({ ...rows, unreadableRows: [ROLE_ROW, PERMISSION_ROW] }));
    expect(skipped).toEqual(clean);
    const web = skipped[0];
    expect(web?.status).toBe('needs-review');
    expect(web?.summary).toBe('Callable by unauthenticated visitors.');
    expect(web?.hasUnscannedEvidence).toBe(false);
    expect(web !== undefined && canReviewFinding(web)).toBe(true);
    const marked = evaluateSite(
      siteFacts({ ...rows, unreadableRows: [ROLE_ROW] }),
      new Set<ReviewKey>(['file-1:webRole']),
    );
    expect(marked.files[0]?.findings[0]?.status).toBe('reviewed');
  });

  it('adds one banner naming a single skipped row', () => {
    const result = evaluateSite(siteFacts({ unreadableRows: [ROLE_ROW] }), new Set<ReviewKey>());
    expect(result.banners).toEqual([ONE_ROW]);
  });

  it('adds one banner naming several skipped rows in row order', () => {
    const result = evaluateSite(
      siteFacts({ unreadableRows: [ROLE_ROW, PERMISSION_ROW] }),
      new Set<ReviewKey>(),
    );
    expect(result.banners).toEqual([TWO_ROWS]);
  });

  it('names a row without a name by its id', () => {
    const result = evaluateSite(siteFacts({ unreadableRows: [NO_NAME] }), new Set<ReviewKey>());
    expect(result.banners).toEqual([
      "1 web role or table permission row couldn't be read and was skipped: `perm-8`. Findings were graded without it; fix the row and rescan.",
    ]);
  });

  it('keeps the banner ahead of the inventory and connection banners', () => {
    const result = evaluateSite(
      siteFacts({ unreadableRows: [ROLE_ROW], inventoryComplete: false, stopped: 'connection-lost' }),
      new Set<ReviewKey>(),
    );
    expect(result.banners).toEqual([
      ONE_ROW,
      'Inventory incomplete. Reconnect and rescan.',
      'Connection lost. Reconnect and rescan.',
    ]);
  });

  it('builds the banner text from the rows', () => {
    expect(unreadableRowsBanner([ROLE_ROW])).toBe(ONE_ROW);
    expect(unreadableRowsBanner([ROLE_ROW, PERMISSION_ROW])).toBe(TWO_ROWS);
    expect(unreadableRowsBanner([ROLE_ROW, NO_NAME, PERMISSION_ROW])).toBe(
      "3 web role or table permission rows couldn't be read and were skipped: `broken-role`, `perm-8`, `broken-perm`. Findings were graded without them; fix the rows and rescan.",
    );
  });
});
```

- [ ] **A6. Create `src/features/inspector/model/envvarCause.test.ts`** (R-15 option B, model side)

```typescript
import { describe, expect, it } from 'vitest';
import type { EnvVarCause, SettingValue } from '@/types/inspector';
import { envVarFailureText } from './copy';
import { read, settings, siteFacts } from './fixtures';
import {
  parseAllowedDomains,
  parseBooleanSetting,
  parseTimeout,
  settingBanners,
  settingSnapshot,
} from './settings';

const NAME = 'ServerLogic/AllowedDomains';

const CASES = [
  ['secret', "Couldn't read `ServerLogic/AllowedDomains`: its environment variable is a secret"],
  [
    'missing',
    "Couldn't read `ServerLogic/AllowedDomains`: its environment variable isn't defined or has no value",
  ],
  [
    'denied',
    "Couldn't read `ServerLogic/AllowedDomains`: access to its environment variable was denied",
  ],
  ['failed', "Couldn't read `ServerLogic/AllowedDomains` from its environment variable"],
] as const satisfies readonly (readonly [EnvVarCause, string])[];

describe('environment-variable failure causes (R-15 option B)', () => {
  it.each(CASES)('renders %s as its own text', (cause, text) => {
    expect(envVarFailureText(NAME, cause)).toBe(text);
  });

  it.each(CASES)('keeps the %s cause a read failure in the parsed setting', (cause, text) => {
    const parsed = parseAllowedDomains({ kind: 'envvar-unreadable', cause });
    expect(parsed.reasons).toEqual([{ text, readFailure: true }]);
    expect(parsed.fromEnvVar).toBe(true);
  });

  it.each(CASES)('writes the %s text into the snapshot line', (cause, text) => {
    const facts = siteFacts({
      settings: read(settings({ [NAME]: { kind: 'envvar-unreadable', cause } })),
    });
    expect(settingSnapshot(facts)).toContain(text);
  });

  it('applies the cause text to the Boolean and Timeout settings and banners', () => {
    const unreadable: SettingValue = { kind: 'envvar-unreadable', cause: 'denied' };
    expect(parseBooleanSetting('ServerLogic/Enabled', unreadable).reasons[0]?.text).toBe(
      "Couldn't read `ServerLogic/Enabled`: access to its environment variable was denied",
    );
    expect(parseTimeout(unreadable).reasons[0]?.text).toContain(
      'access to its environment variable was denied',
    );
    const facts = siteFacts({ settings: read(settings({ 'ServerLogic/Enabled': unreadable })) });
    expect(settingBanners(facts)).toEqual([
      "Couldn't read `ServerLogic/Enabled`: access to its environment variable was denied",
    ]);
  });
});
```

- [ ] **A7. Capture the failure**

```powershell
npm test -- src/features/inspector/scan src/features/inspector/model/unreadableRows.test.ts src/features/inspector/model/envvarCause.test.ts
```

Expected: exit 1, `Test Files  6 failed (6)`, `Tests  61 failed (61)`. `limiter.test.ts`, `queries.test.ts` and `parseRecords.test.ts` fail to load (`Failed to resolve import "./limiter"`, `"./queries"`, `"./parseRecords"`). `scan.test.ts` loads and all 45 tests fail with `not implemented: phase 15` (the stubs throw synchronously). `envvarCause.test.ts` fails 11 of 13 (`envVarFailureText` is not exported; the two `failed`-cause cases pass because that text does not change). `unreadableRows.test.ts` fails 5 of 9 (the banner cases; the cases that only compare findings with the clean site pass because the model grades them as it already does). Do not run `npm run typecheck` here: the new tests use `ScanProgress`, `ScanOptions`, `ScanAbandonedError`, `unreadableRows` and `cause`, which do not exist yet.

---

## Phase B — Implementation

**Files:** `src/types/inspector.ts`, `src/features/inspector/scan/limiter.ts`, `queries.ts`, `parseRecords.ts`, `scan.ts`, `src/features/inspector/model/copy.ts`, `settings.ts`, `rules.ts`, `fixtures.ts`, `src/features/inspector/report/reportFixtures.ts`, and the three model test files that build `envvar-unreadable` literals.

- [ ] **B1. `src/types/inspector.ts`**

Apply this diff (context lines are the exact current lines):

```diff
--- a/src/types/inspector.ts
+++ b/src/types/inspector.ts
@@ -20,9 +20,11 @@
   | 'ServerLogic/AllowNetworkingToAllDomains'
   | 'ServerLogic/TimeoutInSeconds';
+/** Why an environment variable could not be read; each cause has its own finding text (FR-7). */
+export type EnvVarCause = 'secret' | 'missing' | 'denied' | 'failed';
 export type SettingValue =
   | { kind: 'absent' }
   | { kind: 'duplicate' }
   | { kind: 'value'; raw: string; fromEnvVar: boolean }
-  | { kind: 'envvar-unreadable' } // secret type, missing variable or failed read
+  | { kind: 'envvar-unreadable'; cause: EnvVarCause }
   | { kind: 'not-scanned' }; // environment-variable read not started before interruption
 export type ServerLogicFileFacts = {
@@ -33,4 +35,6 @@
   code: Readable<string>;
 };
+/** A web role (11) or table permission (18) row the reader skipped because it could not be read. */
+export type UnreadableRow = { type: 11 | 18; id: string; name: string };
 export type SiteRef = { id: string; name: string; domain: string; active: boolean };
 export type SiteFacts = {
@@ -46,6 +50,10 @@
   files: readonly ServerLogicFileFacts[];
   inventoryComplete: boolean;
+  /** Role and permission rows skipped as unreadable; the site banner names them and findings are graded without them. */
+  unreadableRows: readonly UnreadableRow[];
   stopped: 'connection-lost' | null;
 };
+/** `Scanned X of N`; `total` is only the discovered files while `inventoryComplete` is false. */
+export type ScanProgress = { scanned: number; total: number; inventoryComplete: boolean };
 export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
 export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
```

- [ ] **B2. Create `src/features/inspector/scan/limiter.ts`**

```typescript
export type Limiter = {
  /** Runs `task` once fewer than `limit` tasks are running; waiting tasks start in arrival order. */
  run<T>(task: () => Promise<T>): Promise<T>;
};

/**
 * A FIFO concurrency gate. A finishing task hands its slot straight to the next waiter, so the number
 * of running tasks never exceeds `limit`, even between the hand-off and the waiter's first line.
 */
export function createLimiter(limit: number): Limiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('A limiter needs a positive whole-number limit.');
  }
  const waiting: (() => void)[] = [];
  let active = 0;
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active < limit) {
        active += 1;
      } else {
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
        });
      }
      try {
        return await task();
      } finally {
        const next = waiting.shift();
        if (next === undefined) active -= 1;
        else next();
      }
    },
  };
}
```

- [ ] **B3. Create `src/features/inspector/scan/queries.ts`**

```typescript
import type { ODataQuery } from '@/services/pptb/host.types';

/** Largest page Dataverse returns for one request; the adapter rejects anything bigger. */
export const PAGE_SIZE = 5000;

/** `powerpagecomponenttype` values Inspector reads. */
export const COMPONENT_TYPE = {
  siteSetting: 9,
  webRole: 11,
  tablePermission: 18,
  serverLogic: 35,
} as const;
export type ComponentType = (typeof COMPONENT_TYPE)[keyof typeof COMPONENT_TYPE];

/** `environmentvariabledefinition.type` of a Secret variable; its value is never requested. */
export const SECRET_ENVVAR_TYPE = 100000005;

export const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /\p{Cc}/u;

/**
 * An OData string literal as FR-7 writes it: each `'` doubled, the result percent-encoded, the whole
 * quoted. The host builds the request URL from the path as given, so the caller encodes (`&`, `#`, `%`,
 * `+` and spaces become `%26`, `%23`, `%25`, `%2B`, `%20`; `'` stays, which is how OData reads the
 * doubling). Control characters (which the adapter rejects anyway) fail with a RangeError.
 */
export function odataString(value: string): string {
  if (CONTROL.test(value)) throw new RangeError('The value cannot be used in an OData filter.');
  try {
    return `'${encodeURIComponent(value.replaceAll("'", "''"))}'`;
  } catch {
    // encodeURIComponent throws a URIError for a lone surrogate.
    throw new RangeError('The value cannot be used in an OData filter.');
  }
}

/** A GUID is inserted bare (OData GUID literal). Anything else is a RangeError. */
export function odataGuid(value: string): string {
  if (!GUID.test(value)) throw new RangeError('The value is not a GUID.');
  return value;
}

export const SITES_QUERY: ODataQuery = {
  entitySet: 'powerpagesites',
  select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
  filter: null,
  orderBy: 'name,powerpagesiteid',
  pageSize: PAGE_SIZE,
};

/** Every row of one component type on a site. Deliberately no name filter: see FR-7 setting-name matching. */
export function componentQuery(siteId: string, type: ComponentType): ODataQuery {
  return {
    entitySet: 'powerpagecomponents',
    select: ['powerpagecomponentid', 'name', 'content', 'statecode', 'powerpagecomponenttype'],
    filter: `_powerpagesiteid_value eq ${odataGuid(siteId)} and powerpagecomponenttype eq ${String(type)}`,
    orderBy: 'name,powerpagecomponentid',
    pageSize: PAGE_SIZE,
  };
}

export function definitionQuery(schemaName: string): ODataQuery {
  return {
    entitySet: 'environmentvariabledefinitions',
    select: ['environmentvariabledefinitionid', 'schemaname', 'type', 'defaultvalue'],
    filter: `schemaname eq ${odataString(schemaName)}`,
    orderBy: 'environmentvariabledefinitionid',
    pageSize: PAGE_SIZE,
  };
}

export function valueQuery(definitionId: string): ODataQuery {
  return {
    entitySet: 'environmentvariablevalues',
    select: ['environmentvariablevalueid', 'value'],
    filter: `_environmentvariabledefinitionid_value eq ${odataGuid(definitionId)} and statecode eq 0`,
    orderBy: 'environmentvariablevalueid',
    pageSize: PAGE_SIZE,
  };
}
```

- [ ] **B4. Create `src/features/inspector/scan/parseRecords.ts`**

`parseRoles` and `parsePermissions` return `{ items, unreadable }`: a row whose envelope, `content` JSON or required keys fail validation is skipped and reported with its id and name as far as they could be read (`''` otherwise). The reader never lets one such row hide or fail the others.

```typescript
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
```

- [ ] **B5. Replace `src/features/inspector/scan/scan.ts` in full** (current 16 lines: the two stubs quoted in G1)

Design notes the code relies on:

- `createReader` is the only code that touches the host during a scan. Its limiter gates every call; `guarded` turns each call into an `Outcome` (`ok`, `failed` for one fact, `unread` after connection loss) and rethrows only cancellation and programming errors.
- `isLost()` is a function, not a direct read of `lost`, because TypeScript narrows a `let` that an inner function assigns and `no-unnecessary-condition` would then reject the check.
- The four component queries start together. `readFiles` begins downloading as soon as the inventory is parsed, and `readSettings` resolves environment variables as soon as the settings rows arrive, so no barrier waits for the slowest list.
- `Promise.all` is enough: the reader's `close()` aborts the internal controller in `finally`, so a failure in one branch stops the others at their next request boundary.
- The environment-variable cause is decided where the failure is seen: no definition row or no value and no default is `missing`; a 403 on either read is `denied`; a Secret type is `secret`; an ambiguous or unreadable definition, an unusable schema name and any other failed read are `failed`. Nothing is logged for the cause because it is in the fact.

```typescript
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
  const files = await Promise.all(
    records.map(async (record): Promise<ServerLogicFileFacts> => {
      const result = await reader.download(record.id);
      if (result.kind !== 'unread') {
        scanned += 1;
        onProgress({ scanned, total, inventoryComplete });
      }
      return { ...record, code: result.kind === 'ok' ? { ok: true, value: result.value } : failureOf(result) };
    }),
  );
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
  const [enabled, allowedDomains, allowAll, timeout] = await Promise.all([
    resolveBinding(reader, bindings['ServerLogic/Enabled']),
    resolveBinding(reader, bindings['ServerLogic/AllowedDomains']),
    resolveBinding(reader, bindings['ServerLogic/AllowNetworkingToAllDomains']),
    resolveBinding(reader, bindings['ServerLogic/TimeoutInSeconds']),
  ]);
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
  const reader = createReader(host, signal);
  try {
    const inventory = reader.query(componentQuery(site.id, COMPONENT_TYPE.serverLogic));
    const roles = reader.query(componentQuery(site.id, COMPONENT_TYPE.webRole));
    const permissions = reader.query(componentQuery(site.id, COMPONENT_TYPE.tablePermission));
    const settings = reader.query(componentQuery(site.id, COMPONENT_TYPE.siteSetting));
    const [inventoryResult, rolesResult, permissionsResult, settingsResult] = await Promise.all([
      readFiles(reader, inventory, onProgress),
      readList(roles, parseRoles),
      readList(permissions, parsePermissions),
      readSettings(reader, settings),
    ]);
    throwIfAborted(signal);
    await confirmIdentity(host, connection);
    throwIfAborted(signal);
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
    reader.close();
  }
}

/** Every Power Pages site in the environment, in server order. A failed read rejects; it is never an empty list. */
export async function listSites(host: PptbHost): Promise<readonly SiteRef[]> {
  return parseSites(await host.queryAll(SITES_QUERY));
}
```

- [ ] **B6. Model edits (R-13 relaxed for R-14 and R-15)**

These touch the model only for the skipped-row banner and environment-variable causes; `checks.ts` is not edited. Apply each diff (context lines are exact current lines; `rules.ts` has 73 lines now, `settings.ts` 180, `copy.ts` 55, `fixtures.ts` 81).

`src/features/inspector/model/copy.ts`:

```diff
--- a/src/features/inspector/model/copy.ts
+++ b/src/features/inspector/model/copy.ts
@@ -1,3 +1,3 @@
-import type { CheckId } from '@/types/inspector';
+import type { CheckId, EnvVarCause, UnreadableRow } from '@/types/inspector';
 
 export type CheckCopy = {
@@ -54,2 +54,23 @@
 export const CODE_ANALYSIS_LIMIT = "Couldn't analyse handler code";
 export const CONNECTORS_UNKNOWN = "Couldn't determine which connectors the code uses.";
+
+/** FR-7: one text per cause; all four are read failures. */
+export function envVarFailureText(setting: string, cause: EnvVarCause): string {
+  switch (cause) {
+    case 'secret':
+      return `Couldn't read \`${setting}\`: its environment variable is a secret`;
+    case 'missing':
+      return `Couldn't read \`${setting}\`: its environment variable isn't defined or has no value`;
+    case 'denied':
+      return `Couldn't read \`${setting}\`: access to its environment variable was denied`;
+    case 'failed':
+      return `Couldn't read \`${setting}\` from its environment variable`;
+  }
+}
+
+/** Site banner naming the skipped role and permission rows, in row order; the row id stands in for a missing name. */
+export function unreadableRowsBanner(rows: readonly UnreadableRow[]): string {
+  const names = rows.map((row) => `\`${row.name === '' ? row.id : row.name}\``).join(', ');
+  const one = rows.length === 1;
+  return `${String(rows.length)} web role or table permission ${one ? "row couldn't be read and was" : "rows couldn't be read and were"} skipped: ${names}. Findings were graded without ${one ? 'it' : 'them'}; fix the ${one ? 'row' : 'rows'} and rescan.`;
+}
```

`src/features/inspector/model/settings.ts`:

```diff
--- a/src/features/inspector/model/settings.ts
+++ b/src/features/inspector/model/settings.ts
@@ -1,4 +1,4 @@
 import type { Reason, SettingName, SettingValue, SiteFacts } from '@/types/inspector';
-import { ENVVAR_CACHE_NOTE, NOT_SCANNED_TEXT, TIMEOUT_NOTE } from './copy';
+import { ENVVAR_CACHE_NOTE, envVarFailureText, NOT_SCANNED_TEXT, TIMEOUT_NOTE } from './copy';
 
 export const SETTING_NAMES: readonly SettingName[] = [
@@ -38,5 +38,5 @@
     return result<T>(
       null,
-      [{ text: `Couldn't read \`${name}\` from its environment variable`, readFailure: true }],
+      [{ text: envVarFailureText(name, setting.cause), readFailure: true }],
       true,
     );
@@ -152,6 +152,5 @@
       return `\`${name}\` = ${setting.raw.trim()}${setting.fromEnvVar ? ' (environment variable)' : ''}`;
     if (setting.kind === 'duplicate') return `Duplicate \`${name}\``;
-    if (setting.kind === 'envvar-unreadable')
-      return `Couldn't read \`${name}\` from its environment variable`;
+    if (setting.kind === 'envvar-unreadable') return envVarFailureText(name, setting.cause);
     if (setting.kind === 'not-scanned') return `\`${name}\`: ${NOT_SCANNED_TEXT}`;
     const fallback =
```

`src/features/inspector/model/rules.ts`:

```diff
--- a/src/features/inspector/model/rules.ts
+++ b/src/features/inspector/model/rules.ts
@@ -9,4 +9,5 @@
 import { evaluateFileChecks } from './checks';
 import { defaultRoleBanners } from './grantSet';
+import { unreadableRowsBanner } from './copy';
 import { settingBanners } from './settings';
 
@@ -41,4 +42,5 @@
       ...settingBanners(facts),
       ...defaultRoleBanners(facts),
+      ...(facts.unreadableRows.length > 0 ? [unreadableRowsBanner(facts.unreadableRows)] : []),
       ...(!facts.inventoryComplete ? ['Inventory incomplete. Reconnect and rescan.'] : []),
       ...(facts.stopped === 'connection-lost' ? ['Connection lost. Reconnect and rescan.'] : []),
```

`src/features/inspector/model/fixtures.ts`:

```diff
--- a/src/features/inspector/model/fixtures.ts
+++ b/src/features/inspector/model/fixtures.ts
@@ -77,4 +77,5 @@
   files: [file()],
   inventoryComplete: true,
+  unreadableRows: [],
   stopped: null,
   ...patch,
```

`src/features/inspector/report/reportFixtures.ts`:

```diff
--- a/src/features/inspector/report/reportFixtures.ts
+++ b/src/features/inspector/report/reportFixtures.ts
@@ -90,4 +90,5 @@
       files: [],
       inventoryComplete: true,
+      unreadableRows: [],
       stopped: null,
     },
```

- [ ] **B7. Give the existing `envvar-unreadable` literals a cause**

In each file below replace every occurrence of the exact text `{ kind: 'envvar-unreadable' }` with `{ kind: 'envvar-unreadable', cause: 'failed' }`. `failed` keeps the text those tests already assert ("Couldn't read `<setting>` from its environment variable"), so no expectation changes.

| File | Lines holding the literal (current checkout) | Occurrences |
|---|---|---|
| `src/features/inspector/model/checks.test.ts` | 267 | 1 |
| `src/features/inspector/model/evidence.test.ts` | 96, 97, 101, 148, 181, 200 | 6 |
| `src/features/inspector/model/settings.test.ts` | 60, 135, 156 | 3 |

Check afterwards: `git grep -n "kind: 'envvar-unreadable' }" -- src` prints nothing, and `git grep -c "cause: 'failed'" -- src/features/inspector/model/checks.test.ts src/features/inspector/model/evidence.test.ts src/features/inspector/model/settings.test.ts` prints 1, 6 and 3.

- [ ] **B8. Run the new and neighbouring suites**

```powershell
npm test -- src/features/inspector/scan src/features/inspector/model
```

Expected: exit 0, `Test Files  11 passed (11)`, `Tests  383 passed (383)` (scan: limiter 4, parseRecords 54, queries 29, scan 45; model: the existing suites unchanged plus `unreadableRows` 9 and `envvarCause` 13).

---

## Phase C — Confirm

- [ ] **C1. Update the deliberate pin in `src/skeleton.test.ts`**

```diff
--- a/src/skeleton.test.ts
+++ b/src/skeleton.test.ts
@@ -55,4 +55,5 @@
   Finding,
   ReviewKey,
+  ScanProgress,
   SiteFacts,
   SiteRef,
@@ -135,5 +136,6 @@
         site: SiteRef,
         scanId: string,
-        onProgress: (scanned: number, total: number) => void,
+        onProgress: (progress: ScanProgress) => void,
+        options?: { signal?: AbortSignal; now?: () => Date },
       ) => Promise<SiteFacts>
     >();
```

The `listSites` pin on the next line is unchanged.

- [ ] **C2. Amend the spec (4.2.0)**

Edit `docs/specs/001-server-logic-starter-inspector/spec.md` (LF). Each `old` text below is one exact current line or sentence and occurs once.

1. Header, current L4 and L6:

```text
**Version:** 4.1.0
**Updated:** 2026-11-01
```

become

```text
**Version:** 4.2.0
**Updated:** 2026-11-02
```

2. Change log: add this row directly after the current 4.1.0 row (L34), before the blank line and `---`:

```text
| 4.2.0 | 2026-11-02 | P5.4: environment-variable failure causes (R-15 B) and skipped unreadable rows (R-14 B). Owner decisions 2026-11-02. **Changed:** FR-7 reads an environment-variable failure as one of four causes with four texts (secret, missing, denied, failed); a web role or table permission row that cannot be read is skipped, the other rows are kept, findings are graded without the skipped row, and a site banner names the skipped rows (FR-7). **Unchanged:** the read-failure rules and FR-9. |
```

3. FR-7 L658. Replace the sentence

```text
A Secret-type variable (`type` 100000005), a missing variable or a failed read is Needs review "Couldn't read `<setting>` from its environment variable" on the check that uses it.
```

with

```text
A variable that cannot be read is Needs review on the check that uses it, with one of four read-failure texts: a Secret-type variable (`type` 100000005; its value is never requested) is "Couldn't read `<setting>`: its environment variable is a secret"; no definition, or no value row and no default, is "Couldn't read `<setting>`: its environment variable isn't defined or has no value"; a 403 on either read is "Couldn't read `<setting>`: access to its environment variable was denied"; any other failure (an ambiguous definition, an unusable schema name, another failed read) is "Couldn't read `<setting>` from its environment variable".
```

4. FR-7: insert this bullet directly after the bullet that ends `It doesn't otherwise affect any check.` (current L664, the "If more than one web role" bullet):

```text
- A web role (type 11) or table permission (type 18) row whose envelope, `content` or required keys cannot be read is skipped, not guessed, and the other rows are kept. Findings are graded from the readable rows, so a skipped row can hide evidence and a Configured finding on that site may be unsound. One site banner names the skipped rows in row order, using the row id when a row has no name: "1 web role or table permission row couldn't be read and was skipped: `<name>`. Findings were graded without it; fix the row and rescan." for one row, or "N web role or table permission rows couldn't be read and were skipped: `<name>`, `<name>`. Findings were graded without them; fix the rows and rescan." for several. Like every banner, it is repeated in every export.
```

Check: `git diff --stat -- docs/specs/001-server-logic-starter-inspector/spec.md` shows one file, and `git grep -n "4.2.0" -- docs/specs` prints the three header/log hits.

- [ ] **C3. Focused and neighbouring suites**

```powershell
npm test -- src/features/inspector/scan src/features/inspector/model src/features/inspector/report src/skeleton.test.ts src/types/contracts.test.ts
```

Expected: exit 0, `Test Files  16 passed (16)`, `Tests  420 passed (420)`, with no existing expectation changed (the model, report golden and contract suites pass as they did at the baseline).

- [ ] **C4. Type, lint and build gates**

```powershell
npm run typecheck
npx --no-install eslint src/features/inspector src/types/inspector.ts src/skeleton.test.ts --max-warnings=0
npm run lint
npm test
npm run build
git diff --check
```

Expected: `typecheck` exits 0 with no output; `eslint` and `npm run lint` (`eslint . --max-warnings=0`) exit 0 with no output; `npm test` exits 0 with `Test Files  101 passed (101)` and `Tests  1658 passed (1658)` (baseline 95 / 1504 plus 6 / 154); `npm run build` exits 0 (`scan.ts` is not yet imported by the app, so the bundle is unchanged apart from the model code); `git diff --check` prints nothing. A diagnostic in any file listed in this plan is a P5.4 failure; an unrelated diagnostic is recorded against the baseline. P5.3's evidence notes that the repo's stop hook can start a second vitest run in the same checkout and make one full run exit 1 with no output; re-run before treating that as a failure.

- [ ] **C5. Commit**

```powershell
git add -- src/types/inspector.ts src/skeleton.test.ts docs/specs/001-server-logic-starter-inspector/spec.md src/features/inspector/model/copy.ts src/features/inspector/model/settings.ts src/features/inspector/model/rules.ts src/features/inspector/model/fixtures.ts src/features/inspector/model/checks.test.ts src/features/inspector/model/evidence.test.ts src/features/inspector/model/settings.test.ts src/features/inspector/model/unreadableRows.test.ts src/features/inspector/model/envvarCause.test.ts src/features/inspector/report/reportFixtures.ts src/features/inspector/scan/scan.ts src/features/inspector/scan/limiter.ts src/features/inspector/scan/limiter.test.ts src/features/inspector/scan/queries.ts src/features/inspector/scan/queries.test.ts src/features/inspector/scan/parseRecords.ts src/features/inspector/scan/parseRecords.test.ts src/features/inspector/scan/scan.test.ts
git commit -m "feat(inspector): read enhanced-model site facts through the host adapter"
```

- [ ] **C6. Record evidence**

Create `docs/phase-5/evidence/p5-4/execution.md` with the same sections as `docs/phase-5/evidence/p5-3/execution.md`: a header (plan path, execution date, branch, baseline `071415c`), `## Commits` (the C5 hash and message, files and line counts), `## Gate output` (tables of command / observed / expected for the A7 signal, the B8 confirm and the C3–C4 gates, with the observed numbers from the real run), `## Deviations from the plan text` (anything the executor changed, including line-ending handling and the statement that the Markdown goldens did not change), `## Observation` (the stop-hook note if it recurs) and `## Still open` (RG-001 wire fidelity of the encoded literal and `nextLink` token, RG-002 error shapes, RG-003 populated download and real environment-variable access, RG-004 live timing). Record owner decisions R-14 option B and R-15 option B (both 2026-11-02) under the header. Tick every `- [ ]` in this plan to `- [x]` and set its Status line to `Executed <date>; commit <hash>. Evidence: docs/phase-5/evidence/p5-4/execution.md.`

```powershell
git add -- docs/phase-5/evidence/p5-4/execution.md docs/phase-5/plans/p5-4_plan.md
git commit -m "docs(phase-5): P5.4 execution evidence, plan ticked"
```

---

## Exit proof for P5.4

- `runScan` and `listSites` exercise the real query → parse → download → `evaluateSite` path through `createFakeHost`: a configured file and an anonymous-role file reach the expected statuses and no banners (`reads a site and lets the model grade…`), and the reader calls only `queryAll`, `downloadFileColumn` and `getActiveConnection`.
- Complete and partial inventories, active and inactive records, 51 files without a cap, empty and missing code, and a skipped inventory row each have an executed case.
- Settings: current, default, missing, ambiguous, denied (definition and value), Secret (no value query asserted), apostrophe in a schema name, 401 mid-resolution, duplicate, inactive, case/whitespace matching, and a malformed row that degrades only itself. Each environment-variable cause has its own text, rendered by the model for a setting, a banner and the snapshot (`envvarCause.test.ts`).
- Skipped rows: a corrupt role or permission row is skipped and reported while the good rows are kept (reader); findings are graded exactly as from the readable rows and stay reviewable as today, and one site banner names the skipped rows (singular and plural texts, id fallback, position) (`unreadableRows.test.ts`, `scan.test.ts`).
- Connection loss: a 401 mid-downloads keeps earlier codes, marks the failing and later files Not scanned, and the fake records no download for files the limiter had not started; transport failures and inventory loss with partial rows are covered.
- Cancellation: an already-aborted signal makes no call; an abort during downloads rejects with `AbortError`, starts no further request and never reaches the identity check. Stale work is covered by the identity tests (id, URL and null) and by the accepted transient-refresh case.
- The gate measures peak in-flight reads: `peak` is exactly 4 with 12 files, and a limiter of 5 makes that test fail (checked by mutation while drafting).
- Open by design, recorded for later gates: RG-001 (wire fidelity of the encoded literal and of spaces, `nextLink` token fidelity), RG-002 (real network-loss and expired-sign-in error shapes, so whether `transport` or a 401 ever arrives), RG-003 (populated real handler download, real environment-variable access), RG-004 (live 50-record timing ≤ 30 s). A fake-host pass proves reader logic only, not Dataverse permissions, action response shape or timing.

## Self-review

**Spec coverage** (FR-7 bullet or AC → the test that proves it):

| Requirement | Test |
|---|---|
| FR-7 scan ID stored; non-atomic reads not claimed | `stamps start and finish from the injected clock and stores the scan id as given` |
| FR-7 read every page; AC-7.3 listing fails partway | `keeps the rows received before a later inventory page failed and scans them` |
| FR-7 retry 429/5xx then Needs review (AC-7.7) | adapter-owned (P5.2); the reader maps the exhausted failure in `reads a denied role list as a read failure and keeps scanning` |
| FR-7 at most 4 in flight | `never has more than four reads in flight`; `limiter.test.ts` |
| FR-7 OData literals (L632) | `queries.test.ts` (`odataString`, `odataGuid`, encoded schema path); `escapes an apostrophe in the schema name` |
| FR-7 list sites; AC-7.2 inactive listed; AC-7.8 empty list vs failure; Error Scenario L926 | the three `listSites` tests |
| FR-7 per-record roles, grant set, code, settings | `reads a site and lets the model grade…`, both-flags, Parent-chain and unknown-scope tests |
| FR-7 Parent link `content.parententitypermission` | `parses a Parent permission chain…` |
| FR-7 environment-variable read, Secret, missing, denied, failed (L658, four texts) | the environment-variable tests in `scan.test.ts` (kind and cause) and `envvarCause.test.ts` (texts) |
| R-14 option B skipped rows, site banner (FR-7) | `skips a role or permission row with unreadable content…` (scan), `unreadableRows.test.ts` (model), `parseRecords.test.ts` skip cases |
| FR-7 name matching, inactive, duplicates | duplicate, inactive and case/whitespace tests |
| FR-7 malformed value / AC-7.12 banner | `degrades one malformed setting…` |
| FR-7 no cap; progress `Scanned X of N` | `downloads every file with no cap`; both progress tests; `returns no files, complete…` (AC-7.4 inventory) |
| AC-7.3 inactive records listed and checked | `includes and downloads an inactive record` |
| AC-7.7 unreadable never Configured | roles 403, denied value, download 404 |
| AC-7.10 connection loss keeps results, rest Not scanned | 401 mid-way, transport failure, inventory loss, 401 on a definition |
| AC-8.11 and FR-8 precedence unchanged by R-14 | `unreadableRows.test.ts` (findings, statuses and `canReviewFinding` equal the clean site's) |
| Error Scenarios L927–L928 | `keeps the role link when only the download fails`; `reads an empty file as readable empty code` |
| AC-7.6 identity changes abandon the scan | the three identity tests and the transient-refresh test |
| Brief: logical cancellation | the two cancellation tests |

**Placeholder scan:** none. Every new file is given in full; every edit to an existing file is a diff whose context and removed lines were generated from the checkout, or an exact quoted line. All of it (decisions R-14 option B and R-15 option B, 2026-11-02) was applied to a scratch copy of the checkout, where `tsc`, repo-wide ESLint (`--max-warnings=0`), the full Vitest suite (101 files, 1658 tests, Markdown goldens untouched) and `vite build` passed, and the Phase A failure mode matched the text above.

**Type consistency:** `ScanProgress`, `UnreadableRow`, `EnvVarCause` and `SiteFacts.unreadableRows` live in `types/inspector.ts` and are used by `scan.ts`, `parseRecords.ts`, `copy.ts`, `rules.ts`, `fixtures.ts`, `reportFixtures.ts` and the tests. `ScanOptions = { signal?: AbortSignal; now?: () => Date }` is exactly the inline type in the pin. `ParsedList<T>` is the return of `parseRoles` and `parsePermissions`. `FileRecord` spreads into `ServerLogicFileFacts`. `SettingBinding` values map one-to-one to `SettingValue` in `resolveBinding`. `Outcome<T>` kinds are `ok`, `failed`, `unread`, matched exhaustively by `failureOf()`. `SCAN_CONCURRENCY` is 4 in `scan.ts` and in the test's expected peak. The query builders' `ODataQuery` values pass `buildQueryPath` (asserted in `queries.test.ts`). `envVarFailureText` is the single source of the four environment-variable texts for reasons, banners and the snapshot; `unreadableRowsBanner(rows)` takes the `UnreadableRow` list that `SiteFacts.unreadableRows` carries.

**Risks and notes for the executor:**

- The 401-ordering, abort and concurrency tests control order with deferred promises and one macrotask (`flush`) so a rejection reaches the reader before the next release; they passed repeatedly during drafting, and the mutation checks (limit 5, removing the lost check, removing the internal abort) each failed the relevant test.
- `checks.ts` is not edited: a skipped row changes only the site banners, so the P5.3 factories, the 64-state table and every existing expectation are untouched; with `unreadableRows: []` `evaluateSite` returns exactly what it returned before.
- Executing P5.4 does not wire the reader into a page (P5.5) and does not touch `NEXT_LINK_UNVERIFIED`.
