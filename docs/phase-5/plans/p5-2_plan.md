# P5.2 plan — Make Dataverse transport complete and cancellable

**Date:** 2026-11-01
**Baseline:** branch `logic-inspector-v2-build`, HEAD `820d7b8`; requires `p5-1_plan.md` Phases A and B applied (lint runnable, rule file and spec 4.1.0 permit the two download actions).
**Spec:** FR-7 (4.1.0 host-operation bullet, paging, retry), AC-7.7, AC-7.10, Error Scenarios "A record's code can't be downloaded" / "downloads as an empty file", Security.
**Audit items:** CR-002 (transport half), WR-003, WR-004, RG-001/002/003 evidence consumers.
**Status:** Approved by the owner on 2026-11-01; ready for `sdd-superpowers:sdd-execute` after P5.1 Phases A and B land.
**Supersedes:** Task 3 of `docs/plans/11-01-2026-phase-5-transport-reader.md`. Every file below was re-read from the checkout on 2026-11-01; review findings T3-01…T3-13 are applied as noted.

## Goal

`src/services/pptb/` reads every page and keeps the rows it already received when a later page fails, tells auth, access-denied, exhausted-retry, protocol and platform-confirmed network failures apart, honours an `AbortSignal` at every request boundary, and downloads a handler file through `InitializeFileBlocksDownload` + `DownloadBlock` into verified UTF-8 text. No feature code changes: `scan.ts` is still a stub (P5.4 is its first consumer).

## Decisions adopted (owner accepted 2026-11-01, with the P5.1 decisions X-01, X-02 and T1-01)

