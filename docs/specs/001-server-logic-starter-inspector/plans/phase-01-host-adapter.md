# Phase 01: PPTB host adapter + fake

**Implements:** FR-7 (Dataverse reads: every page, a bounded 429/5xx retry at 1 s, 2 s and 4 s, read-only), FR-12 (one `toolboxAPI.events.on` registration, removed on unsubscribe), FR-1 (the host side of `showNotification` and `openInConnectionBrowser`: reject on failure so the app layer can fall back), NFR Security (no tokens, read-only, only error names logged) | **Satisfies:** no AC row of its own. It supplies the host behaviour that AC-1.6 (theme, light on failure), AC-4.9 and AC-6.7 (copy), AC-5.6, AC-5.10 and AC-9.3 (save, cancel), AC-7.5 and AC-7.11 (environment label, Unknown), AC-7.6 (connection events) and AC-7.7 (a failed read) build on, and the reject half of the Error Scenario "`showNotification` missing, throws or rejects".
**Depends on:** 00
**Files:**
- Replace the Phase 00 stubs: `src/services/pptb/pptbHost.ts`, `src/services/pptb/fakeHost.ts` (whole files).
- Create: `src/services/pptb/hostErrors.ts`, `src/services/pptb/dataverseRead.ts`.
- Create tests: `src/services/pptb/dataverseRead.test.ts`, `src/services/pptb/pptbHost.test.ts`, `src/services/pptb/fakeHost.test.ts`. If Phase 00 left a placeholder test at one of these paths, overwrite it.
- Edits no other file. `src/services/pptb/host.types.ts` stays exactly as Phase 00 committed it.

**Interfaces:**
- **Consumes** (Phase 00 contracts, unchanged), from `src/services/pptb/host.types.ts`: `ThemeName`, `NoticeType`, `Notice`, `EnvironmentLabel`, `Connection`, `HostEvent`, `FileFilter`, `SaveResult`, `ODataQuery`, `HostReadError`, `PptbHost`. Also `@pptb/types` 1.2.7 or later (installed in Phase 00), which declares `window.toolboxAPI` and `window.dataverseAPI`.
- **Produces** (exact names; later phases rely on them):
  - `src/services/pptb/pptbHost.ts`: `createPptbHost(options?: PptbHostOptions): PptbHost` and `type PptbHostOptions = { sleep?: (ms: number) => Promise<void> }`. The pinned `createPptbHost(): PptbHost` call still compiles; `options` exists only so tests can inject the retry sleep.
  - `src/services/pptb/fakeHost.ts`: `createFakeHost(init?: FakeHostInit): PptbHost & FakeHostControls`, and the types `FakeHostInit`, `FakeHostControls`, `FakeCall`, `FakeFailure`, `FakeResult`, `FakeResponder`, `NotifyBehaviour`, `SaveBehaviour`, `SimpleBehaviour`, `SavedFile`.
  - Folder-internal, not for other folders: `hostErrors.ts` (`HostCallError`, `isRecord`, `errorName`, `statusOf`, `logHostFailure`, `messageForStatus`, `isRetryable`, `toHostReadError`) and `dataverseRead.ts` (`buildQueryPath`, `withRetry`, `fetchAllPages`, `queryAllRows`, `downloadColumnContent`, `RETRY_DELAYS_MS`, `NEXT_LINK_UNVERIFIED`). Phase 12 edits `dataverseRead.ts` and nothing else here.