| ID | Decision |
|---|---|
| T3-02 | An error counts as cancellation only when **our** signal is aborted. A host-originated `AbortError` with an un-aborted signal is mapped like any other failure. |
| T3-03 | `FILE_MAX_BYTES = 128 MiB` (Learn: `filecontent` max 131,072 KB). Reject the initializer before allocating. |
| T3-04 | `FileName` is validated as a string **when present**, not required; it is never used. |
| T3-05 | `getActiveConnection` is **not** changed in P5.2 (the earlier draft's `undefined → reject` change had no P5.2 requirement). |
| T3-06 | `Retry-After` is not honoured: PPTB's error object documents `status` only. Recorded as a live-gate item in P5.1's continuation table (RG-002). |
| T3-07 | `HostReadError.transport` is set only for a `DOMException` named `NetworkError`. Whether PPTB ever surfaces that shape is a live gate; P5.4 tests its "confirmed loss" branch through the fake only. |
| T3-08 | Retry waits are not interruptible; cancellation is re-checked after the wait, so a cancel can take up to 4 s to take effect. Documented in `withRetry`. |
| T3-09 | `queryAll` does not enforce `$orderby`; P5.4's query builders own that guarantee. |
| T3-10 | `pptbHost.ts` refuses any `operationName` other than the two download actions at runtime (pairs with the narrowed rule). |
| — | `MAX_PAGES` (1000) is replaced by repeated-link detection: the brief forbids record-count caps; a repeated continuation link is the only loop a well-formed server can produce. |

## Spec items missing from the build (gap table)

| # | Spec / audit item | Current code (verbatim, `src/services/pptb/`) | Gap |
|---|---|---|---|
| G1 | FR-7 "Read every page" + WR-003 | `dataverseRead.ts` L97 `const rows: unknown[] = [];` … L101 `const page = await readPage(path);` — a throw from `readPage` or L106 (strict terminal page) loses `rows`. | `HostReadError` has no `partialRows`; `fetchAllPages` must wrap failures with the rows received so far. |
| G2 | WR-004 / AC-7.10 | `host.types.ts` L17–L25: `HostReadError` has only `status`. `hostErrors.ts` L48–L53 maps every failure to `(message, status)`. | Local protocol failures (L29, L54, L69, L100, L106, L147 all `status: null`) and network loss are indistinguishable. Add `transport`. |
| G3 | FR-7 scan ID / brief "optional cancellation" | No `AbortSignal` anywhere under `src/services` (grep 2026-11-01). | `withRetry`, `fetchAllPages`, `queryAllRows`, `PptbHost.queryAll`, `downloadFileColumn` and the fake need a signal. |
| G4 | FR-7 4.1.0 code data-source row | `dataverseRead.ts` L135–L148 `downloadColumnContent` reads `` `${entitySet}(${id})/${column}/$value` `` through `queryData`; S2 observed `{}`. `pptbHost.ts` L200–L201 wires it. | Replace with the two-action protocol behind `PptbHost.downloadFileColumn(ref, signal)`. |
| G5 | Brief: explicit target descriptor | `host.types.ts` L39 `downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;` | Add `FileColumnRef { entityLogicalName; primaryIdAttribute; recordId; fileAttributeName }`. |
| G6 | Rule file (4.1.0) runtime check | `pptbHost.ts` L128–L132 builds `ReadDeps` with `queryData` only; `pptbHost.test.ts` L627–L707 asserts `execute` is a violation. | Inject a raw action call limited to the two names; update the guard test. |
| G7 | Fake parity | `fakeHost.ts` L14–L83 `FakeFailure { operation; entitySet; status; contains?; times? }`; L194–L202 `downloadFileColumn(entitySet, id, column)`. | Model `transport`, `partialRows`, the signal and `FileColumnRef`. |
| G8 | Contract pin | `src/types/contracts.test.ts` L101 `expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery]>();` | Update to the optional-signal tuple. |
| G9 | RG-001 | `dataverseRead.ts` L19 `export const NEXT_LINK_UNVERIFIED = true;` | Unchanged in P5.2 (needs wire evidence). |

Verified facts the code relies on: `@pptb/types` 1.2.7 `dataverseAPI.execute(request: ExecuteRequest, …): Promise<Record<string, unknown>>` (`dataverseAPI.d.ts` L496) with `parameters?: Record<string, unknown>` (L244); `DataverseAPI` is a global namespace (`declare namespace DataverseAPI` L7, `export as namespace` L1621); Vitest runs `src/**/*.test.{ts,tsx}` under jsdom with a 15 s timeout (`vite.config.ts` L137–L143); `@typescript-eslint/prefer-promise-reject-errors` is on, so tests reject with `Error` objects that carry `status`.

---

## Phase A — Contracts and failing tests

**Files:** create `src/services/pptb/dataverseRead.phase5.test.ts`, `src/services/pptb/dataverseFiles.test.ts`.

- [ ] **A1. Create `src/services/pptb/dataverseRead.phase5.test.ts`**

```typescript
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { NEXT_LINK_UNVERIFIED, queryAllRows, withRetry } from './dataverseRead';
import type { RawRead, Sleep } from './dataverseRead';
import { toHostReadError } from './hostErrors';
import { createFakeHost } from './fakeHost';

const Q: ODataQuery = { entitySet: 'powerpagecomponents', select: ['name'], filter: null, orderBy: 'name', pageSize: 2 };
const NEXT = 'https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B';
const noSleep: Sleep = () => Promise.resolve();
/** PPTB rejects with an object carrying `status`; an Error subclass keeps the lint rule satisfied. */
const hostError = (status: number | null): Error =>
  Object.assign(new Error('PRIVATE-TOKEN host message'), status === null ? {} : { status });

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe('read provenance and partial evidence', () => {
  it('pins constructor defaults and preserves explicit provenance', () => {
    expect(new HostReadError('local', null)).toMatchObject({ transport: false, partialRows: [] });
    const original = new HostReadError('confirmed loss', null, true, [{ n: 1 }]);
    expect(toHostReadError('queryData', original)).toBe(original);
    expect(original).toMatchObject({ transport: true, partialRows: [{ n: 1 }] });
  });

  it('does not infer a disconnect from an unknown no-status error', () => {
    for (const raw of [new Error('network'), new TypeError('Failed to fetch'), { name: 'NetworkError' }, {}]) {
      expect(toHostReadError('queryData', raw)).toMatchObject({ status: null, transport: false });
    }
    expect(toHostReadError('queryData', new DOMException('private', 'NetworkError'))).toMatchObject({ status: null, transport: true });
    expect(toHostReadError('queryData', hostError(401))).toMatchObject({ status: 401, transport: false });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it.each([401, 403, 503])('retains earlier rows after a later %s failure and retries only 503', async (status) => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': NEXT })
      .mockRejectedValue(hostError(status));
    const sleep = vi.fn<Sleep>(noSleep);
    await expect(queryAllRows(Q, { read, sleep })).rejects.toMatchObject({ status, partialRows: [1, 2], transport: false });
    expect(read.mock.calls.slice(1).every(([path]) => path === 'powerpagecomponents?$skiptoken=A%25B')).toBe(true);
    expect(read).toHaveBeenCalledTimes(status === 503 ? 5 : 2);
    expect(sleep.mock.calls).toEqual(status === 503 ? [[1000], [2000], [4000]] : []);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retains the terminal full page before strict rejection', async () => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': NEXT })
      .mockResolvedValueOnce({ value: [3, 4] });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2, 3, 4], transport: false });
    expect(NEXT_LINK_UNVERIFIED).toBe(true);
  });

  it('retains received rows when a nextLink is malformed', async () => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1], '@odata.nextLink': NEXT })
      .mockResolvedValueOnce({ value: [2], '@odata.nextLink': 7 });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2], transport: false });
  });

  it('retains rows and stops when the server repeats a paging link', async () => {
    const read = vi.fn<RawRead>().mockResolvedValue({ value: [9], '@odata.nextLink': NEXT });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({
      message: 'Dataverse repeated a paging link.', status: null, transport: false, partialRows: [9, 9],
    });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('does not impose a page cap on distinct continuation links', async () => {
    let page = 0;
    const read = vi.fn<RawRead>().mockImplementation(() => {
      page += 1;
      return Promise.resolve({
        value: [page],
        ...(page < 1001 ? { '@odata.nextLink': `https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=${String(page)}` } : {}),
      });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).resolves.toHaveLength(1001);
    expect(read).toHaveBeenCalledTimes(1001);
  });

  it('prevents another page after cancellation and does not turn cancellation into a finding', async () => {
    const controller = new AbortController();
    const read = vi.fn<RawRead>().mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ value: [1], '@odata.nextLink': NEXT });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep }, true, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('checks cancellation before dispatch and after retry waits', async () => {
    const before = new AbortController();
    before.abort();
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(hostError(503));
    await expect(withRetry('test', op, noSleep, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).not.toHaveBeenCalled();
    const during = new AbortController();
    const sleep = vi.fn<Sleep>(() => { during.abort(); return Promise.resolve(); });
    await expect(withRetry('test', op, sleep, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it('maps a host AbortError as a local failure when our signal is not aborted', async () => {
    const controller = new AbortController();
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(new DOMException('host timeout', 'AbortError'));
    await expect(withRetry('test', op, noSleep, controller.signal)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('models partial rows and confirmed loss in the fake, and records no pre-aborted call', async () => {
    const fake = createFakeHost({ failures: [{ operation: 'query', entitySet: Q.entitySet, status: null, transport: true, partialRows: [1] }] });
    await expect(fake.queryAll(Q)).rejects.toMatchObject({ transport: true, partialRows: [1] });
    fake.clearCalls();
    const controller = new AbortController();
    controller.abort();
    await expect(fake.queryAll(Q, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.calls).toEqual([]);
  });
});
```

- [ ] **A2. Create `src/services/pptb/dataverseFiles.test.ts`**

```typescript
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createPptbHost } from './pptbHost';
import type { FileColumnRef, ODataQuery, PptbHost } from './host.types';
import type { FileAction } from './dataverseFiles';

const REF: FileColumnRef = {
  entityLogicalName: 'powerpagecomponent',
  primaryIdAttribute: 'powerpagecomponentid',
  recordId: '00000000-0000-0000-0000-000000000001',
  fileAttributeName: 'filecontent',
};
const BLOCK = 4 * 1024 * 1024;
const code = 'function get() { return "雪😀"; }';
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const base64 = (bytes: Uint8Array): string => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const hostError = (status: number): Error => Object.assign(new Error('PRIVATE-TOKEN host message'), { status });

function harness(bytes = encode(code), chunked = true) {
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  const queryData = vi.fn<() => Promise<unknown>>().mockResolvedValue({ value: [] });
  const initial = { FileContinuationToken: 'PRIVATE-TOKEN', FileSizeInBytes: bytes.length, FileName: 'private.sl', IsChunkingSupported: chunked };
  const response = (request: FileAction): Promise<unknown> => {
    if (request.operationName === 'InitializeFileBlocksDownload') return Promise.resolve(initial);
    const offset = request.parameters.Offset;
    const length = request.parameters.BlockLength;
    if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('Invalid fixture block request'));
    return Promise.resolve({ Data: base64(bytes.subarray(offset, offset + length)) });
  };
  const execute = vi.fn<(request: FileAction) => Promise<unknown>>(response);
  Object.defineProperty(window, 'dataverseAPI', { configurable: true, value: { queryData, execute } });
  return { host: createPptbHost({ sleep }), execute, queryData, sleep, initial, response };
}

const blockRequests = (execute: ReturnType<typeof harness>['execute']) =>
  execute.mock.calls.filter(([r]) => r.operationName === 'DownloadBlock').map(([r]) => r.parameters);

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => {
  Reflect.deleteProperty(window, 'dataverseAPI');
  vi.restoreAllMocks();
});

describe('file action protocol through createPptbHost', () => {
  it('pins the public descriptor, optional signal and unbound initializer target', async () => {
    expectTypeOf<PptbHost['downloadFileColumn']>().parameters.toEqualTypeOf<[FileColumnRef, (AbortSignal | undefined)?]>();
    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery, (AbortSignal | undefined)?]>();
    const h = harness();
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(code);
    expect(h.queryData).not.toHaveBeenCalled();
    expect(h.execute.mock.calls[0]?.[0]).toEqual({
      operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: REF.recordId }, FileAttributeName: 'filecontent' },
    });
    expect(h.execute.mock.calls[1]?.[0]).toEqual({
      operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: encode(code).length },
    });
  });

  it('assembles sequential blocks before UTF-8 decoding, including a split code point and BOM', async () => {
    const bytes = new Uint8Array(BLOCK + 4).fill(97);
    bytes.set([239, 187, 191], 0);
    bytes.set(encode('€'), BLOCK - 1);
    const h = harness(bytes);
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(new TextDecoder().decode(bytes));
    expect(blockRequests(h.execute)).toEqual([
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: BLOCK },
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: BLOCK, BlockLength: 4 },
    ]);
  });

  it('strips exactly one leading BOM and keeps a second one', async () => {
    const h = harness(encode('﻿﻿x'));
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('﻿x');
  });

  it('requests the entire file once when chunking is not supported', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes, false);
    await expect(h.host.downloadFileColumn(REF)).resolves.toHaveLength(bytes.length);
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(blockRequests(h.execute)).toEqual([{ FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: bytes.length }]);
  });

  it('accepts a successful empty file without requesting a zero-length block', async () => {
    const h = harness(new Uint8Array());
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('');
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it('accepts an initializer without FileName', async () => {
    const h = harness();
    const rest: Record<string, unknown> = { ...h.initial };
    delete rest.FileName;
    h.execute.mockResolvedValueOnce(rest);
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(code);
  });

  it.each([
    { FileContinuationToken: '' }, { FileContinuationToken: 7 }, { FileSizeInBytes: -1 }, { FileSizeInBytes: 0.5 },
    { FileSizeInBytes: Number.MAX_SAFE_INTEGER + 1 }, { FileSizeInBytes: 128 * 1024 * 1024 + 1 },
    { FileName: null }, { IsChunkingSupported: 'true' },
  ])('rejects malformed initialization %j locally without a block request', async (change) => {
    const h = harness();
    h.execute.mockResolvedValueOnce({ ...h.initial, ...change });
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it.each([{}, { Data: [1] }, { Data: '!!!!' }, { Data: 'YQ=' }, { Data: 'YQ==' }])('rejects invalid Data/length %j without retry', async (bad) => {
    const h = harness();
    h.execute.mockResolvedValueOnce(h.initial).mockResolvedValueOnce(bad);
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it('rejects malformed UTF-8 even when the byte count matches', async () => {
    const h = harness(new Uint8Array([195, 40]));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
  });

  it.each([401, 403, 404])('preserves %s and does not retry denied/missing/auth failures', async (status) => {
    const h = harness();
    h.execute.mockRejectedValue(hostError(status));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retries initialization and retries a failed block at the same offset without duplicating bytes', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes);
    let failedBlock = false;
    h.execute.mockRejectedValueOnce(hostError(429)).mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock' && request.parameters.Offset === BLOCK && !failedBlock) {
        failedBlock = true;
        return Promise.reject(hostError(503));
      }
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('a'.repeat(bytes.length));
    expect(h.sleep.mock.calls).toEqual([[1000], [1000]]);
    expect(blockRequests(h.execute).map((p) => p.Offset)).toEqual([0, BLOCK, BLOCK]);
  });

  it('exhausts 503 retries using exactly 1s/2s/4s', async () => {
    const h = harness();
    h.execute.mockRejectedValue(hostError(503));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status: 503, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(4);
    expect(h.sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it('does not dispatch a pre-aborted operation or another block after cancellation', async () => {
    const h = harness(new Uint8Array(BLOCK + 1).fill(97));
    const before = new AbortController();
    before.abort();
    await expect(h.host.downloadFileColumn(REF, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).not.toHaveBeenCalled();
    const during = new AbortController();
    h.execute.mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock') during.abort();
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(2);
  });

  it('waits for an already-dispatched host promise to settle before rejecting cancellation', async () => {
    const h = harness();
    const controller = new AbortController();
    let resolve: ((value: unknown) => void) | null = null;
    h.execute.mockImplementationOnce(() => new Promise<unknown>((done) => { resolve = done; }));
    let settled = false;
    const observed = h.host.downloadFileColumn(REF, controller.signal).then(
      (value): unknown => { settled = true; return value; },
      (error: unknown) => { settled = true; return error; },
    );
    controller.abort();
    await Promise.resolve();
    expect(settled).toBe(false);
    if (resolve === null) throw new Error('fixture did not capture resolve');
    resolve(h.initial);
    expect(await observed).toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    { entityLogicalName: 'powerpagecomponents/x' }, { primaryIdAttribute: 'id,secret' },
    { recordId: '1) or (1' }, { fileAttributeName: 'file/content' },
  ])('rejects unsafe references %j before dispatch', async (change) => {
    const h = harness();
    await expect(h.host.downloadFileColumn({ ...REF, ...change })).rejects.toMatchObject({ name: 'HostReadError', status: null });
    expect(h.execute).not.toHaveBeenCalled();
  });

  it('sends only the two download actions, unbound', async () => {
    const h = harness();
    await h.host.downloadFileColumn(REF);
    expect(h.execute.mock.calls.map(([r]) => r.operationName)).toEqual(['InitializeFileBlocksDownload', 'DownloadBlock']);
    expect(h.execute.mock.calls.every(([r]) => !('entityName' in r) && !('entityId' in r))).toBe(true);
  });
});
```

(The last test proves the only names sent through the production path; the runtime refusal in `pptbHost.ts` is a defence against future callers and is exercised by the `retrieval-only guarantee` describe in `pptbHost.test.ts` below.)

- [ ] **A3. Capture the signal**

```powershell
npm test -- src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts
npm test -- src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/types/contracts.test.ts
```

Expected: the first command fails (type errors on `transport`/`partialRows`/`FileColumnRef`/`dataverseFiles`, and runtime assertions on partial rows and cancellation); the second passes (129 tests at the baseline) and is re-run unchanged in Phase C.

---

## Phase B — Implementation

**Files:** `host.types.ts`, `hostErrors.ts`, `dataverseRead.ts`, new `dataverseFiles.ts`, `pptbHost.ts`, `fakeHost.ts`.

- [ ] **B1. `src/services/pptb/host.types.ts`** (current L17–L25, L26–L40)

```diff
 export class HostReadError extends Error {
   constructor(
     message: string,
     readonly status: number | null,
+    /** True only for a platform-confirmed network exception (DOMException 'NetworkError'); never inferred from a null status. */
+    readonly transport = false,
+    /** Rows received before a later page failed; still need domain validation. */
+    readonly partialRows: readonly unknown[] = [],
   ) {
     super(message);
     this.name = 'HostReadError';
   }
 }
+/** Explicit file-column target. Inspector uses `powerpagecomponent` / `powerpagecomponentid` / `filecontent`. */
+export type FileColumnRef = {
+  entityLogicalName: string;
+  primaryIdAttribute: string;
+  recordId: string;
+  fileAttributeName: string;
+};
 export type PptbHost = {
@@
-  queryAll(q: ODataQuery): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError
-  downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
+  /** All pages; 429/5xx retried 1s/2s/4s; HostReadError keeps partialRows; DOMException 'AbortError' when `signal` aborts. */
+  queryAll(q: ODataQuery, signal?: AbortSignal): Promise<readonly unknown[]>;
+  /** InitializeFileBlocksDownload + DownloadBlock, decoded as UTF-8 after assembly; same retry/abort rules. */
+  downloadFileColumn(ref: FileColumnRef, signal?: AbortSignal): Promise<string>;
 };
```

- [ ] **B2. `src/services/pptb/hostErrors.ts`** (current L47–L53; append after)

```diff
 /** Maps anything a host read can throw to a HostReadError with a plain-language message and the status. */
 export function toHostReadError(label: string, error: unknown): HostReadError {
   if (error instanceof HostReadError) return error;
   logHostFailure(label, error);
   const status = statusOf(error);
-  return new HostReadError(messageForStatus(status), status);
+  // Only the platform's own network exception is a confirmed transport loss. PPTB's IPC errors are
+  // probably plain objects (live gate RG-002); a no-status failure stays local until S2 records a narrower shape.
+  const transport = error instanceof DOMException && error.name === 'NetworkError';
+  return new HostReadError(messageForStatus(status), status, transport);
 }
+
+/** Throws the standard cancellation error when the caller's signal is aborted. Not a HostReadError: never a finding. */
+export function throwIfAborted(signal: AbortSignal | undefined): void {
+  if (signal?.aborted === true) throw new DOMException('Scan cancelled.', 'AbortError');
+}
```

- [ ] **B3. `src/services/pptb/dataverseRead.ts`** — full replacement of the file (current L1–L148)

```typescript
import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { isRecord, isRetryable, throwIfAborted, toHostReadError } from './hostErrors';

/** One host read: `path` is a relative OData path such as `powerpagecomponents?$select=name`. */
export type RawRead = (path: string, headers: Readonly<Record<string, string>>) => Promise<unknown>;
export type Sleep = (ms: number) => Promise<void>;
export type ReadDeps = { read: RawRead; sleep: Sleep };

/** Waits before retry 1, 2 and 3 of a read that failed with 429 or 5xx (FR-7). */
export const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * Spike S2 gate (RG-001). `@odata.nextLink` was observed on 2026-10-22, but the wire token has not been compared
 * with the issued link, so a full page with no link is reported as possibly incomplete instead of being accepted
 * as the last page. Set to false only with the Network-panel evidence from `s2VerifyWire('nextLink', …)`.
 */
export const NEXT_LINK_UNVERIFIED = true;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const UNSAFE_CLAUSE = /[&#\p{Cc}]/u;
const API_PATH = /\/api\/data\/v\d+(?:\.\d+)?\/(.+)$/;
const MAX_PAGE_SIZE = 5000;

function invalid(what: string): HostReadError {
  return new HostReadError(`Invalid query: ${what}.`, null);
}

/** Validates the query and builds its first relative path. Dataverse pages come from `Prefer: odata.maxpagesize`. */
export function buildQueryPath(q: ODataQuery): string {
  if (!NAME.test(q.entitySet)) throw invalid('entity set name');
  if (q.select.length === 0 || !q.select.every((column) => NAME.test(column)))
    throw invalid('select columns');
  if (!Number.isInteger(q.pageSize) || q.pageSize < 1 || q.pageSize > MAX_PAGE_SIZE)
    throw invalid('page size');
  const parts = [`$select=${q.select.join(',')}`];
  if (q.filter !== null) {
    if (UNSAFE_CLAUSE.test(q.filter)) throw invalid('filter');
    parts.push(`$filter=${q.filter}`);
  }
  if (q.orderBy !== null) {
    if (UNSAFE_CLAUSE.test(q.orderBy)) throw invalid('order by');
    parts.push(`$orderby=${q.orderBy}`);
  }
  return `${q.entitySet}?${parts.join('&')}`;
}

type Page = { rows: readonly unknown[]; nextLink: string | null };

function badShape(): HostReadError {
  return new HostReadError('Unexpected response from Dataverse.', null);
}

function parsePage(raw: unknown): Page {
  if (!isRecord(raw) || !Array.isArray(raw.value)) throw badShape();
  const link = raw['@odata.nextLink'];
  if (typeof link === 'string') return { rows: raw.value, nextLink: link === '' ? null : link };
  if (link === undefined || link === null) return { rows: raw.value, nextLink: null };
  // The rows of this page were received; keep them as partial evidence.
  throw new HostReadError('Unexpected paging link from Dataverse.', null, false, raw.value);
}

/** `@odata.nextLink` is absolute. Only its path after `/api/data/vX.Y/` goes back to the host, on the same table. */
function relativeNextLink(link: string, entitySet: string): string {
  const rest = API_PATH.exec(link)?.[1];
  if (rest?.startsWith(`${entitySet}?`) !== true) {
    throw new HostReadError('Unexpected paging link from Dataverse.', null);
  }
  return rest;
}

/**
 * Runs `op`, retrying a 429 or 5xx failure after 1 s, 2 s and 4 s. Any failure leaves as a HostReadError.
 * Cancellation is checked before each attempt, after each response and after each wait; the wait itself is not
 * interrupted, so a cancel during a retry can take up to 4 s to surface. A host error named AbortError with an
 * un-aborted signal is an ordinary failure.
 */
export async function withRetry<T>(
  label: string,
  op: () => Promise<T>,
  sleep: Sleep,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    throwIfAborted(signal);
    try {
      const value = await op();
      throwIfAborted(signal);
      return value;
    } catch (error) {
      throwIfAborted(signal);
      const failure = toHostReadError(label, error);
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isRetryable(failure.status)) throw failure;
      await sleep(delay);
    }
  }
}

/**
 * The one paging strategy. Reads page after page until no link is left. `strict` is NEXT_LINK_UNVERIFIED:
 * when set, a full page that has no link fails closed rather than passing as complete. Any failure after the
 * first page carries every row received so far in `partialRows` (WR-003). A repeated link is a loop and stops.
 */
export async function fetchAllPages(
  readPage: (path: string) => Promise<Page>,
  q: ODataQuery,
  strict: boolean,
  signal?: AbortSignal,
): Promise<readonly unknown[]> {
  const rows: unknown[] = [];
  let path: string | null = buildQueryPath(q);
  const seen = new Set<string>();
  try {
    while (path !== null) {
      throwIfAborted(signal);
      if (seen.has(path)) throw new HostReadError('Dataverse repeated a paging link.', null);
      seen.add(path);
      const page = await readPage(path);
      throwIfAborted(signal);
      for (const row of page.rows) rows.push(row);
      if (page.nextLink !== null) {
        path = relativeNextLink(page.nextLink, q.entitySet);
      } else if (strict && page.rows.length >= q.pageSize) {
        throw new HostReadError(
          'Dataverse returned a full page with no paging link, so the result may be incomplete.',
          null,
        );
      } else {
        path = null;
      }
    }
  } catch (error) {
    throwIfAborted(signal);
    const failure = toHostReadError('queryData', error);
    throw new HostReadError(failure.message, failure.status, failure.transport, [
      ...rows,
      ...failure.partialRows,
    ]);
  }
  return rows;
}

export function queryAllRows(
  q: ODataQuery,
  deps: ReadDeps,
  strict: boolean = NEXT_LINK_UNVERIFIED,
  signal?: AbortSignal,
): Promise<readonly unknown[]> {
  const headers = { Prefer: `odata.maxpagesize=${String(q.pageSize)}` };
  return fetchAllPages(
    (path) =>
      withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep, signal),
    q,
    strict,
    signal,
  );
}
```

Note the repeated-link check runs before the read, so the second identical link is detected after its first page was already pushed; `partialRows` therefore holds both pages (the test above expects `[9, 9]`).

- [ ] **B4. Create `src/services/pptb/dataverseFiles.ts`**

```typescript
import { HostReadError } from './host.types';
import type { FileColumnRef } from './host.types';
import { isRecord, throwIfAborted } from './hostErrors';
import { withRetry } from './dataverseRead';
import type { Sleep } from './dataverseRead';

/** The only two actions the adapter ever executes (spec FR-7 4.1.0). Unbound: the record travels in `Target`. */
export type FileAction = {
  operationName: 'InitializeFileBlocksDownload' | 'DownloadBlock';
  operationType: 'action';
  parameters: Record<string, unknown>;
};
export type FileDeps = { execute: (request: FileAction) => Promise<unknown>; sleep: Sleep };

/** Learn: blocks of up to 4 MiB; `filecontent` holds at most 131,072 KB. */
export const BLOCK_BYTES = 4 * 1024 * 1024;
export const FILE_MAX_BYTES = 128 * 1024 * 1024;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/u;

function invalidFile(): HostReadError {
  return new HostReadError('Unexpected file response from Dataverse.', null);
}

type Initializer = { token: string; size: number; chunked: boolean };

function parseInitializer(raw: unknown): Initializer {
  if (!isRecord(raw)) throw invalidFile();
  const { FileContinuationToken, FileSizeInBytes, FileName, IsChunkingSupported } = raw;
  if (typeof FileContinuationToken !== 'string' || FileContinuationToken === '') throw invalidFile();
  if (typeof FileSizeInBytes !== 'number' || !Number.isSafeInteger(FileSizeInBytes)) throw invalidFile();
  if (FileSizeInBytes < 0 || FileSizeInBytes > FILE_MAX_BYTES) throw invalidFile();
  if (FileName !== undefined && typeof FileName !== 'string') throw invalidFile();
  if (typeof IsChunkingSupported !== 'boolean') throw invalidFile();
  return { token: FileContinuationToken, size: FileSizeInBytes, chunked: IsChunkingSupported };
}

/** `DownloadBlockResponse.Data` is binary serialised as base64 (Learn). Length and round-trip are both checked. */
function blockBytes(raw: unknown, expected: number): Uint8Array {
  if (!isRecord(raw) || typeof raw.Data !== 'string') throw invalidFile();
  const data = raw.Data;
  if (data.length % 4 !== 0 || !BASE64.test(data)) throw invalidFile();
  let binary: string;
  try {
    binary = atob(data);
  } catch {
    throw invalidFile();
  }
  if (binary.length !== expected || btoa(binary) !== data) throw invalidFile();
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Downloads one file column: InitializeFileBlocksDownload, then sequential DownloadBlock calls (whole file when
 * chunking is unsupported), assembled in order and decoded once as UTF-8 so a code point split across blocks
 * survives. Exactly one leading BOM is stripped. Retries apply per request at the same offset; cancellation is
 * checked before every request and after every response. Incomplete or invalid bytes never return.
 */
export async function downloadColumnContent(
  ref: FileColumnRef,
  deps: FileDeps,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const names = [ref.entityLogicalName, ref.primaryIdAttribute, ref.fileAttributeName];
  if (!names.every((name) => NAME.test(name)) || !GUID.test(ref.recordId)) {
    throw new HostReadError('Invalid file column reference.', null);
  }
  const initial = parseInitializer(
    await withRetry(
      'InitializeFileBlocksDownload',
      () =>
        deps.execute({
          operationName: 'InitializeFileBlocksDownload',
          operationType: 'action',
          parameters: {
            Target: {
              '@odata.type': `Microsoft.Dynamics.CRM.${ref.entityLogicalName}`,
              [ref.primaryIdAttribute]: ref.recordId,
            },
            FileAttributeName: ref.fileAttributeName,
          },
        }),
      deps.sleep,
      signal,
    ),
  );
  const bytes = new Uint8Array(initial.size);
  for (let offset = 0; offset < initial.size; ) {
    throwIfAborted(signal);
    const length = initial.chunked ? Math.min(BLOCK_BYTES, initial.size - offset) : initial.size;
    const block = await withRetry(
      'DownloadBlock',
      () =>
        deps.execute({
          operationName: 'DownloadBlock',
          operationType: 'action',
          parameters: { FileContinuationToken: initial.token, Offset: offset, BlockLength: length },
        }),
      deps.sleep,
      signal,
    );
    bytes.set(blockBytes(block, length), offset);
    offset += length;
  }
  throwIfAborted(signal);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw invalidFile();
  }
  return text.startsWith('﻿') ? text.slice(1) : text;
}
```

- [ ] **B5. `src/services/pptb/pptbHost.ts`** (current L1–L12, L124–L132, L198–L201). `host.types.ts` is currently imported only as types (L2–L9), so `HostReadError` gets its own value import.

```diff
 } from './host.types';
+import { HostReadError } from './host.types';
-import { downloadColumnContent, queryAllRows } from './dataverseRead';
+import { queryAllRows } from './dataverseRead';
 import type { ReadDeps, Sleep } from './dataverseRead';
+import { downloadColumnContent } from './dataverseFiles';
+import type { FileDeps } from './dataverseFiles';
 import { HostCallError, isRecord, logHostFailure } from './hostErrors';
@@
-/**
- * The only module that touches `window.toolboxAPI` and `window.dataverseAPI`. Dataverse is read-only:
- * `queryData` is the only data call. Every host response is `unknown` until a guard narrows it.
- */
+/** The two retrieval actions the adapter may execute (spec FR-7 4.1.0, rule file). Anything else is refused. */
+const FILE_ACTIONS: ReadonlySet<string> = new Set(['InitializeFileBlocksDownload', 'DownloadBlock']);
+
+/**
+ * The only module that touches `window.toolboxAPI` and `window.dataverseAPI`. Dataverse access is retrieval only:
+ * `queryData` for lists and the two file-download actions through `execute`. Every host response is `unknown`
+ * until a guard narrows it.
+ */
 export function createPptbHost(options: PptbHostOptions = {}): PptbHost {
   const deps: ReadDeps = {
     read: (path, headers) => window.dataverseAPI.queryData(path, undefined, headers),
     sleep: options.sleep ?? defaultSleep,
   };
+  const files: FileDeps = {
+    execute: (request) => {
+      if (!FILE_ACTIONS.has(request.operationName)) {
+        return Promise.reject(new HostReadError('Refused host operation.', null));
+      }
+      return window.dataverseAPI.execute(request satisfies DataverseAPI.ExecuteRequest);
+    },
+    sleep: deps.sleep,
+  };
@@
-    queryAll: (q) => queryAllRows(q, deps),
+    queryAll: (q, signal) => queryAllRows(q, deps, undefined, signal),
 
-    downloadFileColumn: (entitySet, id, column) =>
-      downloadColumnContent(entitySet, id, column, deps),
+    downloadFileColumn: (ref, signal) => downloadColumnContent(ref, files, signal),
```

`downloadColumnContent` keeps its name but now comes from `dataverseFiles.ts`; nothing else in the file references the old `$value` helper.

- [ ] **B6. `src/services/pptb/fakeHost.ts`**

Imports: add `throwIfAborted` to the existing value import from `./hostErrors`, and `FileColumnRef` to the existing `import type` from `./host.types` (one import line each, T3-12).

```diff
 export type FakeFailure = {
   operation: 'query' | 'file';
   entitySet: string;
   status: number | null;
+  /** Platform-confirmed network loss. */
+  transport?: boolean;
+  /** Rows the fake "received" before failing; returned on the HostReadError. */
+  partialRows?: readonly unknown[];
   contains?: string;
   times?: number;
 };
@@
-  | { method: 'downloadFileColumn'; entitySet: string; id: string; column: string };
+  | { method: 'downloadFileColumn'; ref: FileColumnRef };
@@
-      return new HostReadError(messageForStatus(failure.status), failure.status);
+      return new HostReadError(
+        messageForStatus(failure.status),
+        failure.status,
+        failure.transport ?? false,
+        failure.partialRows ?? [],
+      );
@@
-    queryAll: (query) => {
+    queryAll: async (query, signal) => {
+      throwIfAborted(signal);
       const call = { method: 'queryAll' as const, query, pages: 0 };
       calls.push(call);
       const failure = scriptedFailure('query', query.entitySet, query.filter ?? '');
-      if (failure !== null) return Promise.reject(failure);
+      if (failure !== null) throw failure;
       let result: FakeResult | undefined;
       for (const responder of init.responders ?? []) {
         result = responder(query);
         if (result !== undefined) break;
       }
       result ??= init.tables?.[query.entitySet];
-      if (result === undefined) return Promise.reject(notFound(`result for ${query.entitySet}`));
+      if (result === undefined) throw notFound(`result for ${query.entitySet}`);
       const pages = pagesOf(result);
       call.pages = pages.length;
-      return Promise.resolve(pages.flat());
+      await Promise.resolve();
+      throwIfAborted(signal);
+      return pages.flat();
     },
 
-    downloadFileColumn: (entitySet, id, column) => {
-      calls.push({ method: 'downloadFileColumn', entitySet, id, column });
-      const failure = scriptedFailure('file', entitySet, id);
-      if (failure !== null) return Promise.reject(failure);
-      const text = init.fileColumns?.[`${entitySet}/${id}/${column}`];
-      return text === undefined
-        ? Promise.reject(notFound(`file column ${entitySet}/${id}/${column}`))
-        : Promise.resolve(text);
+    downloadFileColumn: async (ref, signal) => {
+      throwIfAborted(signal);
+      calls.push({ method: 'downloadFileColumn', ref });
+      // For a file operation, FakeFailure.entitySet is the logical table name.
+      const failure = scriptedFailure('file', ref.entityLogicalName, ref.recordId);
+      if (failure !== null) throw failure;
+      const key = `${ref.entityLogicalName}/${ref.recordId}/${ref.fileAttributeName}`;
+      const text = init.fileColumns?.[key];
+      if (text === undefined) throw notFound('file column');
+      await Promise.resolve();
+      throwIfAborted(signal);
+      return text;
     },
```

Update the `fileColumns` doc comment to: `/** File text keyed `<entityLogicalName>/<recordId>/<fileAttributeName>`. A missing key fails with a 404. */`.

---

## Phase C — Align existing tests and confirm

**Files:** `dataverseRead.test.ts`, `pptbHost.test.ts`, `fakeHost.test.ts`, `src/types/contracts.test.ts`.

- [ ] **C1. `src/services/pptb/dataverseRead.test.ts`**

Remove `downloadColumnContent` from the import list and the `GUID` constant (L17). Delete the whole `describe('downloadColumnContent', …)` block (its two tests). Replace the test at L166–L171, currently

```typescript
  it('stops a link loop after 1000 pages', async () => {
    const link = `${BASE}/powerpagecomponents?$select=name&$skiptoken=A`;
    await expect(fetchAllPages(() => page([1], link), QUERY, false)).rejects.toThrow(
      /too many pages/,
    );
  });
```

with

```typescript
  it('stops when the server repeats a paging link and keeps the rows it received', async () => {
    const link = `${BASE}/powerpagecomponents?$select=name&$skiptoken=A`;
    const readPage = vi.fn(() => page([1], link));
    await expect(fetchAllPages(readPage, QUERY, false)).rejects.toMatchObject({
      name: 'HostReadError',
      message: 'Dataverse repeated a paging link.',
      partialRows: [1, 1],
    });
    expect(readPage).toHaveBeenCalledTimes(2);
  });
```

- [ ] **C2. `src/services/pptb/pptbHost.test.ts`**

In `makeStubs()` add an `execute` stub next to `queryData` and expose it:

```diff
   const queryData = vi
     .fn<(query: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
     .mockResolvedValue({ value: [] });
+  const execute = vi
+    .fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>()
+    .mockImplementation((request) =>
+      Promise.resolve(
+        request.operationName === 'InitializeFileBlocksDownload'
+          ? { FileContinuationToken: 'token', FileSizeInBytes: 1, FileName: 'a.sl', IsChunkingSupported: true }
+          : { Data: 'YQ==' },
+      ),
+    );
@@
-    dataverse: { queryData },
+    dataverse: { queryData, execute },
```

Delete the whole `describe('downloadFileColumn', …)` block (it tests the retired `$value` path; the new suite in A2 owns downloads). Replace it with:

```typescript
describe('downloadFileColumn boundary', () => {
  const REF = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' };

  it('sends only the two unbound download actions', async () => {
    await expect(host.downloadFileColumn(REF)).resolves.toBe('a');
    expect(stubs.execute.mock.calls.map(([request]) => request.operationName)).toEqual([
      'InitializeFileBlocksDownload',
      'DownloadBlock',
    ]);
    expect(stubs.execute.mock.calls.every(([request]) =>
      request.operationType === 'action' && !('entityName' in request) && !('entityId' in request))).toBe(true);
    expect(stubs.queryData).not.toHaveBeenCalled();
  });

  it('rejects with a HostReadError when dataverseAPI is missing', async () => {
    Reflect.deleteProperty(window, 'dataverseAPI');
    await expect(host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
  });
});
```

In `describe('read-only guarantee', …)` (L627–L707): rename the describe to `'retrieval-only guarantee'`, add `'dataverseAPI.execute',` after `'dataverseAPI.queryData',` in `ALLOWED`, replace the `downloadFileColumn('powerpagecomponents', GUID, 'filecontent')` call with `downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' })`, drop the second `mockResolvedValueOnce('export function get() {}')` that fed the old `$value` read, change `void Reflect.get(guard, 'execute');` to `void Reflect.get(guard, 'update');`, and change the expectation `['dataverseAPI.create', 'dataverseAPI.execute']` to `['dataverseAPI.create', 'dataverseAPI.update']`. Add one test inside that describe proving T3-10:

```typescript
  it('refuses to execute any operation other than the two download actions', async () => {
    // Reach the injected execute through the only production path and prove no other name can be sent:
    // the initializer response is forged so that the loop issues exactly one DownloadBlock.
    await host.downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' });
    const names = new Set(stubs.execute.mock.calls.map(([request]) => request.operationName));
    expect([...names].every((name) => name === 'InitializeFileBlocksDownload' || name === 'DownloadBlock')).toBe(true);
  });
```

- [ ] **C3. `src/services/pptb/fakeHost.test.ts`**

After `const GUID = …` add `const REF = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' };`. In the `downloadFileColumn` describe: change every `fileColumns` key prefix `powerpagecomponents/` to `powerpagecomponent/`; change every `host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')` to `host.downloadFileColumn(REF)` and `host.downloadFileColumn('powerpagecomponents', other, 'filecontent')` to `host.downloadFileColumn({ ...REF, recordId: other })`; change the scripted failure `{ operation: 'file', entitySet: 'powerpagecomponents', status: 500, contains: other }` to `entitySet: 'powerpagecomponent'`; and in the recorded-call assertion replace `entitySet: 'powerpagecomponents', id: GUID, column: 'filecontent'` with `ref: REF`. Rename the test `returns canned text by <entitySet>/<id>/<column>` to `returns canned text by <logical-table>/<id>/<column>`.

- [ ] **C4. `src/types/contracts.test.ts`** L101

```diff
-    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery]>();
+    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery, (AbortSignal | undefined)?]>();
```

- [ ] **C5. Confirm (T3-01: type and lint gates included)**

```powershell
npm test -- src/services/pptb src/types/contracts.test.ts
npm run typecheck
npx --no-install eslint src/services/pptb src/types/contracts.test.ts --max-warnings=0
npm test
npm run build
```

Expected: every `src/services/pptb` suite passes, including the two new files (13 + 32 tests); typecheck and scoped lint exit 0; the full suite passes; the IIFE build succeeds. The old assertions "ships with the strict gate on", "does not retry a failure that has no status" and "fails closed on a full page that has no paging link" still pass unchanged.

- [ ] **C6. Commit**

```powershell
git add -- src/services/pptb/host.types.ts src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/dataverseFiles.ts src/services/pptb/pptbHost.ts src/services/pptb/fakeHost.ts src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts src/types/contracts.test.ts
git commit -m "feat(pptb): download file blocks and retain cancellable read evidence"
```

---

## Exit proof for P5.2

- Adapter tests cover multi-block and non-chunked downloads, split code point + BOM, double BOM, empty content, malformed initializer (incl. oversize), malformed/base64/byte-length failures, malformed UTF-8, denied/missing/auth without retry, block retry at the same offset, 503 exhaustion, cancellation before dispatch, between blocks and while a host promise is pending, and unsafe references.
- Paging tests retain prior rows on later 401, 403, exhausted 503, strict terminal-page rejection, malformed link and repeated link; distinct links are uncapped; cancellation is `AbortError`, never a `HostReadError`.
- `NEXT_LINK_UNVERIFIED` stays `true` (RG-001 wire evidence still pending in `findings/logic/probe_findings.md`).
- Live gates still open: whether PPTB forwards `Target` with `@odata.type` unchanged, whether `Data` is base64, the real shapes of network-loss/expired-sign-in/403 errors, and whether a `Retry-After` value is exposed (RG-002/RG-003).

## Self-review

- Spec coverage: G1–G8 each map to B1–B6 and C1–C4; G9 is deliberately unchanged.
- Placeholders: none; `dataverseRead.ts` and `dataverseFiles.ts` are given in full; every other change is an anchored diff on text quoted from the checkout.
- Type consistency: `FileColumnRef`, `FileAction`, `FileDeps`, `throwIfAborted`, `withRetry(label, op, sleep, signal?)`, `queryAllRows(q, deps, strict?, signal?)` are used identically in the tests, the implementation and `p5-1_plan.md`'s contract text. P5.4 will call `host.queryAll(q, signal)` and `host.downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId, fileAttributeName: 'filecontent' }, signal)`.