- **Behaviour later phases may rely on** (the real adapter and the fake both follow it):
  - No `PptbHost` method throws synchronously. A failure is always a rejected promise.
  - `getTheme` never rejects: it resolves `'light'` when the host fails, is missing or answers with anything but `'dark'`.
  - `notify`, `copyText`, `openExternal` and `saveFile` reject with a `HostCallError` (`name === 'HostCallError'`) when the host member is missing, throws or rejects. `getActiveConnection` does the same for a malformed answer, and resolves `null` for "no connection". The adapter has already logged the failure by error name, so the app layer (Phase 06's `useNotify`) shows its fallback toast and does not log it again.
  - `notify` passes `duration: 0` for `type: 'error'` and no `duration` for the other types.
  - `saveFile` resolves `{ status: 'cancelled' }` when the user cancels and `{ status: 'saved', path }` otherwise. Bytes go to the host as given.
  - `queryAll` and `downloadFileColumn` reject only with `HostReadError`. `status` is the HTTP status when the host gave one and `null` otherwise. A 429 or 5xx has already been retried three times when the error reaches the caller. `message` is plain language and never carries a host message, body or URL.
  - `onEvent` calls `toolboxAPI.events.on` once per host, on the first handler, and returns an unsubscribe. `connection:created`, `connection:updated` and `connection:deleted` become `{ kind: 'connection-changed' }`, `settings:updated` becomes `{ kind: 'settings-updated' }`, and every other event becomes `{ kind: 'other', name }`.
  - `createFakeHost` follows the contract above with these test controls:
    - `emit(event)` delivers an event to the handlers, and `listenerCount()` says how many are subscribed.
    - `calls` and `callsOf(method)` are the recorded calls, in order, and a failed call is recorded too. `clearCalls()` empties them.
    - `savedFiles` holds each file the fake saved, with its content.
    - `setTheme`, `setConnection`, `setNotify`, `setSave`, `setCopy` and `setOpenExternal` change behaviour mid-test. `setConnection` does not emit; call `emit({ kind: 'connection-changed' })` as well.
    - `queryAll` answers from `responders` first (in order), then from `tables[entitySet]`. It returns every row of every page and applies no `$select` or `$filter`. An entity set nobody scripted rejects with a 404 `HostReadError`, so a test that reads an unscripted table fails loudly.
    - `failures` script a `HostReadError` that stands for a read that has already used its retries, so the fake throws at once and never waits.
    - `downloadFileColumn` answers from `fileColumns["<entitySet>/<id>/<column>"]`, and rejects with a 404 `HostReadError` for a key nobody scripted.

This phase writes the one module that touches `window.toolboxAPI` and `window.dataverseAPI`, and the in-memory fake that every later phase's tests use in its place. The adapter owns Dataverse paging, a bounded retry, and the mapping of every host failure to a plain-language `HostReadError`. Spike S2 is still open, so the three things the PPTB docs do not show (`@odata.nextLink`, a file-column download, `events.off`) are isolated where Phase 12 can change them.

## Host API grounding

Read from https://docs.powerplatformtoolbox.com/tool-development/api-reference (the toolbox-api, dataverse-api, events, filesystem-api, additional-headers and error-handling pages) and the `@pptb/types` 1.2.7 declarations on 2026-10-16.

| `PptbHost` member | Host call | Source and note |
|---|---|---|
| `getTheme` | `toolboxAPI.utils.getCurrentTheme()` | toolbox-api, Utils. Resolves `'light' \| 'dark'`. |
| `notify` | `toolboxAPI.utils.showNotification({ title, body, type, duration? })` | toolbox-api, Utils. `duration` is milliseconds and `0` is persistent (error-handling page). |
| `copyText` | `toolboxAPI.utils.copyToClipboard(text)` | toolbox-api, Utils. |
| `saveFile` | `toolboxAPI.fileSystem.saveFile(defaultPath, content, filters?)` | filesystem-api (v1.0.20). Resolves the path, or `null` on cancel. The docs type `content` as `string \| Buffer`; whether a `Uint8Array` survives the IPC is a Spike S2 item. |
| `openExternal` | `toolboxAPI.utils.openInConnectionBrowser(url)` | toolbox-api, Utils (v1.2.2). Only `https:` and `http:` URLs are allowed, so the adapter checks the scheme first. |
| `getActiveConnection` | `toolboxAPI.connections.getActiveConnection()` | toolbox-api, Connections. `Connection.environment` is `'Dev' \| 'Test' \| 'UAT' \| 'Production'`. No `connectionTarget` is passed, because the manifest allows at most one connection and the default is primary. |
| `onEvent` | `toolboxAPI.events.on(handler)` and `toolboxAPI.events.off(handler)` | The events page documents `on` and the handler `(event, payload: { event, data, timestamp })`. `off` is declared in `@pptb/types` 1.2.7 but is not on the docs page (Spike S2). |
| `queryAll` | `dataverseAPI.queryData(odataQuery, connectionTarget?, additionalHeaders?)` | dataverse-api, Queries. The docs type the result as `{ value }` only. The additional-headers page documents `Prefer: odata.maxpagesize=500` ("Set a preferred page size for a query"). |
| `downloadFileColumn` | `dataverseAPI.queryData('<set>(<id>)/<column>/$value')` | **Not documented.** PPTB has no file-download call, so this is the generic read from FR-7's data-source table. Spike S2 decides whether it works and in what shape the content comes back. |

## Decisions (recorded here so later phases do not re-argue them)

1. **Paging uses `Prefer: odata.maxpagesize`, not `$top`.** `.claude/rules/pptb-host-and-output.md` says to use `$select` and `$top` on every `queryData` call and to page through the results. Microsoft Learn ("Page results using OData") says not to use `$top` with `Prefer: odata.maxpagesize`: if both are sent, `$top` is ignored, and `$top` alone returns no next link. So `$top` and paging cannot be combined. Every call carries `$select`; the page size is `ODataQuery.pageSize`, sent as the `Prefer` header on every page (Learn: use the same value on every request of one query). The owner should amend that rules line. Learn also says to give a paged query a deterministic order, so Phase 15 should pass `orderBy` (the primary key is enough).
2. **The paging strategy lives in one function and fails closed.** `fetchAllPages` in `dataverseRead.ts` is the only place that knows how pages are walked. The `queryData` docs show only `value`, so until Spike S2 proves `@odata.nextLink` comes through, `NEXT_LINK_UNVERIFIED` is `true` and a full page with no link rejects ("may be incomplete") instead of passing as the last page. That keeps the Inspector from silently reviewing a truncated inventory (F35). The price while the gate is on is a false failure when a table has an exact multiple of the page size. Phase 12 sets the constant to `false` if S2 confirms the link, or swaps the body of `fetchAllPages` for FetchXML paging-cookie paging if it does not.
3. **A next link is never fetched.** The host would only get the path after `/api/data/vX.Y/`, and only when it starts with the same entity set. Any other link rejects. Link loops stop after 1000 pages.
4. **Typed property access, not path strings.** Each host call is written as a direct `window.toolboxAPI.utils.…` expression, so `tsc` checks it against `@pptb/types`, and the read-only test proxies exactly those members. A missing member throws a `TypeError` at call time, which `hostCall` turns into a `HostCallError`.
5. **`createPptbHost` takes an optional `options` argument** for the injectable sleep. Callers that pass nothing (`createPptbHost()`) are unaffected.
6. **`warning` notices pass no `duration`.** FR-1 names `duration: 0` only for errors and no duration for success and info. A warning follows the user's PPTB notification duration.
7. **Query text is checked, not escaped.** `entitySet`, `select` names and a file-column reference must match `[A-Za-z_][A-Za-z0-9_]*` (ids must be GUIDs). `filter` and `orderBy` must not contain `&`, `#` or a control character, because the host receives the string raw and an `&` would add a query option. A caller that needs a literal ampersand writes `%26`. A violation rejects with a `HostReadError` before any host call.
8. **Logging is `console.error('PPTB host call failed: <label>', <error name>, <status or ''>)`.** The label is a fixed member name. A host message, body, URL or token is never logged. Tests assert this with a sentinel string.
9. **Two files, not one, for the Dataverse side.** `dataverseRead.ts` takes `read` and `sleep` as arguments and never touches `window`, so its tests need no host stub. `pptbHost.ts` is the only file with `window.toolboxAPI` or `window.dataverseAPI` (the Phase verification greps for it).

## Spike S2 hand-off (what Phase 12 checks and where it edits)

| S2 question | If the answer is no or different, change |
|---|---|
| Does `queryData` return `@odata.nextLink`? | Yes: set `NEXT_LINK_UNVERIFIED` to `false` in `dataverseRead.ts`, and change the two tests that pin it ("ships with the strict gate on…" in `dataverseRead.test.ts`, "fails closed on a full page…" in `pptbHost.test.ts`). No: replace the body of `fetchAllPages` with `fetchXmlQuery` paging (`@Microsoft.Dynamics.CRM.fetchxmlpagingcookie`) and keep its signature. |
| Does `queryData` honour the third argument `{ Prefer: 'odata.maxpagesize=N' }`, and does it hand back `@odata.nextLink` untouched? Is the relative path from the link accepted as is (no double encoding of `$skiptoken`)? | `queryAllRows` and `relativeNextLink` in `dataverseRead.ts`. |
| Does `queryData('<set>(<id>)/filecontent/$value')` return the file text? In what shape (string, `{ value }`, base64, bytes)? | `downloadColumnContent` in `dataverseRead.ts`. If `queryData` cannot read a file column, the only other documented route is `dataverseAPI.execute` with a function, which the read-only rule forbids today, so that needs a spec and rules change first. |
| Does the error object carry `status` for 429 and 5xx, as the error-handling page says? | `statusOf` in `hostErrors.ts`. The retry depends on it. |
| Is `toolboxAPI.events.off` present at runtime, and does `connection:updated` fire when the active connection changes? | `createEventHub` in `pptbHost.ts`. |
| Does `fileSystem.saveFile` accept a `Uint8Array`? | `saveFile` in `pptbHost.ts` (convert there if the host needs a different byte type). |
| What does `getActiveConnection().environment` hold for a connection the user never labelled? | `toEnvironment` in `pptbHost.ts`. It already maps anything unrecognised to `'Unknown'`. |

---

- [ ] **Step 0: Preflight**

  Run from the repo root:

  ```bash
  git status --short
  ls src/services/pptb/
  grep -n "not implemented: phase 01" src/services/pptb/pptbHost.ts src/services/pptb/fakeHost.ts
  npm ls @pptb/types vitest jsdom
  ```

  Expect: `host.types.ts`, `pptbHost.ts` and `fakeHost.ts` are present, the grep prints each stub's `throw`, and `npm ls` lists `@pptb/types@1.2.7` or later, `vitest` and `jsdom`. If Phase 00 left a test that asserts a stub throws (`grep -rn "not implemented: phase 01" src --include=*.test.ts`), delete that one assertion in the first commit of this phase. Do not touch any other file. The tests here start with `// @vitest-environment jsdom` where they need `window`, so they pass whatever the project's default Vitest environment is.

- [ ] **Step 1: Write the Dataverse read tests**

  Create `src/services/pptb/dataverseRead.test.ts`. It covers the error mapping, query building, the retry schedule, the paging strategy and the file read without any `window` stub, because `dataverseRead.ts` receives `read` and `sleep` as arguments.

  ```ts file=src/services/pptb/dataverseRead.test.ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
  import { HostReadError } from './host.types';
  import type { ODataQuery } from './host.types';
  import {
    NEXT_LINK_UNVERIFIED,
    RETRY_DELAYS_MS,
    buildQueryPath,
    downloadColumnContent,
    fetchAllPages,
    queryAllRows,
    withRetry,
  } from './dataverseRead';
  import type { RawRead, Sleep } from './dataverseRead';
  import { isRetryable, messageForStatus, statusOf, toHostReadError } from './hostErrors';

  const BASE = 'https://org.crm.dynamics.com/api/data/v9.2';
  const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

  const QUERY: ODataQuery = {
    entitySet: 'powerpagecomponents',
    select: ['powerpagecomponentid', 'name'],
    filter: 'powerpagecomponenttype eq 35',
    orderBy: 'name',
    pageSize: 2,
  };

  const noSleep = (): Promise<void> => Promise.resolve();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hostErrors', () => {
    it('reads a numeric status from a PPTB error object or an Error', () => {
      expect(statusOf({ message: 'x', status: 429, statusText: 'Too Many Requests' })).toBe(429);
      expect(statusOf(Object.assign(new Error('x'), { status: 503 }))).toBe(503);
      expect(statusOf(new Error('x'))).toBeNull();
      expect(statusOf('boom')).toBeNull();
      expect(statusOf({ status: '404' })).toBeNull();
    });

    it('retries only 429 and 5xx', () => {
      expect([429, 500, 502, 503, 599].map(isRetryable)).toEqual([true, true, true, true, true]);
      expect([null, 400, 401, 403, 404, 600].map(isRetryable)).toEqual([false, false, false, false, false, false]);
    });

    it('maps every status to a plain-language message', () => {
      expect(messageForStatus(401)).toBe('Authentication failed. Please reconnect.');
      expect(messageForStatus(403)).toBe("You don't have permission to read this data.");
      expect(messageForStatus(404)).toBe('The requested data was not found.');
      expect(messageForStatus(429)).toBe('Too many requests. Please wait and try again.');
      expect(messageForStatus(503)).toBe('The server had a problem. Please try again later.');
      expect(messageForStatus(null)).toBe("Couldn't read data from Dataverse.");
      expect(messageForStatus(418)).toBe("Couldn't read data from Dataverse.");
    });

    it('keeps a HostReadError as it is and logs only the error name for anything else', () => {
      const log = vi.mocked(console.error);
      const own = new HostReadError('Already mapped.', 404);
      expect(toHostReadError('queryData', own)).toBe(own);
      expect(log).not.toHaveBeenCalled();

      const mapped = toHostReadError('queryData', { message: 'SECRET-BODY https://org.example/x', status: 403 });
      expect(mapped).toBeInstanceOf(HostReadError);
      expect(mapped.status).toBe(403);
      expect(mapped.message).not.toContain('SECRET');
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
    });
  });

  describe('buildQueryPath', () => {
    it('builds select, filter and order by on the entity set, with no $top', () => {
      expect(buildQueryPath(QUERY)).toBe(
        'powerpagecomponents?$select=powerpagecomponentid,name&$filter=powerpagecomponenttype eq 35&$orderby=name',
      );
    });

    it('leaves out a null filter and a null order by', () => {
      expect(buildQueryPath({ ...QUERY, filter: null, orderBy: null })).toBe(
        'powerpagecomponents?$select=powerpagecomponentid,name',
      );
    });

    it.each<[string, Partial<ODataQuery>]>([
      ['an entity set with a slash', { entitySet: 'powerpagecomponents/x' }],
      ['an empty entity set', { entitySet: '' }],
      ['no select columns', { select: [] }],
      ['a select column with a comma', { select: ['a,b'] }],
      ['a filter with an ampersand', { filter: "name eq 'a' & $top=1" }],
      ['a filter with a hash', { filter: 'name eq 1#x' }],
      ['a filter with a line break', { filter: 'name eq 1\nx' }],
      ['an order by with an ampersand', { orderBy: 'name&x' }],
      ['a page size of 0', { pageSize: 0 }],
      ['a page size above 5000', { pageSize: 5001 }],
      ['a fractional page size', { pageSize: 1.5 }],
    ])('rejects %s', (_label, change) => {
      expect(() => buildQueryPath({ ...QUERY, ...change })).toThrow(HostReadError);
    });
  });

  describe('withRetry', () => {
    it('retries 429 and 5xx after 1 s, 2 s and 4 s, then throws the last failure', async () => {
      expect(RETRY_DELAYS_MS).toEqual([1000, 2000, 4000]);
      const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
      const op = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 503, message: 'down' });
      await expect(withRetry('test', op, sleep)).rejects.toMatchObject({ name: 'HostReadError', status: 503 });
      expect(op).toHaveBeenCalledTimes(4);
      expect(sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
    });

    it('returns the result as soon as a retry succeeds', async () => {
      const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
      const op = vi.fn<() => Promise<string>>().mockRejectedValueOnce({ status: 429 }).mockResolvedValue('ok');
      await expect(withRetry('test', op, sleep)).resolves.toBe('ok');
      expect(sleep.mock.calls).toEqual([[1000]]);
    });

    it.each([404, 401, 403, null])('does not retry a failure with status %s', async (status) => {
      const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
      const op = vi.fn<() => Promise<string>>().mockRejectedValue(status === null ? new Error('x') : { status });
      await expect(withRetry('test', op, sleep)).rejects.toMatchObject({ name: 'HostReadError', status });
      expect(op).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  });

  describe('fetchAllPages', () => {
    const page = (rows: unknown[], nextLink: string | null) => Promise.resolve({ rows, nextLink });

    it('accepts a full last page when the strict gate is off', async () => {
      const rows = await fetchAllPages(() => page([1, 2], null), QUERY, false);
      expect(rows).toEqual([1, 2]);
    });

    it('fails closed on a full page with no link when the strict gate is on', async () => {
      await expect(fetchAllPages(() => page([1, 2], null), QUERY, true)).rejects.toThrow(/may be incomplete/);
    });

    it('stops a link loop after 1000 pages', async () => {
      const link = `${BASE}/powerpagecomponents?$select=name&$skiptoken=A`;
      await expect(fetchAllPages(() => page([1], link), QUERY, false)).rejects.toThrow(/too many pages/);
    });

    it('ships with the strict gate on until Spike S2 confirms @odata.nextLink', () => {
      expect(NEXT_LINK_UNVERIFIED).toBe(true);
    });
  });

  describe('queryAllRows', () => {
    it('sends the page size as a Prefer header on every page', async () => {
      const read = vi.fn<RawRead>().mockResolvedValue({ value: [1] });
      await queryAllRows({ ...QUERY, pageSize: 5 }, { read, sleep: noSleep });
      expect(read).toHaveBeenCalledWith(expect.any(String), { Prefer: 'odata.maxpagesize=5' });
    });
  });

  describe('downloadColumnContent', () => {
    it('reads <set>(<id>)/<column>/$value and returns text', async () => {
      const read = vi.fn<RawRead>().mockResolvedValue('export function get() {}');
      const text = await downloadColumnContent('powerpagecomponents', GUID, 'filecontent', { read, sleep: noSleep });
      expect(text).toBe('export function get() {}');
      expect(read).toHaveBeenCalledWith(`powerpagecomponents(${GUID})/filecontent/$value`, {});
    });
  });
  ```

- [ ] **Step 2: Run the tests and confirm they FAIL**

  ```bash
  npx vitest run src/services/pptb/dataverseRead.test.ts
  ```

  Expect: FAIL. The file does not load: `Failed to resolve import "./dataverseRead" from "src/services/pptb/dataverseRead.test.ts"`, with "Test Files 1 failed" and no tests run, because neither `dataverseRead.ts` nor `hostErrors.ts` exists yet.

- [ ] **Step 3: Implement `hostErrors.ts`**

  Create `src/services/pptb/hostErrors.ts` (whole file).

  ```ts file=src/services/pptb/hostErrors.ts
  import { HostReadError } from './host.types';

  /** A host call that is not a Dataverse read (theme, notify, copy, save, open, connection) failed or returned junk. */
  export class HostCallError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'HostCallError';
    }
  }

  /** True for any non-null object, arrays included. Callers narrow the members they read. */
  export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  export function errorName(error: unknown): string {
    return error instanceof Error ? error.name : 'NonError';
  }

  /** PPTB's error object carries a numeric `status` (error-handling docs); anything else reads as no status. */
  export function statusOf(error: unknown): number | null {
    if (!isRecord(error)) return null;
    const status = error.status;
    return typeof status === 'number' && Number.isInteger(status) ? status : null;
  }

  /** Technical detail goes to the console by error name and status only: never a message, body, URL or token. */
  export function logHostFailure(label: string, error: unknown): void {
    const status = statusOf(error);
    console.error(`PPTB host call failed: ${label}`, errorName(error), status ?? '');
  }

  export function messageForStatus(status: number | null): string {
    if (status === 401) return 'Authentication failed. Please reconnect.';
    if (status === 403) return "You don't have permission to read this data.";
    if (status === 404) return 'The requested data was not found.';
    if (status === 429) return 'Too many requests. Please wait and try again.';
    if (status !== null && status >= 500 && status <= 599) return 'The server had a problem. Please try again later.';
    return "Couldn't read data from Dataverse.";
  }

  export function isRetryable(status: number | null): boolean {
    return status === 429 || (status !== null && status >= 500 && status <= 599);
  }

  /** Maps anything a host read can throw to a HostReadError with a plain-language message and the status. */
  export function toHostReadError(label: string, error: unknown): HostReadError {
    if (error instanceof HostReadError) return error;
    logHostFailure(label, error);
    const status = statusOf(error);
    return new HostReadError(messageForStatus(status), status);
  }
  ```

- [ ] **Step 4: Implement `dataverseRead.ts`**

  Create `src/services/pptb/dataverseRead.ts` (whole file).

  ```ts file=src/services/pptb/dataverseRead.ts
  import { HostReadError } from './host.types';
  import type { ODataQuery } from './host.types';
  import { isRecord, isRetryable, toHostReadError } from './hostErrors';

  /** One host read: `path` is a relative OData path such as `powerpagecomponents?$select=name`. */
  export type RawRead = (path: string, headers: Readonly<Record<string, string>>) => Promise<unknown>;
  export type Sleep = (ms: number) => Promise<void>;
  export type ReadDeps = { read: RawRead; sleep: Sleep };

  /** Waits before retry 1, 2 and 3 of a read that failed with 429 or 5xx (FR-7). */
  export const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

  /**
   * Spike S2 gate. PPTB documents only `value` on a `queryData` result, so until S2 shows that
   * `@odata.nextLink` comes through, a full page with no link is reported as possibly incomplete instead of
   * being accepted as the last page. Phase 12 sets this to false once S2 confirms the link, or replaces
   * `fetchAllPages` with FetchXML paging-cookie paging if it does not.
   */
  export const NEXT_LINK_UNVERIFIED = true;

  const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const UNSAFE_CLAUSE = /[&#\p{Cc}]/u;
  const API_PATH = /\/api\/data\/v\d+(?:\.\d+)?\/(.+)$/;
  const MAX_PAGE_SIZE = 5000;
  const MAX_PAGES = 1000;

  function invalid(what: string): HostReadError {
    return new HostReadError(`Invalid query: ${what}.`, null);
  }

  /** Validates the query and builds its first relative path. Dataverse pages come from `Prefer: odata.maxpagesize`. */
  export function buildQueryPath(q: ODataQuery): string {
    if (!NAME.test(q.entitySet)) throw invalid('entity set name');
    if (q.select.length === 0 || !q.select.every((column) => NAME.test(column))) throw invalid('select columns');
    if (!Number.isInteger(q.pageSize) || q.pageSize < 1 || q.pageSize > MAX_PAGE_SIZE) throw invalid('page size');
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
    throw badShape();
  }

  /** `@odata.nextLink` is absolute. Only its path after `/api/data/vX.Y/` goes back to the host, on the same table. */
  function relativeNextLink(link: string, entitySet: string): string {
    const rest = API_PATH.exec(link)?.[1];
    if (rest?.startsWith(`${entitySet}?`) !== true) {
      throw new HostReadError('Unexpected paging link from Dataverse.', null);
    }
    return rest;
  }

  /** Runs `op`, retrying a 429 or 5xx failure after 1 s, 2 s and 4 s. Any failure leaves as a HostReadError. */
  export async function withRetry<T>(label: string, op: () => Promise<T>, sleep: Sleep): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await op();
      } catch (error) {
        const failure = toHostReadError(label, error);
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !isRetryable(failure.status)) throw failure;
        await sleep(delay);
      }
    }
  }

  /**
   * The one paging strategy. Reads page after page until no link is left. `strict` is NEXT_LINK_UNVERIFIED:
   * when set, a full page that has no link fails closed rather than passing as complete.
   */
  export async function fetchAllPages(
    readPage: (path: string) => Promise<Page>,
    q: ODataQuery,
    strict: boolean,
  ): Promise<readonly unknown[]> {
    const rows: unknown[] = [];
    let path: string | null = buildQueryPath(q);
    for (let pages = 0; path !== null; pages += 1) {
      if (pages >= MAX_PAGES) throw new HostReadError('Dataverse returned too many pages.', null);
      const page = await readPage(path);
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
    return rows;
  }

  export function queryAllRows(
    q: ODataQuery,
    deps: ReadDeps,
    strict: boolean = NEXT_LINK_UNVERIFIED,
  ): Promise<readonly unknown[]> {
    const headers = { Prefer: `odata.maxpagesize=${String(q.pageSize)}` };
    return fetchAllPages(
      (path) => withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep),
      q,
      strict,
    );
  }

  /**
   * Reads a File column's content with `queryData('<set>(<id>)/<column>/$value')`. PPTB documents no file-download
   * call, so this is the generic call; Spike S2 confirms it, and what shape the content comes back in.
   */
  export async function downloadColumnContent(
    entitySet: string,
    id: string,
    column: string,
    deps: ReadDeps,
  ): Promise<string> {
    if (!NAME.test(entitySet) || !GUID.test(id) || !NAME.test(column)) throw invalid('file column reference');
    const path = `${entitySet}(${id})/${column}/$value`;
    const raw = await withRetry('queryData', () => deps.read(path, {}), deps.sleep);
    if (typeof raw === 'string') return raw;
    if (isRecord(raw) && typeof raw.value === 'string') return raw.value;
    throw new HostReadError('Unexpected file response from Dataverse.', null);
  }
  ```

- [ ] **Step 5: Run the tests and confirm they PASS**

  ```bash
  npx vitest run src/services/pptb/dataverseRead.test.ts
  ```

  Expect: PASS, 1 test file and 29 tests. If a test fails, fix the implementation, never the test: the retry delays, the `Prefer` header and the fail-closed gate are spec behaviour.

- [ ] **Step 6: Commit**

  ```bash
  npx prettier --write src/services/pptb
  npx tsc -b && npx eslint src/services/pptb --max-warnings=0
  git add src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/dataverseRead.test.ts
  git commit -m "feat(pptb): add paged Dataverse reads with a bounded retry"
  ```

  Expect: `tsc` and ESLint print nothing, and the commit lists three files. If ESLint reports `@typescript-eslint/consistent-type-definitions` on a `type X = { … }`, the repo's ESLint config is missing the `type` preference that `.claude/rules/typescript.md` and the pinned contracts assume. That is a Phase 00 defect: stop and report it, and do not rewrite types as interfaces.

- [ ] **Step 7: Write the `createPptbHost` tests**

  Create `src/services/pptb/pptbHost.test.ts`. Every test installs a stub `window.toolboxAPI` and `window.dataverseAPI` with `Object.defineProperty` and removes them afterwards. The last `describe` swaps in a Proxy that records and refuses any member outside the read-only list, then drives every `PptbHost` method.

  ```ts file=src/services/pptb/pptbHost.test.ts
  // @vitest-environment jsdom
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
  import { HostReadError } from './host.types';
  import type { HostEvent, ODataQuery, PptbHost } from './host.types';
  import { HostCallError, isRecord } from './hostErrors';
  import { createPptbHost } from './pptbHost';

  const BASE = 'https://org.crm.dynamics.com/api/data/v9.2';
  const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

  type EventCallback = (event: unknown, payload: unknown) => void;

  function makeStubs() {
    const getCurrentTheme = vi.fn<() => Promise<unknown>>().mockResolvedValue('dark');
    const showNotification = vi.fn<(options: unknown) => Promise<void>>().mockResolvedValue(undefined);
    const copyToClipboard = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    const openInConnectionBrowser = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined);
    const saveFile = vi
      .fn<(name: string, content: unknown, filters?: unknown) => Promise<unknown>>()
      .mockResolvedValue('C:\\out\\file.zip');
    const getActiveConnection = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);
    const on = vi.fn<(callback: EventCallback) => void>();
    const off = vi.fn<(callback: EventCallback) => void>();
    const queryData = vi
      .fn<(query: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
      .mockResolvedValue({ value: [] });
    return {
      getCurrentTheme,
      showNotification,
      copyToClipboard,
      openInConnectionBrowser,
      saveFile,
      getActiveConnection,
      on,
      off,
      queryData,
      toolbox: {
        utils: { getCurrentTheme, showNotification, copyToClipboard, openInConnectionBrowser },
        fileSystem: { saveFile },
        connections: { getActiveConnection },
        events: { on, off },
      },
      dataverse: { queryData },
    };
  }

  type Stubs = ReturnType<typeof makeStubs>;

  function install(toolbox: unknown, dataverse: unknown): void {
    Object.defineProperty(window, 'toolboxAPI', { configurable: true, writable: true, value: toolbox });
    Object.defineProperty(window, 'dataverseAPI', { configurable: true, writable: true, value: dataverse });
  }

  let stubs: Stubs;
  let sleep: ReturnType<typeof vi.fn<(ms: number) => Promise<void>>>;
  let host: PptbHost;

  beforeEach(() => {
    stubs = makeStubs();
    install(stubs.toolbox, stubs.dataverse);
    sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    host = createPptbHost({ sleep });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'toolboxAPI');
    Reflect.deleteProperty(window, 'dataverseAPI');
    vi.restoreAllMocks();
  });

  /** Everything written to console.error so far, as text. */
  function logged(): string {
    return JSON.stringify(vi.mocked(console.error).mock.calls);
  }

  const QUERY: ODataQuery = {
    entitySet: 'powerpagecomponents',
    select: ['powerpagecomponentid', 'name'],
    filter: 'powerpagecomponenttype eq 35',
    orderBy: null,
    pageSize: 2,
  };

  describe('getTheme', () => {
    it('returns the host theme', async () => {
      await expect(host.getTheme()).resolves.toBe('dark');
    });

    it('falls back to light when the host call fails, logging only the error name', async () => {
      stubs.getCurrentTheme.mockRejectedValue(new TypeError('SECRET-BODY https://org.example/x'));
      await expect(host.getTheme()).resolves.toBe('light');
      expect(logged()).toContain('TypeError');
      expect(logged()).not.toContain('SECRET');
    });

    it('falls back to light for a value that is not a theme', async () => {
      stubs.getCurrentTheme.mockResolvedValue('purple');
      await expect(host.getTheme()).resolves.toBe('light');
    });

    it('falls back to light when the host API is missing', async () => {
      Reflect.deleteProperty(window, 'toolboxAPI');
      await expect(host.getTheme()).resolves.toBe('light');
    });
  });

  describe('notify', () => {
    it('passes title, body and type, and no duration, for info and success', async () => {
      await host.notify({ title: 'Saved', body: 'File saved.', type: 'success' });
      expect(stubs.showNotification.mock.calls).toEqual([[{ title: 'Saved', body: 'File saved.', type: 'success' }]]);
      expect(stubs.showNotification.mock.calls[0]?.[0]).not.toHaveProperty('duration');
    });

    it('passes duration 0 for an error, so it stays until dismissed', async () => {
      await host.notify({ title: 'Couldn’t copy', body: 'Try again.', type: 'error' });
      expect(stubs.showNotification).toHaveBeenCalledWith({
        title: 'Couldn’t copy',
        body: 'Try again.',
        type: 'error',
        duration: 0,
      });
    });

    it('rejects when the host rejects', async () => {
      stubs.showNotification.mockRejectedValue(new Error('SECRET-BODY'));
      await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(HostCallError);
      expect(logged()).not.toContain('SECRET');
    });

    it('rejects when the host throws synchronously', async () => {
      stubs.showNotification.mockImplementation(() => {
        throw new TypeError('boom');
      });
      await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(HostCallError);
    });

    it('rejects when showNotification is missing', async () => {
      install({ ...stubs.toolbox, utils: {} }, stubs.dataverse);
      await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(HostCallError);
    });
  });

  describe('copyText', () => {
    it('copies the text', async () => {
      await host.copyText('const a = 1;');
      expect(stubs.copyToClipboard).toHaveBeenCalledWith('const a = 1;');
    });

    it('rejects when the clipboard write fails', async () => {
      stubs.copyToClipboard.mockRejectedValue(new Error('denied'));
      await expect(host.copyText('x')).rejects.toBeInstanceOf(HostCallError);
    });
  });

  describe('saveFile', () => {
    it('returns the saved path', async () => {
      await expect(host.saveFile('a.zip', 'text', [{ name: 'Zip', extensions: ['zip'] }])).resolves.toEqual({
        status: 'saved',
        path: 'C:\\out\\file.zip',
      });
      expect(stubs.saveFile).toHaveBeenCalledWith('a.zip', 'text', [{ name: 'Zip', extensions: ['zip'] }]);
    });

    it('reports a cancelled dialog as cancelled', async () => {
      stubs.saveFile.mockResolvedValue(null);
      await expect(host.saveFile('a.zip', 'text', [])).resolves.toEqual({ status: 'cancelled' });
    });

    it('passes bytes through and leaves the filters out when there are none', async () => {
      const bytes = new Uint8Array([80, 75, 3, 4]);
      await host.saveFile('a.zip', bytes, []);
      expect(stubs.saveFile).toHaveBeenCalledWith('a.zip', bytes, undefined);
    });

    it('rejects a result that is neither a path nor null', async () => {
      stubs.saveFile.mockResolvedValue(42);
      await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
      stubs.saveFile.mockResolvedValue('');
      await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
    });

    it('rejects when the host fails', async () => {
      stubs.saveFile.mockRejectedValue(new Error('disk full'));
      await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
    });
  });

  describe('openExternal', () => {
    it('opens an https link in the connection browser', async () => {
      await host.openExternal('https://learn.microsoft.com/en-us/power-pages/');
      expect(stubs.openInConnectionBrowser).toHaveBeenCalledWith('https://learn.microsoft.com/en-us/power-pages/');
    });

    it.each(['javascript:alert(1)', 'file:///C:/Windows', 'not a url', ''])(
      'refuses %j without calling the host',
      async (url) => {
        await expect(host.openExternal(url)).rejects.toBeInstanceOf(HostCallError);
        expect(stubs.openInConnectionBrowser).not.toHaveBeenCalled();
      },
    );

    it('rejects when the host fails', async () => {
      stubs.openInConnectionBrowser.mockRejectedValue(new Error('blocked'));
      await expect(host.openExternal('https://github.com/')).rejects.toBeInstanceOf(HostCallError);
    });
  });

  describe('getActiveConnection', () => {
    const raw = {
      id: 'c1',
      name: 'PG DEV',
      url: 'https://pg-dev.crm.dynamics.com',
      createdAt: '2026-01-01',
      category: 'x',
    };

    it('returns null when there is no connection', async () => {
      await expect(host.getActiveConnection()).resolves.toBeNull();
      stubs.getActiveConnection.mockResolvedValue(undefined);
      await expect(host.getActiveConnection()).resolves.toBeNull();
    });

    it.each(['Dev', 'Test', 'UAT', 'Production'] as const)('keeps the %s label', async (environment) => {
      stubs.getActiveConnection.mockResolvedValue({ ...raw, environment });
      await expect(host.getActiveConnection()).resolves.toEqual({
        id: 'c1',
        name: 'PG DEV',
        url: 'https://pg-dev.crm.dynamics.com',
        environment,
      });
    });

    it('reads an unrecognised or missing label as Unknown', async () => {
      stubs.getActiveConnection.mockResolvedValue({ ...raw, environment: 'Sandbox' });
      await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
      stubs.getActiveConnection.mockResolvedValue({ ...raw });
      await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
      stubs.getActiveConnection.mockResolvedValue({ ...raw, environment: 7 });
      await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
    });

    it('rejects a connection without an id, name and url', async () => {
      stubs.getActiveConnection.mockResolvedValue({ id: 'c1', name: 'PG DEV' });
      await expect(host.getActiveConnection()).rejects.toBeInstanceOf(HostCallError);
      stubs.getActiveConnection.mockResolvedValue('connected');
      await expect(host.getActiveConnection()).rejects.toBeInstanceOf(HostCallError);
    });
  });

  describe('onEvent', () => {
    function hub(): EventCallback {
      const callback = stubs.on.mock.calls[0]?.[0];
      if (callback === undefined) throw new Error('events.on was never called');
      return callback;
    }
    const payload = (event: string) => ({ event, data: null, timestamp: '2026-10-16T00:00:00Z' });

    it('routes connection events and settings:updated, and passes other events on by name', () => {
      const seen: HostEvent[] = [];
      host.onEvent((e) => seen.push(e));
      for (const name of [
        'connection:created',
        'connection:updated',
        'connection:deleted',
        'settings:updated',
        'tool:loaded',
      ]) {
        hub()(undefined, payload(name));
      }
      expect(seen).toEqual([
        { kind: 'connection-changed' },
        { kind: 'connection-changed' },
        { kind: 'connection-changed' },
        { kind: 'settings-updated' },
        { kind: 'other', name: 'tool:loaded' },
      ]);
    });

    it('registers with the host once, however many handlers subscribe', () => {
      host.onEvent(() => undefined);
      host.onEvent(() => undefined);
      expect(stubs.on).toHaveBeenCalledTimes(1);
    });

    it('stops delivering after unsubscribe and calls events.off with the same callback after the last one', () => {
      const first = vi.fn();
      const second = vi.fn();
      const unsubscribeFirst = host.onEvent(first);
      const unsubscribeSecond = host.onEvent(second);
      unsubscribeFirst();
      hub()(undefined, payload('settings:updated'));
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      expect(stubs.off).not.toHaveBeenCalled();
      unsubscribeSecond();
      expect(stubs.off).toHaveBeenCalledTimes(1);
      expect(stubs.off).toHaveBeenCalledWith(hub());
    });

    it('registers again after every handler has unsubscribed', () => {
      host.onEvent(() => undefined)();
      host.onEvent(() => undefined);
      expect(stubs.on).toHaveBeenCalledTimes(2);
    });

    it('ignores payloads that are not events', () => {
      const handler = vi.fn();
      host.onEvent(handler);
      for (const bad of [null, undefined, 'connection:updated', {}, { event: 7 }]) hub()(undefined, bad);
      expect(handler).not.toHaveBeenCalled();
    });

    it('keeps delivering when one handler throws, and logs only its error name', () => {
      const after = vi.fn();
      host.onEvent(() => {
        throw new RangeError('SECRET-BODY');
      });
      host.onEvent(after);
      hub()(undefined, payload('settings:updated'));
      expect(after).toHaveBeenCalledTimes(1);
      expect(logged()).toContain('RangeError');
      expect(logged()).not.toContain('SECRET');
    });

    it('returns a safe unsubscribe when events.on is missing or throws', () => {
      stubs.on.mockImplementation(() => {
        throw new TypeError('no events');
      });
      const unsubscribe = host.onEvent(() => undefined);
      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('queryAll', () => {
    const link = (rest: string) => `${BASE}/${rest}`;

    it('follows @odata.nextLink across three pages and sends Prefer on each', async () => {
      stubs.queryData
        .mockResolvedValueOnce({
          value: [{ n: 1 }, { n: 2 }],
          '@odata.nextLink': link('powerpagecomponents?$select=name&$skiptoken=A'),
        })
        .mockResolvedValueOnce({
          value: [{ n: 3 }, { n: 4 }],
          '@odata.nextLink': link('powerpagecomponents?$select=name&$skiptoken=B'),
        })
        .mockResolvedValueOnce({ value: [{ n: 5 }] });
      await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }]);
      expect(stubs.queryData.mock.calls).toEqual([
        [
          'powerpagecomponents?$select=powerpagecomponentid,name&$filter=powerpagecomponenttype eq 35',
          undefined,
          { Prefer: 'odata.maxpagesize=2' },
        ],
        ['powerpagecomponents?$select=name&$skiptoken=A', undefined, { Prefer: 'odata.maxpagesize=2' }],
        ['powerpagecomponents?$select=name&$skiptoken=B', undefined, { Prefer: 'odata.maxpagesize=2' }],
      ]);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('retries a 503 after 1 s, 2 s and 4 s and then throws a HostReadError with the status', async () => {
      stubs.queryData.mockRejectedValue({
        status: 503,
        statusText: 'Service Unavailable',
        message: 'SECRET-BODY https://org/x',
      });
      const failure: unknown = await host.queryAll(QUERY).catch((e: unknown) => e);
      expect(failure).toBeInstanceOf(HostReadError);
      expect(failure).toMatchObject({ status: 503, message: 'The server had a problem. Please try again later.' });
      expect(stubs.queryData).toHaveBeenCalledTimes(4);
      expect(sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
      expect(logged()).not.toContain('SECRET');
    });

    it('succeeds when a 429 clears on the first retry', async () => {
      stubs.queryData.mockRejectedValueOnce({ status: 429 }).mockResolvedValueOnce({ value: [{ n: 1 }] });
      await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }]);
      expect(sleep.mock.calls).toEqual([[1000]]);
    });

    it('does not retry a 404', async () => {
      stubs.queryData.mockRejectedValue({ status: 404 });
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: 404 });
      expect(stubs.queryData).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('does not retry a failure that has no status', async () => {
      stubs.queryData.mockRejectedValue(new Error('network'));
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: null });
      expect(stubs.queryData).toHaveBeenCalledTimes(1);
    });

    it('retries a failure on a later page without re-reading earlier pages', async () => {
      stubs.queryData
        .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': link('powerpagecomponents?$skiptoken=A') })
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ value: [3] });
      await expect(host.queryAll(QUERY)).resolves.toEqual([1, 2, 3]);
      expect(stubs.queryData).toHaveBeenCalledTimes(3);
    });

    it.each([
      ['null', null],
      ['an array', [1, 2]],
      ['no value array', { rows: [] }],
      ['a value that is not an array', { value: 'x' }],
      ['a nextLink that is not a string', { value: [], '@odata.nextLink': 5 }],
    ])('rejects a response that is %s, without retrying', async (_label, response) => {
      stubs.queryData.mockResolvedValue(response);
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: null });
      expect(stubs.queryData).toHaveBeenCalledTimes(1);
    });

    it('rejects a paging link that points at another table or another API', async () => {
      stubs.queryData.mockResolvedValue({ value: [1, 2], '@odata.nextLink': link('systemusers?$skiptoken=A') });
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: null });
      stubs.queryData.mockResolvedValue({ value: [1, 2], '@odata.nextLink': 'https://evil.example/steal' });
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: null });
    });

    it('fails closed on a full page that has no paging link (Spike S2 gate)', async () => {
      stubs.queryData.mockResolvedValue({ value: [1, 2] });
      await expect(host.queryAll(QUERY)).rejects.toThrow(/may be incomplete/);
    });

    it('rejects an invalid query before calling the host', async () => {
      await expect(host.queryAll({ ...QUERY, entitySet: 'a/b' })).rejects.toBeInstanceOf(HostReadError);
      await expect(host.queryAll({ ...QUERY, filter: 'a eq 1&$top=1' })).rejects.toBeInstanceOf(HostReadError);
      expect(stubs.queryData).not.toHaveBeenCalled();
    });

    it('rejects with a HostReadError when dataverseAPI is missing', async () => {
      Reflect.deleteProperty(window, 'dataverseAPI');
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: null });
    });
  });

  describe('downloadFileColumn', () => {
    const path = `powerpagecomponents(${GUID})/filecontent/$value`;

    it('reads the file column through queryData and returns the text', async () => {
      stubs.queryData.mockResolvedValue('export function get() {}');
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
        'export function get() {}',
      );
      expect(stubs.queryData).toHaveBeenCalledWith(path, undefined, {});
    });

    it('accepts text wrapped in a value member', async () => {
      stubs.queryData.mockResolvedValue({ value: 'export function get() {}' });
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
        'export function get() {}',
      );
    });

    it('retries a 503 on the same schedule as queryAll', async () => {
      stubs.queryData
        .mockRejectedValueOnce({ status: 503 })
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce('code');
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe('code');
      expect(sleep.mock.calls).toEqual([[1000], [2000]]);
    });

    it.each([
      ['an object without a string value', { value: [1, 2] }],
      ['null', null],
      ['a number', 7],
    ])('rejects %s', async (_label, response) => {
      stubs.queryData.mockResolvedValue(response);
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).rejects.toMatchObject({
        name: 'HostReadError',
        status: null,
      });
    });

    it.each([
      ['an id that is not a GUID', 'powerpagecomponents', '1) or (1', 'filecontent'],
      ['an entity set with a slash', 'powerpagecomponents/x', GUID, 'filecontent'],
      ['a column with a slash', 'powerpagecomponents', GUID, 'file/content'],
    ])('refuses %s without calling the host', async (_label, set, id, column) => {
      await expect(host.downloadFileColumn(set, id, column)).rejects.toBeInstanceOf(HostReadError);
      expect(stubs.queryData).not.toHaveBeenCalled();
    });
  });

  describe('read-only guarantee', () => {
    // Every member the adapter may touch. Reaching for anything else (create, update, delete, execute,
    // associate, *Multiple, publishCustomizations, deploySolution, Post, Put, Patch, ...) is recorded and throws.
    const ALLOWED = [
      'toolboxAPI.utils.getCurrentTheme',
      'toolboxAPI.utils.showNotification',
      'toolboxAPI.utils.copyToClipboard',
      'toolboxAPI.utils.openInConnectionBrowser',
      'toolboxAPI.fileSystem.saveFile',
      'toolboxAPI.connections.getActiveConnection',
      'toolboxAPI.events.on',
      'toolboxAPI.events.off',
      'dataverseAPI.queryData',
    ];

    function guarded(path: string, tree: Record<string, unknown>, touched: string[], violations: string[]): object {
      return new Proxy(tree, {
        get(target, prop) {
          if (typeof prop !== 'string') return undefined;
          const here = `${path}.${prop}`;
          if (!ALLOWED.some((name) => name === here || name.startsWith(`${here}.`))) {
            violations.push(here);
            throw new Error(`Forbidden host member: ${here}`);
          }
          touched.push(here);
          const value = target[prop];
          return isRecord(value) ? guarded(here, value, touched, violations) : value;
        },
      });
    }

    it('touches only read members across every PptbHost method', async () => {
      const touched: string[] = [];
      const violations: string[] = [];
      install(
        guarded('toolboxAPI', stubs.toolbox, touched, violations),
        guarded('dataverseAPI', stubs.dataverse, touched, violations),
      );
      stubs.getActiveConnection.mockResolvedValue({
        id: 'c1',
        name: 'n',
        url: 'https://x.crm.dynamics.com',
        environment: 'Dev',
      });
      stubs.queryData.mockResolvedValueOnce({ value: [1] }).mockResolvedValueOnce('export function get() {}');

      await host.getTheme();
      await host.notify({ title: 'a', body: 'b', type: 'error' });
      await host.copyText('x');
      await host.saveFile('a.md', 'x', [{ name: 'Markdown', extensions: ['md'] }]);
      await host.openExternal('https://learn.microsoft.com/');
      await host.getActiveConnection();
      host.onEvent(() => undefined)();
      await host.queryAll({ ...QUERY, pageSize: 5 });
      await host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent');

      expect(violations).toEqual([]);
      expect(new Set(touched.filter((name) => ALLOWED.includes(name)))).toEqual(new Set(ALLOWED));
    });

    it('refuses to reach a write member, as the guard proves', () => {
      const violations: string[] = [];
      const guard = guarded('dataverseAPI', stubs.dataverse, [], violations);
      expect(() => {
        void Reflect.get(guard, 'create');
      }).toThrow(/Forbidden host member: dataverseAPI.create/);
      expect(() => {
        void Reflect.get(guard, 'execute');
      }).toThrow(/Forbidden/);
      expect(violations).toEqual(['dataverseAPI.create', 'dataverseAPI.execute']);
    });
  });
  ```

- [ ] **Step 8: Run the tests and confirm they FAIL**

  ```bash
  npx vitest run src/services/pptb/pptbHost.test.ts
  ```

  Expect: FAIL. "Test Files 1 failed", "Tests 62 failed (62)", each with `Error: not implemented: phase 01`, thrown by Phase 00's stub `createPptbHost` in `beforeEach`. If any test passes, the stub is not the one this plan assumes: stop and check Step 0.

- [ ] **Step 9: Implement `pptbHost.ts`**

  Replace the whole of `src/services/pptb/pptbHost.ts`.

  ```ts file=src/services/pptb/pptbHost.ts
  /// <reference types="@pptb/types" />
  import type { Connection, EnvironmentLabel, HostEvent, PptbHost, SaveResult, ThemeName } from './host.types';
  import { downloadColumnContent, queryAllRows } from './dataverseRead';
  import type { ReadDeps, Sleep } from './dataverseRead';
  import { HostCallError, isRecord, logHostFailure } from './hostErrors';

  export type PptbHostOptions = { sleep?: Sleep };

  const ENVIRONMENTS = ['Dev', 'Test', 'UAT', 'Production'] as const;

  function toEnvironment(value: unknown): EnvironmentLabel {
    return ENVIRONMENTS.find((label) => label === value) ?? 'Unknown';
  }

  function toHostEvent(payload: unknown): HostEvent | null {
    if (!isRecord(payload) || typeof payload.event !== 'string') return null;
    switch (payload.event) {
      case 'connection:created':
      case 'connection:updated':
      case 'connection:deleted':
        return { kind: 'connection-changed' };
      case 'settings:updated':
        return { kind: 'settings-updated' };
      default:
        return { kind: 'other', name: payload.event };
    }
  }

  function isHttpUrl(url: string): boolean {
    try {
      const protocol = new URL(url).protocol;
      return protocol === 'https:' || protocol === 'http:';
    } catch {
      return false;
    }
  }

  function defaultSleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /** Runs one host call. A missing member, a throw or a rejection becomes a HostCallError; only the error name is logged. */
  async function hostCall<T>(label: string, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      logHostFailure(label, error);
      throw new HostCallError(`Host call failed: ${label}.`);
    }
  }

  function unexpected(label: string): HostCallError {
    return new HostCallError(`Host call failed: ${label} returned an unexpected result.`);
  }

  /**
   * `toolboxAPI.events.on` is registered once per host, on the first handler, and routes on `payload.event`.
   * The last unsubscribe calls `events.off` (declared in @pptb/types, not shown in the docs: Spike S2).
   */
  function createEventHub(): PptbHost['onEvent'] {
    const handlers = new Set<(e: HostEvent) => void>();
    let registered = false;
    const hub = (_event: unknown, payload: unknown): void => {
      const event = toHostEvent(payload);
      if (event === null) return;
      for (const handler of [...handlers]) {
        try {
          handler(event);
        } catch (error) {
          logHostFailure('event handler', error);
        }
      }
    };
    return (handler) => {
      handlers.add(handler);
      if (!registered) {
        try {
          window.toolboxAPI.events.on(hub);
          registered = true;
        } catch (error) {
          logHostFailure('events.on', error);
        }
      }
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0 && registered) {
          registered = false;
          try {
            window.toolboxAPI.events.off(hub);
          } catch (error) {
            logHostFailure('events.off', error);
          }
        }
      };
    };
  }

  /**
   * The only module that touches `window.toolboxAPI` and `window.dataverseAPI`. Dataverse is read-only:
   * `queryData` is the only data call. Every host response is `unknown` until a guard narrows it.
   */
  export function createPptbHost(options: PptbHostOptions = {}): PptbHost {
    const deps: ReadDeps = {
      read: (path, headers) => window.dataverseAPI.queryData(path, undefined, headers),
      sleep: options.sleep ?? defaultSleep,
    };

    return {
      async getTheme(): Promise<ThemeName> {
        try {
          const theme: unknown = await window.toolboxAPI.utils.getCurrentTheme();
          return theme === 'dark' ? 'dark' : 'light';
        } catch (error) {
          logHostFailure('getCurrentTheme', error);
          return 'light';
        }
      },

      notify: (n) =>
        hostCall('showNotification', () =>
          window.toolboxAPI.utils.showNotification(
            n.type === 'error'
              ? { title: n.title, body: n.body, type: n.type, duration: 0 }
              : { title: n.title, body: n.body, type: n.type },
          ),
        ),

      copyText: (text) => hostCall('copyToClipboard', () => window.toolboxAPI.utils.copyToClipboard(text)),

      async saveFile(defaultName, content, filters): Promise<SaveResult> {
        const dialogFilters = filters.map((f) => ({ name: f.name, extensions: [...f.extensions] }));
        const saved: unknown = await hostCall('saveFile', () =>
          window.toolboxAPI.fileSystem.saveFile(
            defaultName,
            content,
            dialogFilters.length === 0 ? undefined : dialogFilters,
          ),
        );
        if (saved === null) return { status: 'cancelled' };
        if (typeof saved === 'string' && saved !== '') return { status: 'saved', path: saved };
        throw unexpected('saveFile');
      },

      async openExternal(url) {
        if (!isHttpUrl(url)) throw new HostCallError('Only http and https links can be opened.');
        await hostCall('openInConnectionBrowser', () => window.toolboxAPI.utils.openInConnectionBrowser(url));
      },

      async getActiveConnection(): Promise<Connection | null> {
        const raw: unknown = await hostCall('getActiveConnection', () =>
          window.toolboxAPI.connections.getActiveConnection(),
        );
        if (raw === null || raw === undefined) return null;
        if (isRecord(raw) && typeof raw.id === 'string' && typeof raw.name === 'string' && typeof raw.url === 'string') {
          return { id: raw.id, name: raw.name, url: raw.url, environment: toEnvironment(raw.environment) };
        }
        throw unexpected('getActiveConnection');
      },

      onEvent: createEventHub(),

      queryAll: (q) => queryAllRows(q, deps),

      downloadFileColumn: (entitySet, id, column) => downloadColumnContent(entitySet, id, column, deps),
    };
  }
  ```

- [ ] **Step 10: Run the tests and confirm they PASS**

  ```bash
  npx vitest run src/services/pptb/pptbHost.test.ts src/services/pptb/dataverseRead.test.ts
  ```

  Expect: PASS, 2 test files and 91 tests (62 and 29). If the read-only test fails with "Forbidden host member", the adapter reached a member outside the read-only list: remove that call, never widen the list.

- [ ] **Step 11: Commit**

  ```bash
  npx prettier --write src/services/pptb
  npx tsc -b && npx eslint src/services/pptb --max-warnings=0
  git add src/services/pptb/pptbHost.ts src/services/pptb/pptbHost.test.ts
  git commit -m "feat(pptb): implement createPptbHost over toolboxAPI and dataverseAPI"
  ```

  Expect: no `tsc` or ESLint output, and the commit lists two files.

- [ ] **Step 12: Write the fake host tests**

  Create `src/services/pptb/fakeHost.test.ts`. These are the behaviour tests that pin what phases 06, 14, 15, 18, 21 and 24 depend on: notify modes, save and cancel, copy, events, responders, paged results, scripted failures and file columns.

  ```ts file=src/services/pptb/fakeHost.test.ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
  import { HostReadError } from './host.types';
  import type { Connection, HostEvent, ODataQuery, PptbHost } from './host.types';
  import { createFakeHost } from './fakeHost';

  const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const CONNECTION: Connection = { id: 'c1', name: 'PG DEV', url: 'https://pg-dev.crm.dynamics.com', environment: 'Dev' };
  const QUERY: ODataQuery = {
    entitySet: 'powerpagecomponents',
    select: ['name'],
    filter: 'powerpagecomponenttype eq 35',
    orderBy: null,
    pageSize: 2,
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFakeHost defaults', () => {
    it('is a PptbHost with light theme, no connection and succeeding notify, copy, save and open', async () => {
      const host: PptbHost = createFakeHost();
      await expect(host.getTheme()).resolves.toBe('light');
      await expect(host.getActiveConnection()).resolves.toBeNull();
      await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).resolves.toBeUndefined();
      await expect(host.copyText('x')).resolves.toBeUndefined();
      await expect(host.openExternal('https://github.com/')).resolves.toBeUndefined();
      await expect(host.saveFile('a.md', 'x', [])).resolves.toEqual({ status: 'saved', path: 'C:\\fake\\a.md' });
    });

    it('takes the theme and connection from its init and lets a test change them', async () => {
      const host = createFakeHost({ theme: 'dark', connection: CONNECTION });
      await expect(host.getTheme()).resolves.toBe('dark');
      await expect(host.getActiveConnection()).resolves.toEqual(CONNECTION);
      host.setTheme('light');
      host.setConnection(null);
      await expect(host.getTheme()).resolves.toBe('light');
      await expect(host.getActiveConnection()).resolves.toBeNull();
    });
  });

  describe('notify behaviours', () => {
    const notice = { title: 'a', body: 'b', type: 'error' } as const;

    it.each(['throw', 'reject', 'missing'] as const)('rejects in %s mode and still records the call', async (mode) => {
      const host = createFakeHost({ notify: mode });
      await expect(host.notify(notice)).rejects.toBeInstanceOf(Error);
      expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice }]);
    });

    it('names the failure so a test can tell the modes apart', async () => {
      await expect(createFakeHost({ notify: 'throw' }).notify(notice)).rejects.toMatchObject({ name: 'TypeError' });
      await expect(createFakeHost({ notify: 'reject' }).notify(notice)).rejects.toMatchObject({ name: 'Error' });
      await expect(createFakeHost({ notify: 'missing' }).notify(notice)).rejects.toMatchObject({ name: 'HostCallError' });
    });

    it('switches mode with setNotify', async () => {
      const host = createFakeHost();
      host.setNotify('reject');
      await expect(host.notify(notice)).rejects.toBeInstanceOf(Error);
      host.setNotify('ok');
      await expect(host.notify(notice)).resolves.toBeUndefined();
    });
  });

  describe('copy, open and save', () => {
    it('rejects copy and open when told to', async () => {
      const host = createFakeHost({ copy: 'reject', openExternal: 'reject' });
      await expect(host.copyText('x')).rejects.toBeInstanceOf(Error);
      await expect(host.openExternal('https://github.com/')).rejects.toBeInstanceOf(Error);
      host.setCopy('ok');
      host.setOpenExternal('ok');
      await expect(host.copyText('x')).resolves.toBeUndefined();
      await expect(host.openExternal('https://github.com/')).resolves.toBeUndefined();
      expect(host.callsOf('copyText')).toHaveLength(2);
      expect(host.callsOf('openExternal')).toHaveLength(2);
    });

    it('keeps saved files, including bytes, and nothing for a cancel or a rejection', async () => {
      const host = createFakeHost();
      const bytes = new Uint8Array([80, 75]);
      await host.saveFile('a.zip', bytes, [{ name: 'Zip', extensions: ['zip'] }]);
      host.setSave('cancel');
      await expect(host.saveFile('b.md', 'x', [])).resolves.toEqual({ status: 'cancelled' });
      host.setSave('reject');
      await expect(host.saveFile('c.md', 'x', [])).rejects.toBeInstanceOf(Error);
      expect(host.savedFiles).toEqual([{ path: 'C:\\fake\\a.zip', defaultName: 'a.zip', content: bytes }]);
      expect(host.callsOf('saveFile').map((c) => c.defaultName)).toEqual(['a.zip', 'b.md', 'c.md']);
      expect(host.callsOf('saveFile')[0]?.filters).toEqual([{ name: 'Zip', extensions: ['zip'] }]);
    });
  });

  describe('events', () => {
    it('delivers emitted events to every handler until it unsubscribes', () => {
      const host = createFakeHost();
      const seen: HostEvent[] = [];
      const other = vi.fn();
      const unsubscribe = host.onEvent((e) => seen.push(e));
      host.onEvent(other);
      expect(host.listenerCount()).toBe(2);
      host.emit({ kind: 'connection-changed' });
      unsubscribe();
      host.emit({ kind: 'settings-updated' });
      expect(seen).toEqual([{ kind: 'connection-changed' }]);
      expect(other).toHaveBeenCalledTimes(2);
      expect(host.listenerCount()).toBe(1);
    });

    it('keeps delivering when a handler throws', () => {
      const host = createFakeHost();
      const after = vi.fn();
      host.onEvent(() => {
        throw new Error('boom');
      });
      host.onEvent(after);
      host.emit({ kind: 'other', name: 'tool:loaded' });
      expect(after).toHaveBeenCalledWith({ kind: 'other', name: 'tool:loaded' });
    });
  });

  describe('queryAll', () => {
    it('returns the rows for the entity set, and every page of a paged result in order', async () => {
      const host = createFakeHost({
        tables: { accounts: [{ a: 1 }], powerpagecomponents: { pages: [[{ n: 1 }, { n: 2 }], [{ n: 3 }], []] } },
      });
      await expect(host.queryAll({ ...QUERY, entitySet: 'accounts' })).resolves.toEqual([{ a: 1 }]);
      await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
      expect(host.callsOf('queryAll').map((c) => c.pages)).toEqual([1, 3]);
      expect(host.callsOf('queryAll')[1]?.query).toEqual(QUERY);
    });

    it('asks responders first, in order, and falls back to the table when none answers', async () => {
      const host = createFakeHost({
        tables: { powerpagecomponents: [{ from: 'table' }] },
        responders: [
          (q) => (q.filter?.includes('= 35') === true ? [{ from: 'first' }] : undefined),
          (q) => (q.filter?.includes('eq 11') === true ? [{ from: 'second' }] : undefined),
        ],
      });
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype = 35' })).resolves.toEqual([
        { from: 'first' },
      ]);
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 11' })).resolves.toEqual([
        { from: 'second' },
      ]);
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 9' })).resolves.toEqual([
        { from: 'table' },
      ]);
    });

    it('fails loudly with a 404 for an entity set nobody scripted', async () => {
      const host = createFakeHost();
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: 404 });
    });

    it('throws a scripted failure with its status, for as many calls as `times` says', async () => {
      const host = createFakeHost({
        tables: { powerpagecomponents: [{ n: 1 }] },
        failures: [{ operation: 'query', entitySet: 'powerpagecomponents', status: 503, times: 2 }],
      });
      await expect(host.queryAll(QUERY)).rejects.toMatchObject({ name: 'HostReadError', status: 503 });
      await expect(host.queryAll(QUERY)).rejects.toBeInstanceOf(HostReadError);
      await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }]);
    });

    it('fails every matching call when `times` is left out, and only those that contain the text', async () => {
      const host = createFakeHost({
        tables: { powerpagecomponents: [{ n: 1 }] },
        failures: [{ operation: 'query', entitySet: 'powerpagecomponents', status: null, contains: 'eq 18' }],
      });
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 18' })).rejects.toMatchObject({
        status: null,
      });
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 18' })).rejects.toMatchObject({
        status: null,
      });
      await expect(host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 11' })).resolves.toEqual([{ n: 1 }]);
      await expect(host.queryAll({ ...QUERY, filter: null })).resolves.toEqual([{ n: 1 }]);
    });

    it('records a failed call too', async () => {
      const host = createFakeHost({ failures: [{ operation: 'query', entitySet: 'powerpagecomponents', status: 429 }] });
      await host.queryAll(QUERY).catch(() => undefined);
      expect(host.callsOf('queryAll')).toHaveLength(1);
    });
  });

  describe('downloadFileColumn', () => {
    it('returns canned text by <entitySet>/<id>/<column>', async () => {
      const host = createFakeHost({
        fileColumns: { [`powerpagecomponents/${GUID}/filecontent`]: 'export function get() {}' },
      });
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
        'export function get() {}',
      );
      expect(host.callsOf('downloadFileColumn')).toEqual([
        { method: 'downloadFileColumn', entitySet: 'powerpagecomponents', id: GUID, column: 'filecontent' },
      ]);
    });

    it('fails with a 404 for a column nobody scripted', async () => {
      const host = createFakeHost();
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('fails one record and not another, and file failures do not touch queries', async () => {
      const other = '11111111-2222-3333-4444-555555555555';
      const host = createFakeHost({
        tables: { powerpagecomponents: [] },
        fileColumns: {
          [`powerpagecomponents/${GUID}/filecontent`]: 'a',
          [`powerpagecomponents/${other}/filecontent`]: 'b',
        },
        failures: [{ operation: 'file', entitySet: 'powerpagecomponents', status: 500, contains: other }],
      });
      await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe('a');
      await expect(host.downloadFileColumn('powerpagecomponents', other, 'filecontent')).rejects.toMatchObject({
        status: 500,
      });
      await expect(host.queryAll(QUERY)).resolves.toEqual([]);
    });
  });

  describe('recorded calls', () => {
    it('records every method in order and clears them', async () => {
      const host = createFakeHost({ tables: { powerpagecomponents: [] } });
      await host.getTheme();
      await host.getActiveConnection();
      await host.queryAll(QUERY);
      expect(host.calls.map((c) => c.method)).toEqual(['getTheme', 'getActiveConnection', 'queryAll']);
      host.clearCalls();
      expect(host.calls).toEqual([]);
    });
  });
  ```

- [ ] **Step 13: Run the tests and confirm they FAIL**

  ```bash
  npx vitest run src/services/pptb/fakeHost.test.ts
  ```

  Expect: FAIL. "Test Files 1 failed", "Tests 21 failed (21)", each with `Error: not implemented: phase 01`, thrown by Phase 00's stub `createFakeHost`.

- [ ] **Step 14: Implement `fakeHost.ts`**

  Replace the whole of `src/services/pptb/fakeHost.ts`. Delete any placeholder `FakeHostInit` or `FakeHostControls` Phase 00 declared in the stub: they are defined here now.

  ```ts file=src/services/pptb/fakeHost.ts
  import { HostReadError } from './host.types';
  import type {
    Connection,
    FileFilter,
    HostEvent,
    Notice,
    ODataQuery,
    PptbHost,
    SaveResult,
    ThemeName,
  } from './host.types';
  import { HostCallError, messageForStatus } from './hostErrors';

  /** Rows for one entity set: a flat list, or `pages` to model paging (the fake still returns all rows, as the contract says). */
  export type FakeResult = readonly unknown[] | { pages: readonly (readonly unknown[])[] };
  /** Return a result to answer a query, or undefined to pass it to the next responder and then to `tables`. */
  export type FakeResponder = (q: ODataQuery) => FakeResult | undefined;
  /**
   * A scripted failure. It stands for a read that already used up its retries, so the fake throws at once.
   * `contains` narrows it: a substring of the query's `$filter`, or of the record id for a file download.
   * `times` fails that many calls and then lets later calls succeed; omit it to fail every matching call.
   */
  export type FakeFailure = {
    operation: 'query' | 'file';
    entitySet: string;
    status: number | null;
    contains?: string;
    times?: number;
  };
  export type NotifyBehaviour = 'ok' | 'throw' | 'reject' | 'missing';
  export type SaveBehaviour = 'save' | 'cancel' | 'reject';
  export type SimpleBehaviour = 'ok' | 'reject';

  export type FakeHostInit = {
    theme?: ThemeName;
    connection?: Connection | null;
    /** Canned rows by entity set, used when no responder answers. A set with no entry fails with a 404. */
    tables?: Readonly<Record<string, FakeResult>>;
    responders?: readonly FakeResponder[];
    failures?: readonly FakeFailure[];
    /** File column text, keyed `<entitySet>/<id>/<column>`. A missing key fails with a 404. */
    fileColumns?: Readonly<Record<string, string>>;
    notify?: NotifyBehaviour;
    save?: SaveBehaviour;
    copy?: SimpleBehaviour;
    openExternal?: SimpleBehaviour;
  };

  export type FakeCall =
    | { method: 'getTheme' }
    | { method: 'notify'; notice: Notice }
    | { method: 'copyText'; text: string }
    | { method: 'saveFile'; defaultName: string; content: string | Uint8Array; filters: readonly FileFilter[] }
    | { method: 'openExternal'; url: string }
    | { method: 'getActiveConnection' }
    | { method: 'queryAll'; query: ODataQuery; pages: number }
    | { method: 'downloadFileColumn'; entitySet: string; id: string; column: string };

  export type SavedFile = { path: string; defaultName: string; content: string | Uint8Array };

  export type FakeHostControls = {
    /** Delivers an event to every subscribed handler, as the real adapter does for a PPTB event. */
    emit(event: HostEvent): void;
    /** Every host call so far, in order. A failed call is recorded too. */
    readonly calls: readonly FakeCall[];
    callsOf<M extends FakeCall['method']>(method: M): readonly Extract<FakeCall, { method: M }>[];
    clearCalls(): void;
    /** Files the fake "saved", in order. A cancelled or rejected save adds nothing. */
    readonly savedFiles: readonly SavedFile[];
    listenerCount(): number;
    setTheme(theme: ThemeName): void;
    /** Changes what `getActiveConnection` returns. It does not emit; call `emit({ kind: 'connection-changed' })` too. */
    setConnection(connection: Connection | null): void;
    setNotify(behaviour: NotifyBehaviour): void;
    setSave(behaviour: SaveBehaviour): void;
    setCopy(behaviour: SimpleBehaviour): void;
    setOpenExternal(behaviour: SimpleBehaviour): void;
  };

  function notFound(what: string): HostReadError {
    return new HostReadError(`No canned ${what}.`, 404);
  }

  function pagesOf(result: FakeResult): readonly (readonly unknown[])[] {
    return 'pages' in result ? result.pages : [result];
  }

  /**
   * An in-memory PptbHost for tests. Every failing mode rejects, as createPptbHost does, and `queryAll` returns
   * every row of the matching result without applying `$select` or `$filter`.
   */
  export function createFakeHost(init: FakeHostInit = {}): PptbHost & FakeHostControls {
    let theme: ThemeName = init.theme ?? 'light';
    let connection: Connection | null = init.connection ?? null;
    let notify: NotifyBehaviour = init.notify ?? 'ok';
    let save: SaveBehaviour = init.save ?? 'save';
    let copy: SimpleBehaviour = init.copy ?? 'ok';
    let open: SimpleBehaviour = init.openExternal ?? 'ok';
    const calls: FakeCall[] = [];
    const savedFiles: SavedFile[] = [];
    const handlers = new Set<(e: HostEvent) => void>();
    const failureUses = new Map<FakeFailure, number>();

    function scriptedFailure(operation: 'query' | 'file', entitySet: string, text: string): HostReadError | null {
      for (const failure of init.failures ?? []) {
        if (failure.operation !== operation || failure.entitySet !== entitySet) continue;
        if (failure.contains !== undefined && !text.includes(failure.contains)) continue;
        const used = failureUses.get(failure) ?? 0;
        if (failure.times !== undefined && used >= failure.times) continue;
        failureUses.set(failure, used + 1);
        return new HostReadError(messageForStatus(failure.status), failure.status);
      }
      return null;
    }

    return {
      getTheme: () => {
        calls.push({ method: 'getTheme' });
        return Promise.resolve(theme);
      },

      notify: (notice) => {
        calls.push({ method: 'notify', notice });
        if (notify === 'ok') return Promise.resolve();
        if (notify === 'throw') return Promise.reject(new TypeError('The fake host notification threw.'));
        if (notify === 'reject') return Promise.reject(new Error('The fake host notification was rejected.'));
        return Promise.reject(new HostCallError('Host call failed: showNotification.'));
      },

      copyText: (text) => {
        calls.push({ method: 'copyText', text });
        return copy === 'ok'
          ? Promise.resolve()
          : Promise.reject(new HostCallError('Host call failed: copyToClipboard.'));
      },

      saveFile: (defaultName, content, filters) => {
        calls.push({ method: 'saveFile', defaultName, content, filters });
        if (save === 'cancel') return Promise.resolve<SaveResult>({ status: 'cancelled' });
        if (save === 'reject') return Promise.reject(new HostCallError('Host call failed: saveFile.'));
        const path = `C:\\fake\\${defaultName}`;
        savedFiles.push({ path, defaultName, content });
        return Promise.resolve<SaveResult>({ status: 'saved', path });
      },

      openExternal: (url) => {
        calls.push({ method: 'openExternal', url });
        return open === 'ok'
          ? Promise.resolve()
          : Promise.reject(new HostCallError('Host call failed: openInConnectionBrowser.'));
      },

      getActiveConnection: () => {
        calls.push({ method: 'getActiveConnection' });
        return Promise.resolve(connection);
      },

      onEvent: (handler) => {
        handlers.add(handler);
        return () => {
          handlers.delete(handler);
        };
      },

      queryAll: (query) => {
        const call = { method: 'queryAll' as const, query, pages: 0 };
        calls.push(call);
        const failure = scriptedFailure('query', query.entitySet, query.filter ?? '');
        if (failure !== null) return Promise.reject(failure);
        let result: FakeResult | undefined;
        for (const responder of init.responders ?? []) {
          result = responder(query);
          if (result !== undefined) break;
        }
        result ??= init.tables?.[query.entitySet];
        if (result === undefined) return Promise.reject(notFound(`result for ${query.entitySet}`));
        const pages = pagesOf(result);
        call.pages = pages.length;
        return Promise.resolve(pages.flat());
      },

      downloadFileColumn: (entitySet, id, column) => {
        calls.push({ method: 'downloadFileColumn', entitySet, id, column });
        const failure = scriptedFailure('file', entitySet, id);
        if (failure !== null) return Promise.reject(failure);
        const text = init.fileColumns?.[`${entitySet}/${id}/${column}`];
        return text === undefined
          ? Promise.reject(notFound(`file column ${entitySet}/${id}/${column}`))
          : Promise.resolve(text);
      },

      emit: (event) => {
        for (const handler of [...handlers]) {
          try {
            handler(event);
          } catch (error) {
            console.error('PPTB fake host: an event handler threw', error instanceof Error ? error.name : 'NonError');
          }
        }
      },
      get calls() {
        return calls;
      },
      callsOf: <M extends FakeCall['method']>(method: M) =>
        calls.filter((c): c is Extract<FakeCall, { method: M }> => c.method === method),
      clearCalls: () => {
        calls.length = 0;
      },
      get savedFiles() {
        return savedFiles;
      },
      listenerCount: () => handlers.size,
      setTheme: (next) => {
        theme = next;
      },
      setConnection: (next) => {
        connection = next;
      },
      setNotify: (next) => {
        notify = next;
      },
      setSave: (next) => {
        save = next;
      },
      setCopy: (next) => {
        copy = next;
      },
      setOpenExternal: (next) => {
        open = next;
      },
    };
  }
  ```

- [ ] **Step 15: Run the tests and confirm they PASS**

  ```bash
  npx vitest run src/services/pptb
  ```

  Expect: PASS, 3 test files and 112 tests (29, 62 and 21).

- [ ] **Step 16: Run the gate and commit**

  ```bash
  npx prettier --write src/services/pptb
  npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run
  git add src/services/pptb/fakeHost.ts src/services/pptb/fakeHost.test.ts
  git commit -m "feat(pptb): add the in-memory fake host for tests"
  ```

  Expect: all four gate commands succeed with no ESLint output and Prettier's "All matched files use Prettier code style!", and the commit lists two files. If `tsc -b` reports a type error in another phase's file that imports `FakeHostInit` or `FakeHostControls`, the name is the pinned one: fix the call site's usage in that phase, not the names here.

## Phase verification

- [ ] `npx vitest run src/services/pptb` passes: 3 files, 112 tests (29 in `dataverseRead.test.ts`, 62 in `pptbHost.test.ts`, 21 in `fakeHost.test.ts`).
- [ ] The gate set passes: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run`.
- [ ] Host globals are touched in one file: `grep -rlE "window\.(toolboxAPI|dataverseAPI)" src --include=*.ts --include=*.tsx` prints exactly `src/services/pptb/pptbHost.ts`.
- [ ] Dataverse is read-only: `grep -o "dataverseAPI\.[A-Za-z]*" src/services/pptb/pptbHost.ts | sort -u` prints only `dataverseAPI.queryData`, and `grep -rnE "dataverseAPI\.(create|update|delete|execute|associate|disassociate|publishCustomizations|deploySolution|[a-zA-Z]*Multiple)" src/services/pptb --include=*.ts --exclude=*.test.ts` prints nothing.
- [ ] The toolbox surface is the documented one: `grep -o "toolboxAPI\.[A-Za-z.]*" src/services/pptb/pptbHost.ts | sort -u` prints exactly `toolboxAPI.connections.getActiveConnection`, `toolboxAPI.events.off`, `toolboxAPI.events.on`, `toolboxAPI.fileSystem.saveFile`, `toolboxAPI.utils.copyToClipboard`, `toolboxAPI.utils.getCurrentTheme`, `toolboxAPI.utils.openInConnectionBrowser` and `toolboxAPI.utils.showNotification`.
- [ ] Nothing noisy is logged: `grep -rnE "console\.(log|warn|info|debug)" src/services/pptb` prints nothing; the only `console.error` calls are the fixed-label lines in `hostErrors.ts` and the event-handler line in `fakeHost.ts`.
- [ ] Only this phase's files changed: `git log --stat -3` lists `hostErrors.ts`, `dataverseRead.ts`, `pptbHost.ts`, `fakeHost.ts` and the three test files (plus a deleted stub assertion, if Step 0 removed one), and no file outside `src/services/pptb/`.
- [ ] The Spike S2 hand-off table above names every host behaviour this phase had to assume (`@odata.nextLink`, `Prefer` header, `$value` download, `events.off`, `Uint8Array` save, `status` on errors), and each has a file and function for Phase 12 to edit.

## Done when

- `createPptbHost()` implements every `PptbHost` member over `window.toolboxAPI` and `window.dataverseAPI`, rejects with a `HostCallError` or `HostReadError` on every failure, retries a 429 or 5xx three times at 1 s, 2 s and 4 s, follows `@odata.nextLink` across pages, and never logs more than an error name and a status.
- `createFakeHost()` honours the same contract and gives phases 06, 14, 15, 18, 21 and 24 every control they need: notify modes, save and cancel, copy, events, responders, paged results, scripted failures, file columns and recorded calls.
- A test proves the adapter reaches only read members, and the greps above prove `window.toolboxAPI` and `window.dataverseAPI` appear in one file.
- The three Spike S2 unknowns are isolated in `dataverseRead.ts`, `pptbHost.ts` and `hostErrors.ts`, with the hand-off table naming the edit point for each.
- The gate set passes and the work is in three commits on `001-server-logic-starter-inspector`.
