# Phase 5 Inspector Session, UI and Export Implementation Plan

**Goal:** Complete P5.5 / Task 6 and P5.7 / Task 8: select a site, inspect a cancellable scan, review findings, and save the captured review.

**Architecture:** The app injects the actual reader and rule functions into one app-owned Inspector session; the title bar consumes only app-owned context. Facts and review marks are the only evaluation inputs; results and counts are derived. A separate export controller owns one immutable capture and one idle/building/saving state.

**Tech stack:** Existing React 19.2, TypeScript, Vitest, Testing Library, PPTB adapter, Graphite tokens and shared primitives; existing report renderers and filename helpers.

**Scope:** P5.5 and P5.7 from `phasse5plan.md`, spec 4.0.1 Stories 7–9, layout 10a references 05/06, plus the evidence/cancellation amendments pinned in the parent plan.

**Out of scope:** Other Phase 5 owners' transport, reader, rule and PDF implementation; changes to other features; release publication.

**Parent plan:** [Complete Logic Inspector](11-01-2026-phase-5-logic-inspector.md).

## Grounding and execution order

- Execute 6a → 6b → 6c → 6d after Tasks 3–5 supply the pinned host/reader/rule contracts. Execute 8a → 8b after 6d and Task 7's real PDF renderer.
- All commands below run from `C:/Users/RyanDev/source/repos/Server Logic`. Each path-labelled code block creates that entire new file; `diff` blocks modify existing files only.
- Implementation commands are instructions for the implementing session; the verification section separately records the source-overlay checks already run without production edits.
- Focused planning signal: `npx vitest run src/app/ConnectionProvider.test.tsx src/app/App.test.tsx src/components/Modal.test.tsx src/components/PillGroup.test.tsx src/features/inspector/model/rules.test.ts src/features/inspector/report/buildReportModel.test.ts` → 6 files, 116 tests passed on 2026-11-01. The baseline document's latest checkpoint is authoritative: 1402 tests, typecheck and builds pass; see `docs/plans/11-01-2026-phase-5-baseline.md` for checkpoint history.
- Required upstream signatures: `listSites(host, signal?)`; `runScan(host, connection, site, scanId, onProgress, { now?, signal? }?)`; `Finding.hasUnscannedEvidence`; canonical `canReviewFinding` and `evaluateSite` enforce review eligibility. `SiteFacts` and `Readable` retain their current shapes. `runScan` must settle only after its already-dispatched physical reads settle, including abort: the session's queue enforces the cross-generation four-read ceiling by awaiting that promise.
- Task 5's exact confirmation contract is `ScanConfirmationError extends Error` with `readonly facts: SiteFacts`, plus `confirmScanIdentity(host, facts, signal?): Promise<SiteFacts>`. A failed identity read retains facts and their existing `stopped` value; same ID+URL accepts, successful different/null throws `AbortError`. The app dependency module maps the class through `unconfirmedFacts(error)`, so the session/provider/title bar import no feature error class. Pending facts occupy the same source-state slot, remain unevaluated and unexportable, and Retry invokes only the confirmation helper.
- Report contracts stay unchanged: `buildReportModel(result, options, exportedAt)`, `renderMarkdown(model): string`, synchronous `renderPdf(model): Uint8Array`, `reportFileName(model)` and `reportFileNameBeforeBuild(result, options)`.
- UI colour/type ownership remains `src/app/theme/tokens.css`. Geometry follows the 230px rail plus three equal columns in reference 05; the supported minimum is 1024×700. The new non-dev copy is “This isn't a development environment. Inspector is designed for dev sites.”
- Keyboard decisions are grounded in [APG select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), read 2026-11-01: navigation previews, Enter/Space/Tab/blur commit eligible options, Escape/clicking the trigger cancel the preview, type-ahead and active-descendant scrolling. React's current `useSyncExternalStore` documentation was checked through Context7: immutable cached source snapshots, stable subscription functions, cleanup.
- A host refresh begins its identity read in the event callback. Its resolved promise commits confirmed identity with `flushSync` before a queued native-save handoff; it does not call `flushSync` inside rendering or an Effect. This bounded imperative-integration use follows the current React documentation and is proved by the queued-host-event export test.
- Task 6d owns only the exact placeholder-marker replacement in `tests/buildShape.test.ts`. Task 9's later build-proof edits start from that replacement; execution sequences the shared file rather than assigning concurrent writes.

---

### Task 6a: Preserve confirmed connection identity and expose refresh status

**Owns:** P5.5 connection lifecycle and WR-005; existing consumers retain `useActiveConnection(): Connection | null`.

**Files:**

- Create: `src/test/deferred.ts` — deterministic promise control reused by these tests.
- Create: `src/app/ConnectionProvider.lifecycle.test.tsx` — initial/refresh error distinction, latest-request protection and listener cleanup.
- Modify: `src/app/useActiveConnection.ts` — companion status context/hook.
- Modify: `src/app/ConnectionProvider.tsx` — confirmed identity and lifecycle refreshes.
- Signal: `src/app/ConnectionProvider.lifecycle.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/test/deferred.ts`:

```typescript
export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
```

Create `src/app/ConnectionProvider.lifecycle.test.tsx`:

```tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import { useActiveConnection, useConnectionStatus } from '@/app/useActiveConnection';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { deferred } from '@/test/deferred';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const C: Connection = { id: 'c', url: 'https://c.example', name: 'Original', environment: 'Dev' };

function Probe() {
  const connection = useActiveConnection();
  const status = useConnectionStatus();
  return <>
    <output aria-label="Identity">{connection?.name ?? 'none'}</output>
    <output aria-label="Connection state">{JSON.stringify({ confirmed: status.confirmed, pending: status.pending, error: status.error })}</output>
    <button onClick={status.refresh}>Refresh connection</button>
  </>;
}

function mount(host = createFakeHost({ connection: C })) {
  const view = render(<HostContext value={host}><ConnectionProvider><Probe /></ConnectionProvider></HostContext>);
  return { host, ...view };
}
const state = () => screen.getByLabelText('Connection state').textContent;

describe('confirmed connection lifecycle', () => {
  it('distinguishes initial loading, initial failure, and a successful null connection', async () => {
    const first = deferred<Connection | null>();
    const host = createFakeHost();
    vi.spyOn(host, 'getActiveConnection').mockReturnValueOnce(first.promise).mockResolvedValue(null);
    mount(host);
    expect(state()).toBe('{"confirmed":false,"pending":true,"error":null}');
    await act(async () => { first.reject(new Error('unavailable')); await Promise.resolve(); });
    expect(state()).toBe('{"confirmed":false,"pending":false,"error":"initial"}');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh connection' }));
    await act(async () => { await Promise.resolve(); });
    expect(state()).toBe('{"confirmed":true,"pending":false,"error":null}');
    expect(screen.getByLabelText('Identity')).toHaveTextContent('none');
  });

  it('keeps identity after refresh rejection and accepts a confirmed disconnect on retry', async () => {
    const host = createFakeHost({ connection: C });
    const read = vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(C).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null);
    mount(host);
    await screen.findByText('Original');
    await act(async () => { host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    expect(screen.getByLabelText('Identity')).toHaveTextContent('Original');
    expect(state()).toBe('{"confirmed":true,"pending":false,"error":"refresh"}');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh connection' })); await Promise.resolve(); });
    expect(read).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText('Identity')).toHaveTextContent('none');
  });

  it('rejects stale success and stale failure after a newer request', async () => {
    const oldSuccess = deferred<Connection | null>();
    const oldFailure = deferred<Connection | null>();
    const host = createFakeHost();
    vi.spyOn(host, 'getActiveConnection').mockReturnValueOnce(oldSuccess.promise).mockReturnValueOnce(oldFailure.promise).mockResolvedValue({ ...C, name: 'Latest' });
    mount(host);
    await act(async () => { host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve(); });
    expect(screen.getByLabelText('Identity')).toHaveTextContent('Latest');
    await act(async () => { oldSuccess.resolve(C); oldFailure.reject(new Error('stale')); await Promise.resolve(); });
    expect(screen.getByLabelText('Identity')).toHaveTextContent('Latest');
    expect(state()).toBe('{"confirmed":true,"pending":false,"error":null}');
  });

  it('refreshes only on focus or visible-document changes and removes all listeners', async () => {
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { host, unmount } = mount();
    await screen.findByText('Original');
    const read = vi.spyOn(host, 'getActiveConnection');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    expect(read).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    expect(read).toHaveBeenCalledTimes(1);
    expect(host.listenerCount()).toBe(1);
    const focusListener = addWindow.mock.calls.find(([name]) => name === 'focus')?.[1];
    const visibilityListener = addDocument.mock.calls.find(([name]) => name === 'visibilitychange')?.[1];
    unmount();
    expect(removeWindow).toHaveBeenCalledWith('focus', focusListener);
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', visibilityListener);
    expect(host.listenerCount()).toBe(0);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('ignores completion after unmount', async () => {
    const pending = deferred<Connection | null>();
    const host = createFakeHost();
    vi.spyOn(host, 'getActiveConnection').mockReturnValue(pending.promise);
    const { unmount } = mount(host);
    unmount();
    await act(async () => { pending.resolve(C); await Promise.resolve(); });
    expect(host.listenerCount()).toBe(0);
    expect(screen.queryByLabelText('Identity')).toBeNull();
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/ConnectionProvider.lifecycle.test.tsx`

Expected: exit 1; the new companion `useConnectionStatus` export is absent, so the five lifecycle cases cannot pass.

- [ ] **Step 3: Implement the minimum fix**

Patch `src/app/useActiveConnection.ts`:

```diff
 export const ConnectionContext = createContext<Connection | null>(null);
+export type ConnectionStatus = {
+  confirmed: boolean;
+  pending: boolean;
+  error: 'initial' | 'refresh' | null;
+  revision: number;
+  refresh: () => void;
+};
+export const ConnectionStatusContext = createContext<ConnectionStatus | null>(null);
+
+export function useConnectionStatus(): ConnectionStatus {
+  const status = use(ConnectionStatusContext);
+  if (status === null) throw new Error('useConnectionStatus needs ConnectionProvider');
+  return status;
+}
```

Patch `src/app/ConnectionProvider.tsx`:

```diff
-import { useEffect, useState } from 'react';
+import { useCallback, useEffect, useRef, useState } from 'react';
+import { flushSync } from 'react-dom';
 import type { ReactElement, ReactNode } from 'react';
 import { useHost } from '@/app/HostContext';
-import { ConnectionContext } from '@/app/useActiveConnection';
+import { ConnectionContext, ConnectionStatusContext } from '@/app/useActiveConnection';
+import type { ConnectionStatus } from '@/app/useActiveConnection';
 import type { Connection } from '@/services/pptb/host.types';
+
+type State = Omit<ConnectionStatus, 'refresh'> & { connection: Connection | null };
@@
 export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
   const host = useHost();
-  const [connection, setConnection] = useState<Connection | null>(null);
+  const [state, setState] = useState<State>({ connection: null, confirmed: false, pending: true, error: null, revision: 0 });
+  const latest = useRef(0);
+  const mounted = useRef(false);
+  const load = useCallback((synchronous = false): void => {
+    const id = ++latest.current;
+    host.getActiveConnection().then(
+      (connection) => {
+        if (!mounted.current || id !== latest.current) return;
+        const accept = (): void => { setState((previous) => ({ connection, confirmed: true, pending: false, error: null, revision: previous.revision + 1 })); };
+        // Resolved host events must invalidate Inspector before an imperative native-save handoff.
+        // Promise callbacks run after the lifecycle, never inside an Effect or render.
+        if (synchronous) flushSync(accept); else accept();
+      },
+      () => {
+        if (mounted.current && id === latest.current) setState((previous) => ({ ...previous, pending: false, error: previous.confirmed ? 'refresh' : 'initial' }));
+      },
+    );
+  }, [host]);
+  const refresh = useCallback(() => {
+    setState((previous) => ({ ...previous, pending: true }));
+    load(true);
+  }, [load]);
 
   useEffect(() => {
-    let latest = 0;
-    const load = (): void => {
-      latest += 1;
-      const request = latest;
-      // A rejected read means the host could not say; the adapter has logged it. Show "Not connected".
-      host.getActiveConnection().then(
-        (value) => {
-          if (request === latest) setConnection(value);
-        },
-        () => {
-          if (request === latest) setConnection(null);
-        },
-      );
-    };
-    load();
+    mounted.current = true;
+    load();
     const unsubscribe = host.onEvent((event) => {
-      if (event.kind === 'connection-changed') load();
+      if (event.kind === 'connection-changed') refresh();
     });
+    const visible = (): void => {
+      if (document.visibilityState === 'visible') refresh();
+    };
+    window.addEventListener('focus', refresh);
+    document.addEventListener('visibilitychange', visible);
     return () => {
-      latest += 1;
+      latest.current += 1;
+      mounted.current = false;
       unsubscribe();
+      window.removeEventListener('focus', refresh);
+      document.removeEventListener('visibilitychange', visible);
     };
-  }, [host]);
+  }, [host, load, refresh]);
 
-  return <ConnectionContext value={connection}>{children}</ConnectionContext>;
+  return (
+    <ConnectionContext value={state.connection}>
+      <ConnectionStatusContext value={{ confirmed: state.confirmed, pending: state.pending, error: state.error, revision: state.revision, refresh }}>
+        {children}
+      </ConnectionStatusContext>
+    </ConnectionContext>
+  );
 }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app/ConnectionProvider.lifecycle.test.tsx`

Expected: exit 0; `Test Files 1 passed (1)`, `Tests 5 passed (5)`.

Run: `npx vitest run src/app/ConnectionProvider.test.tsx src/app/App.test.tsx`

Expected: exit 0; both existing suites pass, including the two app-level host handlers and null connection contract.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/test/deferred.ts src/app/ConnectionProvider.lifecycle.test.tsx src/app/ConnectionProvider.tsx src/app/useActiveConnection.ts
git commit --only -m "fix(app): retain confirmed connection on refresh failure" -- src/test/deferred.ts src/app/ConnectionProvider.lifecycle.test.tsx src/app/ConnectionProvider.tsx src/app/useActiveConnection.ts
```

### Task 6b: Own one Inspector session and serialize superseding reads

**Owns:** Scan/site generations, cross-generation serialization, session-only marks/selection, derived effective context, and app-owned DI. This store is not persisted and never stores evaluated results or counts.

**Files:**

- Create: `src/app/inspector-site/inspectorDeps.ts` — composition-time reader/rule dependencies.
- Create: `src/app/inspector-site/inspectorSession.ts` — source state and serialized async lifecycle.
- Create: `src/app/inspector-site/useInspector.ts` — app-owned consuming context.
- Create: `src/app/inspector-site/InspectorProvider.tsx` — connection bridge and React subscription.
- Create: `src/app/inspector-site/inspectorSession.test.ts` — races, marks, identity and physical request ceiling.
- Signal: `src/app/inspector-site/inspectorSession.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/app/inspector-site/inspectorSession.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { INSPECTOR_DEPS } from './inspectorDeps';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorSession } from './inspectorSession';
import { ScanConfirmationError } from '@/features/inspector/scan/scan';
import { file, read, siteFacts } from '@/features/inspector/model/fixtures';
import { countChecks } from '@/features/inspector/model/rules';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, ODataQuery } from '@/services/pptb/host.types';
import type { SiteFacts, SiteRef } from '@/types/inspector';
import { deferred } from '@/test/deferred';

const C = siteFacts().connection;
const A = siteFacts().site;
const B: SiteRef = { ...A, id: 'site-2', name: 'Other site' };
const OFF: SiteRef = { ...A, id: 'off', name: 'Inactive site', active: false };
const makeFacts = (connection: Connection, site: SiteRef, scanId: string): SiteFacts => siteFacts({ connection, site, scanId, files: [file({ roleIds: read([]) })] });

function setup(patch: Partial<InspectorDeps> = {}) {
  const host = createFakeHost({ connection: C });
  const deps: InspectorDeps = {
    ...INSPECTOR_DEPS,
    listSites: vi.fn(() => Promise.resolve([A, B, OFF])),
    runScan: vi.fn<InspectorDeps['runScan']>((_host, connection, site, id) => Promise.resolve(makeFacts(connection, site, id))),
    ...patch,
  };
  const refresh = vi.fn();
  const session = createInspectorSession(host, deps, refresh);
  return { host, deps, refresh, session };
}

describe('Inspector session', () => {
  it.each([null, 'connection-lost'] as const)('retains %s candidate facts without evaluation and retries only identity', async (stopped) => {
    const confirm = vi.fn<InspectorDeps['confirmScanIdentity']>().mockImplementationOnce((_host, facts) => Promise.reject(new ScanConfirmationError(facts))).mockImplementation((_host, facts) => Promise.resolve(facts));
    const evaluate = vi.fn(INSPECTOR_DEPS.evaluateSite);
    const run = vi.fn<InspectorDeps['runScan']>().mockImplementation((_host, connection, site, scanId) => Promise.reject(new ScanConfirmationError({ ...makeFacts(connection, site, scanId), stopped })));
    const { session } = setup({ runScan: run, confirmScanIdentity: confirm, evaluateSite: evaluate });
    await session.connect(C);
    await session.selectSite(A.id);
    const candidate = session.getSnapshot().facts;
    expect(candidate?.stopped).toBe(stopped);
    expect(session.getSnapshot().phase).toBe('awaiting-confirmation');
    expect(session.resultFor(session.getSnapshot())).toBeNull();
    session.toggleReview('file-1', 'webRole');
    expect(session.getSnapshot().marks.size).toBe(0);
    expect(evaluate).not.toHaveBeenCalled();
    await session.connect({ ...C, name: 'Relabelled', environment: 'Production' });
    await session.retryConfirmation();
    expect(session.getSnapshot().phase).toBe('awaiting-confirmation');
    expect(session.getSnapshot().facts).toBe(candidate);
    await session.retryConfirmation();
    expect(session.getSnapshot().phase).toBe('complete');
    expect(session.getSnapshot().facts).toBe(candidate);
    expect(session.resultFor(session.getSnapshot())?.facts.connection.name).toBe('Relabelled');
    expect(candidate?.connection).toEqual(C);
    expect(run).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('clears a pending candidate immediately when confirmation proves a different identity', async () => {
    const { session, refresh } = setup({
      runScan: (_host, connection, site, scanId) => Promise.reject(new ScanConfirmationError(makeFacts(connection, site, scanId))),
      confirmScanIdentity: () => Promise.reject(new DOMException('changed', 'AbortError')),
    });
    await session.connect(C);
    await session.selectSite(A.id);
    await session.retryConfirmation();
    expect(session.getSnapshot()).toMatchObject({ facts: null, site: null, connection: null, phase: 'idle', scanError: null });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('discards a stale confirmation response after a superseding identity change', async () => {
    const gate = deferred<SiteFacts>();
    const { session } = setup({
      runScan: (_host, connection, site, scanId) => Promise.reject(new ScanConfirmationError(makeFacts(connection, site, scanId))),
      confirmScanIdentity: () => gate.promise,
    });
    await session.connect(C);
    await session.selectSite(A.id);
    const candidate = session.getSnapshot().facts;
    if (candidate === null) throw new Error('No candidate');
    const confirmation = session.retryConfirmation();
    await Promise.resolve();
    const changed = session.connect({ ...C, id: 'other-identity' });
    expect(session.getSnapshot().facts).toBeNull();
    gate.resolve(candidate);
    await Promise.all([confirmation, changed]);
    expect(session.getSnapshot()).toMatchObject({ facts: null, site: null });
    expect(session.resultFor(session.getSnapshot())).toBeNull();
  });

  it('never preselects, including a single active site, and refuses inactive sites', async () => {
    const { session, deps } = setup({ listSites: vi.fn(() => Promise.resolve([A, OFF])) });
    await session.connect(C);
    expect(session.getSnapshot().site).toBeNull();
    await session.selectSite(OFF.id);
    expect(deps.runScan).not.toHaveBeenCalled();
    expect(session.getSnapshot().facts).toBeNull();
  });

  it('selects the first Needs-review check and derives review/undo counts', async () => {
    const { session } = setup();
    await session.connect(C);
    await session.selectSite(A.id);
    expect(session.getSnapshot().selectedCheck).toBe('webRole');
    session.toggleReview('file-1', 'webRole');
    const reviewed = session.resultFor(session.getSnapshot());
    expect(countChecks(reviewed?.files[0]?.findings ?? [])).toMatchObject({ C: 2, V: 1, K: 3 });
    expect(session.getSnapshot().selectedCheck).toBe('webRole');
    expect(session.getSnapshot().announcement).toBe('Review updated.');
    session.toggleReview('file-1', 'webRole');
    expect(session.resultFor(session.getSnapshot())?.files[0]?.findings[0].status).toBe('needs-review');
  });

  it.each(['read-failed', 'not-scanned'] as const)('cannot mark %s evidence reviewed', async (reason) => {
    const { session } = setup({ runScan: (_host, connection, site, id) => Promise.resolve(siteFacts({ connection, site, scanId: id, roles: { ok: false, reason } })) });
    await session.connect(C);
    await session.selectSite(A.id);
    session.toggleReview('file-1', 'webRole');
    expect(session.getSnapshot().marks.size).toBe(0);
  });

  it('retains facts and marks on same-identity relabel, deriving immutable current context', async () => {
    const { session, deps } = setup();
    await session.connect(C);
    await session.selectSite(A.id);
    session.toggleReview('file-1', 'webRole');
    const before = session.getSnapshot();
    const renamed = { ...C, name: 'Renamed', environment: 'Production' as const };
    await session.connect(renamed);
    expect(session.getSnapshot().facts).toBe(before.facts);
    expect(session.getSnapshot().marks).toBe(before.marks);
    expect(session.getSnapshot().epoch).toBe(before.epoch);
    expect(session.resultFor(session.getSnapshot())?.facts.connection).toEqual(renamed);
    expect(before.facts?.connection).toEqual(C);
    expect(deps.listSites).toHaveBeenCalledTimes(1);
    expect(deps.runScan).toHaveBeenCalledTimes(1);
  });

  it.each(['id', 'url', 'null', 'site', 'rescan'] as const)('clears facts, marks and file selection synchronously for %s', async (change) => {
    const { session } = setup();
    await session.connect(C);
    await session.selectSite(A.id);
    session.toggleReview('file-1', 'webRole');
    const before = session.getSnapshot().epoch;
    const pending = change === 'id' ? session.connect({ ...C, id: 'new' })
      : change === 'url' ? session.connect({ ...C, url: 'https://new.example' })
      : change === 'null' ? session.connect(null)
      : change === 'site' ? session.selectSite(B.id) : session.rescan();
    expect(session.getSnapshot()).toMatchObject({ facts: null, selectedFileId: null, selectedCheck: null });
    expect(session.getSnapshot().marks.size).toBe(0);
    expect(session.getSnapshot().epoch).toBeGreaterThan(before);
    await pending;
  });

  it('keeps a site-list failure separate from an empty result and retries', async () => {
    const listSites = vi.fn<InspectorDeps['listSites']>().mockRejectedValueOnce(new HostReadError('Denied', 403)).mockResolvedValue([]);
    const { session } = setup({ listSites });
    await session.connect(C);
    expect(session.getSnapshot()).toMatchObject({ sitesStatus: 'error', siteError: "You don't have permission to read this data." });
    await session.reloadSites();
    expect(session.getSnapshot()).toMatchObject({ sitesStatus: 'ready', sites: [], siteError: null });
  });

  it('serializes replacements, discards stale progress/results, and skips intermediate generations', async () => {
    const first = deferred<SiteFacts>();
    let oldProgress: (scanned: number, total: number) => void = () => undefined;
    let oldSignal: AbortSignal | undefined;
    const run = vi.fn<InspectorDeps['runScan']>().mockImplementationOnce((_host, _connection, _site, _id, progress, options) => {
      oldProgress = progress;
      oldSignal = options?.signal;
      return first.promise;
    }).mockImplementation((_host, connection, site, id) => Promise.resolve(makeFacts(connection, site, id)));
    const { session } = setup({ runScan: run });
    await session.connect(C);
    const old = session.selectSite(A.id);
    await Promise.resolve();
    const skipped = session.rescan();
    const newest = session.selectSite(B.id);
    expect(oldSignal?.aborted).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    oldProgress(9, 10);
    expect(session.getSnapshot().progress).toEqual({ scanned: 0, total: 0 });
    first.resolve(makeFacts(C, A, 'stale'));
    await Promise.all([old, skipped, newest]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().facts?.site.id).toBe(B.id);
    expect(session.getSnapshot().scanError).toBeNull();
  });

  it('counts physical promises across abort and connection replacement: maximum four', async () => {
    const gates = Array.from({ length: 8 }, () => deferred<readonly unknown[]>());
    const query: ODataQuery = { entitySet: 'physical', select: [], filter: null, orderBy: null, pageSize: 1 };
    let active = 0;
    let maximum = 0;
    let index = 0;
    const { host, session, deps } = setup({ runScan: async (reader, connection, site, id) => {
      await Promise.all(Array.from({ length: 4 }, () => reader.queryAll(query)));
      return makeFacts(connection, site, id);
    } });
    vi.spyOn(host, 'queryAll').mockImplementation(async () => {
      const gate = gates[index++];
      if (gate === undefined) throw new Error('unexpected read');
      maximum = Math.max(maximum, ++active);
      try { return await gate.promise; } finally { active -= 1; }
    });
    await session.connect(C);
    const old = session.selectSite(A.id);
    await Promise.resolve();
    expect(active).toBe(4);
    const connection = session.connect({ ...C, id: 'next' });
    expect(deps.listSites).toHaveBeenCalledTimes(1);
    for (const gate of gates.slice(0, 4)) gate.resolve([]);
    await Promise.all([old, connection]);
    const current = session.selectSite(A.id);
    await Promise.resolve();
    expect(active).toBe(4);
    for (const gate of gates.slice(4)) gate.resolve([]);
    await current;
    expect(maximum).toBe(4);
    expect(session.getSnapshot().facts?.connection.id).toBe('next');
  });

  it('retains stopped evidence and disables work after disposal', async () => {
    const { session } = setup({ runScan: (_host, connection, site, id) => Promise.resolve(siteFacts({ connection, site, scanId: id, stopped: 'connection-lost', inventoryComplete: false })) });
    await session.connect(C);
    await session.selectSite(A.id);
    expect(session.getSnapshot().phase).toBe('complete');
    expect(session.resultFor(session.getSnapshot())?.banners).toContain('Connection lost. Reconnect and rescan.');
    const publish = vi.fn();
    session.subscribe(publish);
    session.dispose();
    const count = publish.mock.calls.length;
    await session.rescan();
    expect(publish).toHaveBeenCalledTimes(count);
    expect(session.getSnapshot().facts).toBeNull();
  });

  it('discards an in-flight completion after unmount and can reactivate after effect cleanup', async () => {
    const gate = deferred<SiteFacts>();
    const run = vi.fn<InspectorDeps['runScan']>().mockReturnValueOnce(gate.promise).mockImplementation((_host, connection, site, id) => Promise.resolve(makeFacts(connection, site, id)));
    const { session } = setup({ runScan: run });
    await session.connect(C);
    const pending = session.selectSite(A.id);
    await Promise.resolve();
    const listener = vi.fn();
    session.subscribe(listener);
    session.dispose();
    gate.resolve(makeFacts(C, A, 'disposed'));
    await pending;
    expect(listener).not.toHaveBeenCalled();
    expect(session.getSnapshot().facts).toBeNull();
    session.activate();
    await session.connect(C);
    await session.selectSite(A.id);
    expect(session.getSnapshot().phase).toBe('complete');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('handles self-confirmed identity cancellation without publishing an error', async () => {
    const { session, refresh } = setup({ runScan: () => Promise.reject(new DOMException('superseded', 'AbortError')) });
    await session.connect(C);
    await session.selectSite(A.id);
    expect(session.getSnapshot()).toMatchObject({ phase: 'idle', facts: null, scanError: null });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('ignores an aborted rejection after a newer result and reports a genuine failure with rescan available', async () => {
    const old = deferred<SiteFacts>();
    const run = vi.fn<InspectorDeps['runScan']>().mockReturnValueOnce(old.promise).mockRejectedValueOnce(new HostReadError('denied', 403)).mockImplementation((_host, connection, site, id) => Promise.resolve(makeFacts(connection, site, id)));
    const { session } = setup({ runScan: run });
    await session.connect(C);
    const first = session.selectSite(A.id);
    await Promise.resolve();
    const second = session.rescan();
    old.reject(new Error('stale failure'));
    await Promise.all([first, second]);
    expect(session.getSnapshot()).toMatchObject({ phase: 'error', scanError: "You don't have permission to read this data." });
    await session.rescan();
    expect(session.getSnapshot()).toMatchObject({ phase: 'complete', scanError: null });
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/inspector-site/inspectorSession.test.ts`

Expected: exit 1; `inspectorDeps` / `inspectorSession` cannot be resolved.

- [ ] **Step 3: Implement the minimum fix**

Create `src/app/inspector-site/inspectorDeps.ts`:

```typescript
import { canReviewFinding, evaluateSite } from '@/features/inspector/model/rules';
import { confirmScanIdentity, listSites, runScan, ScanConfirmationError } from '@/features/inspector/scan/scan';
import type { SiteFacts } from '@/types/inspector';

export type InspectorDeps = {
  listSites: typeof listSites;
  runScan: typeof runScan;
  confirmScanIdentity: typeof confirmScanIdentity;
  unconfirmedFacts: (error: unknown) => SiteFacts | null;
  evaluateSite: typeof evaluateSite;
  canReviewFinding: typeof canReviewFinding;
};
export const INSPECTOR_DEPS: InspectorDeps = {
  listSites, runScan, confirmScanIdentity, evaluateSite, canReviewFinding,
  unconfirmedFacts: (error) => error instanceof ScanConfirmationError ? error.facts : null,
};
```

Create `src/app/inspector-site/inspectorSession.ts`:

```typescript
import type { InspectorDeps } from './inspectorDeps';
import { isAbortError, messageForStatus, statusOf } from '@/services/pptb/hostErrors';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import type { CheckId, ReviewKey, SiteFacts, SiteRef, SiteResult } from '@/types/inspector';

export type InspectorState = {
  connection: Connection | null;
  sites: readonly SiteRef[];
  sitesStatus: 'idle' | 'loading' | 'ready' | 'error';
  siteError: string | null;
  site: SiteRef | null;
  epoch: number;
  phase: 'idle' | 'scanning' | 'awaiting-confirmation' | 'confirming' | 'complete' | 'error';
  facts: SiteFacts | null;
  marks: ReadonlySet<ReviewKey>;
  selectedFileId: string | null;
  selectedCheck: CheckId | null;
  progress: { scanned: number; total: number };
  scanError: string | null;
  announcement: string;
};

export function sameConnection(a: Connection | null, b: Connection | null): boolean {
  return a === null || b === null ? a === b : a.id === b.id && a.url === b.url;
}

function emptyState(epoch = 0): InspectorState {
  return {
    connection: null, sites: [], sitesStatus: 'idle', siteError: null, site: null, epoch,
    phase: 'idle', facts: null, marks: new Set(), selectedFileId: null, selectedCheck: null,
    progress: { scanned: 0, total: 0 }, scanError: null, announcement: '',
  };
}

export function createInspectorSession(host: PptbHost, deps: InspectorDeps, refreshConnection: () => void) {
  let state = emptyState();
  let alive = true;
  let controller: AbortController | null = null;
  let tail = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<InspectorState>): void => {
    if (!alive) return;
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const current = (epoch: number, signal: AbortSignal): boolean => alive && !signal.aborted && epoch === state.epoch;
  const invalidate = (patch: Partial<InspectorState>): void => {
    controller?.abort();
    const fresh = emptyState(state.epoch + 1);
    publish({ ...fresh, connection: state.connection, sites: state.sites, sitesStatus: state.sitesStatus, site: state.site, ...patch });
  };

  function queue(work: (signal: AbortSignal, epoch: number) => Promise<void>, failed: (error: unknown) => void): Promise<void> {
    controller = new AbortController();
    const signal = controller.signal;
    const epoch = state.epoch;
    // Never race an abort signal against the physical reader promise: its settlement drains prior reads.
    tail = tail.then(async () => {
      if (!current(epoch, signal)) return;
      try { await work(signal, epoch); }
      catch (error: unknown) {
        if (!current(epoch, signal)) return;
        if (isAbortError(error)) {
          invalidate({ connection: null, site: null, sites: [], sitesStatus: 'idle' });
          refreshConnection();
        } else failed(error);
      }
    });
    return tail;
  }

  function resultFor(snapshot: InspectorState): SiteResult | null {
    if (snapshot.phase !== 'complete' || snapshot.facts === null || snapshot.connection === null || !sameConnection(snapshot.connection, snapshot.facts.connection)) return null;
    const facts = { ...snapshot.facts, connection: snapshot.connection, site: snapshot.site ?? snapshot.facts.site };
    return deps.evaluateSite(facts, snapshot.marks);
  }

  function loadSites(): Promise<void> {
    if (!alive || state.connection === null) return tail;
    return queue(async (signal, epoch) => {
      const sites = await deps.listSites(host, signal);
      if (!current(epoch, signal)) return;
      publish({ sites, sitesStatus: 'ready', siteError: null });
    }, (error) => { publish({ sitesStatus: 'error', siteError: messageForStatus(statusOf(error)) }); });
  }

  function scan(site: SiteRef): Promise<void> {
    const connection = state.connection;
    if (!alive || connection === null || !site.active) return tail;
    invalidate({ site, phase: 'scanning', announcement: 'Scan started.' });
    const scanId = `${connection.id}:${connection.url}:${site.id}:${String(state.epoch)}`;
    return queue(async (signal, epoch) => {
      const facts = await deps.runScan(host, connection, site, scanId, (scanned, total) => {
        if (current(epoch, signal)) publish({ progress: { scanned, total } });
      }, { signal });
      if (!current(epoch, signal)) return;
      if (facts.scanId !== scanId || facts.site.id !== site.id || !sameConnection(facts.connection, connection)) {
        publish({ phase: 'idle', announcement: '' });
        refreshConnection();
        return;
      }
      accept(facts);
    }, (error) => {
      if (!retainConfirmation(error, scanId)) publish({ phase: 'error', scanError: messageForStatus(statusOf(error)), announcement: 'Scan failed.' });
    });
  }

  function accept(facts: SiteFacts): void {
    const first = deps.evaluateSite(facts, state.marks).files[0];
    publish({
      facts, phase: 'complete', scanError: null, selectedFileId: first?.fileId ?? null,
      selectedCheck: first?.findings.find((finding) => finding.status === 'needs-review')?.check ?? first?.findings[0].check ?? null,
      announcement: facts.stopped === null ? 'Scan complete.' : 'Scan stopped. Reconnect and rescan.',
    });
  }

  function retainConfirmation(error: unknown, scanId: string): boolean {
    const facts = deps.unconfirmedFacts(error);
    if (facts === null) return false;
    if (facts.scanId !== scanId || facts.site.id !== state.site?.id || !sameConnection(facts.connection, state.connection)) return true;
    publish({ facts, phase: 'awaiting-confirmation', scanError: null, announcement: 'Scan awaits connection confirmation.' });
    return true;
  }

  function retryConfirmation(): Promise<void> {
    const candidate = state.facts;
    if (!alive || state.phase !== 'awaiting-confirmation' || candidate === null) return tail;
    publish({ phase: 'confirming', scanError: null, announcement: 'Confirming the scan connection…' });
    return queue(async (signal, epoch) => {
      const confirmed = await deps.confirmScanIdentity(host, candidate, signal);
      if (!current(epoch, signal)) return;
      if (confirmed.scanId !== candidate.scanId || confirmed.site.id !== state.site?.id || !sameConnection(confirmed.connection, state.connection)) {
        invalidate({ connection: null, site: null, sites: [], sitesStatus: 'idle' });
        refreshConnection();
        return;
      }
      accept(confirmed);
    }, (error) => {
      if (!retainConfirmation(error, candidate.scanId)) publish({ phase: 'awaiting-confirmation', scanError: messageForStatus(statusOf(error)), announcement: 'Scan awaits connection confirmation.' });
    });
  }

  return {
    getSnapshot: (): InspectorState => state,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    resultFor,
    retryConfirmation,
    activate: (): void => { alive = true; },
    dispose: (): void => {
      controller?.abort();
      alive = false;
      state = emptyState(state.epoch + 1);
    },
    connect: (connection: Connection | null): Promise<void> => {
      if (!alive) return tail;
      if (sameConnection(state.connection, connection)) {
        if (state.connection !== connection) publish({ connection });
        return tail;
      }
      invalidate({ connection, sites: [], sitesStatus: connection === null ? 'idle' : 'loading', site: null });
      return connection === null ? tail : loadSites();
    },
    reloadSites: (): Promise<void> => {
      if (!alive || state.connection === null || state.sitesStatus !== 'error') return tail;
      invalidate({ sites: [], sitesStatus: 'loading', site: null });
      return loadSites();
    },
    selectSite: (id: string): Promise<void> => {
      const site = state.sites.find((candidate) => candidate.id === id && candidate.active);
      return site === undefined || state.site?.id === id ? tail : scan(site);
    },
    rescan: (): Promise<void> => state.site === null ? tail : scan(state.site),
    selectFile: (id: string): void => {
      const file = resultFor(state)?.files.find((candidate) => candidate.fileId === id);
      if (file === undefined) return;
      publish({ selectedFileId: id, selectedCheck: file.findings.find((finding) => finding.status === 'needs-review')?.check ?? file.findings[0].check });
    },
    selectCheck: (check: CheckId): void => { publish({ selectedCheck: check }); },
    toggleReview: (fileId: string, check: CheckId): void => {
      const finding = resultFor(state)?.files.find((file) => file.fileId === fileId)?.findings.find((item) => item.check === check);
      if (finding === undefined || (finding.status !== 'reviewed' && !deps.canReviewFinding(finding))) return;
      const marks = new Set(state.marks);
      const key: ReviewKey = `${fileId}:${check}`;
      if (finding.status === 'reviewed') marks.delete(key); else marks.add(key);
      publish({ marks, selectedCheck: check, announcement: finding.status === 'reviewed' ? 'Review removed.' : 'Review updated.' });
    },
  };
}

export type InspectorSession = ReturnType<typeof createInspectorSession>;
```

Create `src/app/inspector-site/useInspector.ts`:

```typescript
import { createContext, use } from 'react';
import type { InspectorSession, InspectorState } from './inspectorSession';
import type { SiteResult } from '@/types/inspector';

export type InspectorContextValue = { session: InspectorSession; state: InspectorState; result: SiteResult | null };
export const InspectorContext = createContext<InspectorContextValue | null>(null);
export function useInspector(): InspectorContextValue {
  const value = use(InspectorContext);
  if (value === null) throw new Error('useInspector needs InspectorProvider');
  return value;
}
```

Create `src/app/inspector-site/InspectorProvider.tsx`:

```tsx
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import { useActiveConnection, useConnectionStatus } from '@/app/useActiveConnection';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorSession, sameConnection } from './inspectorSession';
import { InspectorContext } from './useInspector';

export function InspectorProvider({ children, deps }: { children: ReactNode; deps: InspectorDeps }) {
  const host = useHost();
  const connection = useActiveConnection();
  const { refresh, revision } = useConnectionStatus();
  const session = useMemo(() => createInspectorSession(host, deps, refresh), [host, deps, refresh]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useLayoutEffect(() => {
    session.activate();
    return session.dispose;
  }, [session]);
  useLayoutEffect(() => { void session.connect(connection); }, [session, connection, revision]);
  // Hide old identity's evaluation in the same render; the layout effect invalidates source state before paint.
  const result = sameConnection(state.connection, connection) ? session.resultFor(state) : null;
  return <InspectorContext value={{ session, state, result }}>{children}</InspectorContext>;
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app/inspector-site/inspectorSession.test.ts`

Expected: exit 0; the session suite passes, including the physical maximum `4`, stale generation, partial evidence and review-eligibility assertions.

Run: `npx vitest run src/app/ConnectionProvider.test.tsx src/app/ConnectionProvider.lifecycle.test.tsx src/features/inspector/model src/features/inspector/scan`

Expected: exit 0; connection, rule and reader suites pass against Tasks 3–5's contracts.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/app/inspector-site/inspectorDeps.ts src/app/inspector-site/inspectorSession.ts src/app/inspector-site/useInspector.ts src/app/inspector-site/InspectorProvider.tsx src/app/inspector-site/inspectorSession.test.ts
git commit --only -m "feat(inspector): add app-scoped serialized scan session" -- src/app/inspector-site/inspectorDeps.ts src/app/inspector-site/inspectorSession.ts src/app/inspector-site/useInspector.ts src/app/inspector-site/InspectorProvider.tsx src/app/inspector-site/inspectorSession.test.ts
```

### Task 6c: Provide the select-only site picker with complete keyboard interaction

**Owns:** AC-7.2 and the APG select-only interaction. This task adds the control; 6d mounts it together with its provider.

**Files:**

- Create: `src/app/inspector-site/SitePicker.tsx` — app-owned select-only combobox.
- Create: `src/app/inspector-site/sitePicker.css` — token-based picker surfaces, focus and overflow.
- Create: `src/app/inspector-site/SitePicker.test.tsx` — real keyboard/pointer interaction and disabled explanations.
- Signal: `src/app/inspector-site/SitePicker.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/app/inspector-site/SitePicker.test.tsx`:

```tsx
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SitePicker } from './SitePicker';
import type { SiteRef } from '@/types/inspector';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const sites: SiteRef[] = [
  { id: 'a', name: 'Alpha portal', domain: 'alpha.example', active: true },
  { id: 'b', name: 'Beta portal', domain: 'beta.example', active: true },
  { id: 'c', name: 'Closed portal', domain: 'closed.example', active: false },
];
function Harness({ items = sites, reason = null, selected = null }: { items?: readonly SiteRef[]; reason?: string | null; selected?: SiteRef | null }) {
  const [value, setValue] = useState(selected);
  return <>
    <SitePicker sites={items} value={value} reason={reason} onSelect={setValue} />
    <output aria-label="Selected site">{value?.id ?? 'none'}</output>
    <button>Next control</button>
  </>;
}
const picker = () => screen.getByRole('combobox');
const active = () => document.getElementById(picker().getAttribute('aria-activedescendant') ?? '');

describe('site select-only combobox', () => {
  it('does not preselect the only site', () => {
    render(<Harness items={sites.slice(0, 1)} />);
    expect(picker()).toHaveTextContent('No site selected');
    expect(picker()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('previews with arrows, keeps DOM focus, and cancels with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    picker().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(active()).toHaveTextContent('Beta portal');
    expect(picker()).toHaveFocus();
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
    await user.keyboard('{Escape}');
    expect(picker()).toHaveAttribute('aria-expanded', 'false');
    expect(picker()).not.toHaveAttribute('aria-activedescendant');
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
  });

  it.each(['{Enter}', ' ', '{Tab}', '{Alt>}{ArrowUp}{/Alt}'])('commits an eligible preview with %s', async (key) => {
    const user = userEvent.setup();
    render(<Harness />);
    picker().focus();
    await user.keyboard(`{ArrowDown}{ArrowDown}${key}`);
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('b');
    expect(picker()).toHaveTextContent('Beta portal');
    expect(picker()).toHaveAttribute('aria-expanded', 'false');
    if (key === '{Tab}') expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
  });

  it('exposes inactive options to navigation, explains them, and refuses selection', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    picker().focus();
    await user.keyboard('{End}');
    const inactive = screen.getByRole('option', { name: /Closed portal/ });
    expect(active()).toBe(inactive);
    expect(inactive).toHaveAttribute('aria-disabled', 'true');
    expect(inactive).toHaveAccessibleDescription('Inactive sites cannot be scanned.');
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
    await user.click(inactive);
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
  });

  it('supports bounded arrows, Home, End and ten-option paging', async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 15 }, (_, i): SiteRef => ({ id: String(i), name: `Site ${String(i).padStart(2, '0')}`, domain: 'example.com', active: true }));
    render(<Harness items={items} />);
    picker().focus();
    await user.keyboard('{Home}{ArrowUp}');
    expect(active()).toHaveTextContent('Site 00');
    await user.keyboard('{PageDown}');
    expect(active()).toHaveTextContent('Site 10');
    await user.keyboard('{End}{ArrowDown}');
    expect(active()).toHaveTextContent('Site 14');
    await user.keyboard('{PageUp}');
    expect(active()).toHaveTextContent('Site 04');
  });

  it('matches multi-character type-ahead and cycles repeated characters', async () => {
    const user = userEvent.setup();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
    render(<Harness items={[...sites, { id: 'bb', name: 'Bravo portal', domain: 'bravo.example', active: true }]} />);
    picker().focus();
    await user.keyboard('be');
    expect(active()).toHaveTextContent('Beta portal');
    clock.mockReturnValue(3000);
    await user.keyboard('b');
    expect(active()).toHaveTextContent('Bravo portal');
    await user.keyboard('b');
    expect(active()).toHaveTextContent('Beta portal');
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
  });

  it('scrolls the active descendant into view', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    try {
      const user = userEvent.setup();
      render(<Harness />);
      picker().focus();
      await user.keyboard('{End}');
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
    } finally {
      if (descriptor === undefined) Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      else Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor);
    }
  });

  it('commits on blur, but a second trigger click cancels the preview', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(picker());
    await user.keyboard('{ArrowDown}');
    await user.click(picker());
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('none');
    await user.click(picker());
    await user.keyboard('{ArrowDown}');
    fireEvent.blur(picker(), { relatedTarget: screen.getByRole('button', { name: 'Next control' }) });
    expect(screen.getByLabelText('Selected site')).toHaveTextContent('b');
  });

  it('keeps a disabled picker focusable with its reason and preserves full names', async () => {
    const user = userEvent.setup();
    const long = { ...sites[0], id: 'long', name: 'A very long portal name '.repeat(8).trim(), domain: 'long.example', active: true } satisfies SiteRef;
    render(<Harness items={[long]} selected={long} reason="Loading sites" />);
    await user.tab();
    expect(picker()).toHaveFocus();
    expect(picker()).toHaveAttribute('aria-disabled', 'true');
    expect(picker()).toHaveAccessibleDescription('Loading sites');
    expect(picker()).toHaveAttribute('title', long.name);
    expect(picker()).toHaveAccessibleName(`Power Pages site: ${long.name}`);
    await user.keyboard('{Enter}{ArrowDown}');
    expect(picker()).toHaveAttribute('aria-expanded', 'false');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/inspector-site/SitePicker.test.tsx`

Expected: exit 1; `SitePicker` cannot be resolved.

- [ ] **Step 3: Implement the minimum fix**

Create `src/app/inspector-site/SitePicker.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { useDisabledReason } from '@/components/useDisabledReason';
import type { SiteRef } from '@/types/inspector';
import './sitePicker.css';

type Props = { sites: readonly SiteRef[]; value: SiteRef | null; reason: string | null; onSelect: (site: SiteRef) => void };

export function SitePicker({ sites, value, reason, onSelect }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const search = useRef({ text: '', at: 0 });
  const { triggerProps, tooltip } = useDisabledReason(reason);
  const expanded = open && reason === null;
  const option = sites[index];
  const optionId = expanded && option !== undefined ? `${id}-${String(index)}` : undefined;
  const name = value?.name ?? 'No site selected';

  useEffect(() => {
    if (optionId === undefined) return;
    const element = document.getElementById(optionId);
    if (typeof element?.scrollIntoView === 'function') element.scrollIntoView({ block: 'nearest' });
  }, [optionId]);

  function close(): void { setOpen(false); search.current = { text: '', at: 0 }; }
  function show(next = Math.max(0, sites.findIndex((site) => site.id === value?.id))): void {
    if (reason !== null || sites.length === 0) return;
    setIndex(next);
    setOpen(true);
  }
  function commit(candidate = option, leave = false): void {
    if (candidate?.active) { close(); onSelect(candidate); }
    else if (leave) close();
  }
  function move(delta: number): void {
    setIndex((previous) => Math.min(sites.length - 1, Math.max(0, previous + delta)));
  }
  function typeAhead(key: string): void {
    const now = Date.now();
    const text = (now - search.current.at < 1000 ? search.current.text : '') + key.toLocaleLowerCase('en');
    search.current = { text, at: now };
    const repeated = text.replaceAll(key.toLocaleLowerCase('en'), '') === '';
    const prefix = repeated ? key.toLocaleLowerCase('en') : text;
    const start = repeated ? (expanded ? index + 1 : 0) : 0;
    for (let offset = 0; offset < sites.length; offset += 1) {
      const next = (start + offset) % sites.length;
      if (sites[next]?.name.toLocaleLowerCase('en').startsWith(prefix)) { show(next); return; }
    }
    if (!expanded) show();
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    triggerProps.onKeyDown?.(event);
    if (reason !== null) return;
    const key = event.key;
    if (key === 'Tab') { if (expanded) commit(option, true); return; }
    if (key === 'Escape') { if (expanded) { event.preventDefault(); close(); } return; }
    if (event.altKey && key === 'ArrowUp') { event.preventDefault(); if (expanded) commit(option, true); return; }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!expanded) show(key === 'ArrowUp' ? 0 : undefined);
      else if (!event.altKey) move(key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (key === 'Home' || key === 'End') { event.preventDefault(); show(key === 'Home' ? 0 : sites.length - 1); return; }
    if ((key === 'PageDown' || key === 'PageUp') && expanded) { event.preventDefault(); move(key === 'PageDown' ? 10 : -10); return; }
    const typingSpace = key === ' ' && search.current.text !== '' && Date.now() - search.current.at < 1000;
    if (key === 'Enter' || (key === ' ' && !typingSpace)) { event.preventDefault(); if (expanded) commit(); else show(); return; }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); typeAhead(key); }
  }

  return <div className="site-picker ui-reason-anchor">
    <button
      {...triggerProps}
      type="button"
      role="combobox"
      className="ui-pill ui-pill--control site-picker__trigger"
      aria-label={`Power Pages site: ${name}`}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      aria-controls={`${id}-list`}
      aria-activedescendant={optionId}
      aria-disabled={reason === null ? undefined : true}
      title={name}
      onKeyDown={onKeyDown}
      onBlur={(event) => { triggerProps.onBlur?.(event); if (expanded) commit(option, true); }}
      onClick={() => { if (reason === null) { if (expanded) close(); else show(); } }}
    >
      <span className="site-picker__name">{name}</span><Icon name="chevron-down" size={12} />
    </button>
    {tooltip}
    <div id={`${id}-list`} role="listbox" aria-label="Power Pages sites" className="site-picker__list" hidden={!expanded}>
      {sites.map((site, i) => <div
        id={`${id}-${String(i)}`}
        key={site.id}
        role="option"
        tabIndex={-1}
        aria-selected={expanded && i === index}
        aria-disabled={site.active ? undefined : true}
        aria-label={`${site.name} · ${site.domain}${site.active ? '' : ' · Inactive'}`}
        aria-describedby={site.active ? undefined : `${id}-${String(i)}-reason`}
        className="site-picker__option"
        title={`${site.name} · ${site.domain}`}
        onMouseDown={(event) => { event.preventDefault(); setIndex(i); commit(site); }}
      >
        <span>{site.name}{site.active ? '' : ' · Inactive'}</span>
        <span className="site-picker__domain">{site.domain}</span>
        {site.active ? null : <span role="tooltip" id={`${id}-${String(i)}-reason`} className="site-picker__reason">Inactive sites cannot be scanned.</span>}
      </div>)}
    </div>
  </div>;
}
```

Create `src/app/inspector-site/sitePicker.css`:

```css
.site-picker { position: relative; min-width: 0; max-width: 190px; }
.site-picker__trigger { min-width: 120px; width: 100%; max-width: 190px; justify-content: space-between; background: var(--tile); }
.site-picker__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-picker__list { position: absolute; z-index: 80; top: calc(100% + 8px); right: 0; width: 350px; max-height: 360px; overflow: auto; padding: 6px; background: var(--tile); border: 1px solid var(--control-border); border-radius: 12px; }
.site-picker__list[hidden] { display: none; }
.site-picker__option { display: flex; flex-direction: column; gap: 4px; padding: 10px; border: 1px solid transparent; border-radius: 6px; white-space: normal; overflow-wrap: anywhere; color: var(--text); cursor: pointer; }
.site-picker__option[aria-selected='true'] { border-color: var(--primary); background: var(--ok-tint); }
.site-picker__option[aria-disabled='true'] { color: var(--muted); cursor: not-allowed; border-style: dashed; }
.site-picker__domain { color: var(--muted); font-size: 11px; }
.site-picker__reason { display: none; color: var(--text-2); font-size: 11px; }
.site-picker__option:hover .site-picker__reason,
.site-picker__option[aria-selected='true'] .site-picker__reason { display: block; }
.site-picker > .ui-reason { left: auto; right: 0; }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app/inspector-site/SitePicker.test.tsx`

Expected: exit 0; every selection, cancellation, paging, inactive-option, focus and type-ahead case passes.

Run: `npx vitest run src/components/PillGroup.test.tsx src/components/Button.test.tsx src/app/inspector-site/inspectorSession.test.ts`

Expected: exit 0; existing disabled-control conventions and session eligibility remain passing.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/app/inspector-site/SitePicker.tsx src/app/inspector-site/sitePicker.css src/app/inspector-site/SitePicker.test.tsx
git commit --only -m "feat(inspector): add accessible select-only site picker" -- src/app/inspector-site/SitePicker.tsx src/app/inspector-site/sitePicker.css src/app/inspector-site/SitePicker.test.tsx
```

### Task 6d: Mount the Inspector journey and render every scan/review state

**Owns:** CR-001, AC-7.1–7.12 and AC-8.1–8.12 presentation; hidden-tab lifecycle; Graphite layout and composition. Export action/imports land together in 8b.

**Files:**

- Create: `src/features/inspector/inspectorTestHarness.tsx` — fake reader UI harness and real-reader host fixture.
- Create: `src/features/inspector/InspectorPage.test.tsx` — complete state and review presentation.
- Create: `src/app/Inspector.integration.test.tsx` — actual App → session → reader → rules path and hidden-tab races.
- Create: `src/features/inspector/InspectorContent.tsx` — files, ring, checks, detail and snapshot.
- Create: `src/features/inspector/inspector.css` — layout 10a using semantic tokens.
- Modify: `src/features/inspector/InspectorPage.tsx` — state routing and rescan.
- Modify: `src/app/App.tsx` — gated Inspector dependency injection around title bar and panels.
- Modify: `src/app/shell/SitePill.tsx` — app-owned context adapter to the picker.
- Modify: `src/app/shell/TitleBar.tsx`, `src/app/shell/shell.css` — accessible long connection labels.
- Modify: `src/app/App.test.tsx` — target the real combobox rather than placeholder markup.
- Modify: `tests/buildShape.test.ts` — marker-only replacement; Task 9's broader assertions follow this committed state.
- Signal: `src/features/inspector/InspectorPage.test.tsx`, `src/app/Inspector.integration.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/inspectorTestHarness.tsx`:

```tsx
// Test-only fixtures: production App never imports this module.
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { InspectorProvider } from '@/app/inspector-site/InspectorProvider';
import { INSPECTOR_DEPS } from '@/app/inspector-site/inspectorDeps';
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import { InspectorContext } from '@/app/inspector-site/useInspector';
import type { InspectorContextValue } from '@/app/inspector-site/useInspector';
import { SitePill } from '@/app/shell/SitePill';
import { file, read, siteFacts } from '@/features/inspector/model/fixtures';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection, PptbHost } from '@/services/pptb/host.types';

export const TEST_CONNECTION = siteFacts().connection;
export const TEST_SITE = siteFacts().site;
export const OTHER_SITE = { ...TEST_SITE, id: 'other-site', name: 'Other portal' };

export function fakeInspectorDeps(patch: Partial<InspectorDeps> = {}): InspectorDeps {
  return {
    ...INSPECTOR_DEPS,
    listSites: vi.fn(() => Promise.resolve([TEST_SITE, OTHER_SITE])),
    runScan: vi.fn<InspectorDeps['runScan']>((_host, connection, site, scanId) => Promise.resolve(siteFacts({ connection, site, scanId, files: [file({ roleIds: read([]) }), file({ id: 'inactive', name: 'inactive-handler', active: false })] }))),
    ...patch,
  };
}

export function renderInspector(ui: ReactElement, options: { deps?: InspectorDeps; host?: ReturnType<typeof createFakeHost>; connection?: Connection | null } = {}) {
  const host = options.host ?? createFakeHost({ connection: options.connection === undefined ? TEST_CONNECTION : options.connection });
  const deps = options.deps ?? fakeInspectorDeps();
  let captured: InspectorContextValue | null = null;
  const view = render(<HostContext value={host}><NotifyProvider><ConnectionProvider><InspectorProvider deps={deps}>
    <SitePill />{ui}
    <InspectorContext.Consumer>{(value) => { captured = value; return null; }}</InspectorContext.Consumer>
  </InspectorProvider></ConnectionProvider></NotifyProvider></HostContext>);
  return {
    host, deps, user: userEvent.setup(), ...view,
    current: (): InspectorContextValue => { if (captured === null) throw new Error('No Inspector context'); return captured; },
  };
}

export function realInspectorHost() {
  const siteId = '10000000-0000-0000-0000-000000000001';
  const roleId = '20000000-0000-0000-0000-000000000001';
  const fileId = '30000000-0000-0000-0000-000000000001';
  const rows = [
    { powerpagecomponentid: roleId, powerpagecomponenttype: 11, name: 'Members', statecode: 0, content: JSON.stringify({ anonymoususersrole: false, authenticatedusersrole: false }) },
    { powerpagecomponentid: fileId, powerpagecomponenttype: 35, name: 'live-fixture-handler', statecode: 0, filecontent_name: 'handler.sl', content: JSON.stringify({ adx_serverlogic_adx_webrole: [] }) },
    { powerpagecomponentid: '30000000-0000-0000-0000-000000000002', powerpagecomponenttype: 35, name: 'inactive-fixture-handler', statecode: 1, filecontent_name: 'inactive.sl', content: JSON.stringify({ adx_serverlogic_adx_webrole: [roleId] }) },
  ].map((row) => ({ ...row, powerpagesiteid: siteId, _powerpagesiteid_value: siteId }));
  const host = createFakeHost({
    connection: TEST_CONNECTION,
    tables: { powerpagesites: [{ powerpagesiteid: siteId, name: 'Reader fixture portal', primarydomainname: 'fixture.example', statecode: 0 }] },
    responders: [(query) => {
      if (query.entitySet !== 'powerpagecomponents') return undefined;
      const type = Number(/powerpagecomponenttype\s+eq\s+(\d+)/.exec(query.filter ?? '')?.[1]);
      return rows.filter((row) => row.powerpagecomponenttype === type);
    }],
  });
  const download = vi.spyOn(host, 'downloadFileColumn').mockImplementation((ref: Parameters<PptbHost['downloadFileColumn']>[0]) => {
    if (ref.entityLogicalName !== 'powerpagecomponent' || ref.primaryIdAttribute !== 'powerpagecomponentid' || ref.fileAttributeName !== 'filecontent') throw new Error('Wrong file descriptor');
    return Promise.resolve('function get() { return "{}"; }');
  });
  return { host, download };
}
```

Create `src/features/inspector/InspectorPage.test.tsx`:

```tsx
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InspectorPage } from './InspectorPage';
import { fakeInspectorDeps, renderInspector, TEST_CONNECTION, TEST_SITE } from './inspectorTestHarness';
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import { file, read, role, settings, siteFacts, value } from './model/fixtures';
import { TENANT_POLICY_NOTE } from './model/copy';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { HostReadError } from '@/services/pptb/host.types';
import type { SiteFacts, SiteRef } from '@/types/inspector';
import { deferred } from '@/test/deferred';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function choose(ui: ReturnType<typeof renderInspector>) {
  await waitFor(() => { expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled'); });
  await ui.user.click(screen.getByRole('combobox'));
  await ui.user.click(screen.getByRole('option', { name: /Development site/ }));
}

describe('Inspector presentation', () => {
  it('prompts for ToolBox connection without reading sites or showing findings', async () => {
    const ui = renderInspector(<InspectorPage />, { connection: null });
    expect(await screen.findByText('Select a connection in ToolBox to inspect a site.')).toBeVisible();
    expect(ui.deps.listSites).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).toBeNull();
  });

  it('distinguishes initial connection failure and recovers with Retry connection', async () => {
    const host = createFakeHost({ connection: TEST_CONNECTION });
    vi.spyOn(host, 'getActiveConnection').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(TEST_CONNECTION);
    const ui = renderInspector(<InspectorPage />, { host });
    expect(await screen.findByText("Couldn't confirm the ToolBox connection.")).toBeVisible();
    expect(ui.deps.listSites).not.toHaveBeenCalled();
    await ui.user.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText('Choose a site in the title bar to start a scan.')).toBeVisible();
  });

  it('distinguishes loading sites from a successful empty site list', async () => {
    const pending = deferred<readonly SiteRef[]>();
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ listSites: () => pending.promise }) });
    expect(await screen.findByText('Loading sites…')).toBeVisible();
    await act(async () => { pending.resolve([]); await Promise.resolve(); });
    expect(screen.getByText("No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.")).toBeVisible();
    expect(ui.deps.runScan).not.toHaveBeenCalled();
  });

  it('shows the site-list error reason and retries', async () => {
    const listSites = vi.fn<InspectorDeps['listSites']>().mockRejectedValueOnce(new HostReadError('denied', 403)).mockResolvedValue([TEST_SITE]);
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ listSites }) });
    expect(await screen.findByText("Couldn't load sites")).toBeVisible();
    expect(screen.getByText("You don't have permission to read this data.")).toBeVisible();
    await ui.user.click(screen.getByRole('button', { name: 'Retry loading sites' }));
    expect(await screen.findByText('Choose a site in the title bar to start a scan.')).toBeVisible();
  });

  it('announces scan progress politely and replaces it with completion', async () => {
    const pending = deferred<SiteFacts>();
    let progress: (done: number, total: number) => void = () => undefined;
    let complete: SiteFacts | null = null;
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan: (_host, connection, site, scanId, notify) => { progress = notify; complete = siteFacts({ connection, site, scanId }); return pending.promise; } }) });
    await choose(ui);
    act(() => { progress(2, 3); });
    expect(screen.getByRole('status')).toHaveTextContent('Scanned 2 of 3');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeDisabled();
    await act(async () => { if (complete === null) throw new Error('scan not started'); pending.resolve(complete); await Promise.resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent('Scan complete.');
    expect(screen.getByRole('heading', { name: 'Review server logic readiness' })).toBeVisible();
  });

  it('renders active/inactive files, all three checks, first-needed detail and synchronized review/undo', async () => {
    const ui = renderInspector(<InspectorPage />);
    await choose(ui);
    const files = await screen.findByRole('region', { name: 'Server logic (2)' });
    expect(within(files).getByRole('button', { name: /inactive-handler.*Inactive/ })).toBeVisible();
    expect(screen.getByRole('img', { name: '2 of 3 addressed' })).toBeVisible();
    const detail = screen.getByRole('region', { name: 'Web role assigned' });
    expect(within(detail).getByText('Questions to consider')).toBeVisible();
    expect(within(detail).getByText('Configuration snapshot')).toBeVisible();
    expect(screen.getByText(TENANT_POLICY_NOTE)).toBeVisible();
    expect(screen.getByRole('button', { name: /Table permissions.*Configured/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Outbound networking.*Configured/ })).toBeVisible();
    await ui.user.click(within(detail).getByRole('button', { name: 'Mark as reviewed' }));
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeVisible();
    expect(within(files).getByRole('button', { name: /customer-summary.*Ready · 1 reviewed/ })).toBeVisible();
    expect(within(detail).getByText('Original findings')).toBeVisible();
    expect(within(detail).getByText('No web role assigned. No site user can call it yet.')).toBeVisible();
    await ui.user.click(within(detail).getByRole('button', { name: 'Undo review' }));
    expect(screen.getByRole('img', { name: '2 of 3 addressed' })).toBeVisible();
    await ui.user.click(within(files).getByRole('button', { name: /inactive-handler/ }));
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).toBeNull();
    await ui.user.click(screen.getByRole('link', { name: 'Read Microsoft Learn guidance' }));
    expect(ui.host.callsOf('openExternal')).toHaveLength(1);
  });

  it('retains stopped partial evidence and shows every applicable banner without allowing incomplete review', async () => {
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan: (_host, connection, site, scanId) => Promise.resolve(siteFacts({
      connection, site, scanId, stopped: 'connection-lost', inventoryComplete: false,
      roles: read([role('a', { anonymous: true }), role('b', { anonymous: true })]),
      permissions: { ok: false, reason: 'read-failed' },
      settings: read(settings({ 'ServerLogic/Enabled': value('false'), 'ServerLogic/TimeoutInSeconds': value('241') })),
      files: [file({ roleIds: { ok: false, reason: 'not-scanned' }, code: { ok: false, reason: 'not-scanned' } })],
    })) }) });
    await choose(ui);
    expect(await screen.findByText('Connection lost. Reconnect and rescan.')).toBeVisible();
    expect(screen.getByText('Inventory incomplete. Reconnect and rescan.')).toBeVisible();
    expect(screen.getByText(/Server logic is disabled on this site/)).toBeVisible();
    expect(screen.getByText(/isn't a positive integer up to 240/)).toBeVisible();
    expect(screen.getByText(/More than one web role is marked/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Web role assigned.*Not scanned/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Table permissions.*Needs review/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).toBeNull();
  });

  it('shows a completed zero-file state and a genuine scan failure with working rescan', async () => {
    const run = vi.fn<InspectorDeps['runScan']>().mockRejectedValueOnce(new HostReadError('denied', 403)).mockImplementation((_host, connection, site, scanId) => Promise.resolve(siteFacts({ connection, site, scanId, files: [] })));
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan: run }) });
    await choose(ui);
    expect(await screen.findByText("Couldn't scan this site")).toBeVisible();
    await ui.user.click(screen.getByRole('button', { name: 'Rescan' }));
    expect(await screen.findByText('No server logic found on this site')).toBeVisible();
  });

  it('retains reviewed facts during refresh failure and updates renamed/relabelled context without mutating facts', async () => {
    const ui = renderInspector(<InspectorPage />);
    await choose(ui);
    await ui.user.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));
    const facts = ui.current().state.facts;
    vi.spyOn(ui.host, 'getActiveConnection').mockRejectedValueOnce(new Error('offline'));
    await act(async () => { ui.host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    expect(screen.getByText("Couldn't refresh the connection. Showing the last confirmed connection.")).toBeVisible();
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeVisible();
    ui.host.setConnection({ ...TEST_CONNECTION, name: 'Renamed environment', environment: 'Production' });
    await ui.user.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText(/Renamed environment · Production/)).toBeVisible();
    expect(screen.getByText("This isn't a development environment. Inspector is designed for dev sites.")).toBeVisible();
    expect(ui.current().state.facts).toBe(facts);
    expect(facts?.connection.name).toBe(TEST_CONNECTION.name);
  });
});
```

Create `src/app/Inspector.integration.test.tsx`:

```tsx
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { FAKE_STARTER_DEPS } from './starter-session/fakeStarterDeps';
import { realInspectorHost, TEST_CONNECTION } from '@/features/inspector/inspectorTestHarness';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { deferred } from '@/test/deferred';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function select(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => { expect(screen.getByRole('combobox', { name: /^Power Pages site:/ })).not.toHaveAttribute('aria-disabled'); });
  await user.click(screen.getByRole('combobox', { name: /^Power Pages site:/ }));
  await user.click(screen.getByRole('option', { name: /Reader fixture portal/ }));
}

describe('Inspector production composition', () => {
  it('retains final-confirmation failure while hidden and retries without repeating queries or downloads', async () => {
    const { host, download } = realInspectorHost();
    const renamed = { ...TEST_CONNECTION, name: 'Renamed pending connection', environment: 'Production' as const };
    const identity = vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(TEST_CONNECTION).mockResolvedValueOnce(TEST_CONNECTION).mockRejectedValueOnce(new Error('final refresh failed')).mockResolvedValue(renamed);
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await select(user);
    await screen.findByText('Read 2 server logic files.');
    expect(screen.getByRole('region', { name: 'Logic name' })).toBeVisible();
    const reads = host.callsOf('queryAll').length;
    expect(download).toHaveBeenCalledTimes(2);
    await act(async () => { host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(screen.getByRole('heading', { name: 'Confirm the scan connection' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Server logic (2)' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry confirmation' }));
    expect(await screen.findByRole('region', { name: 'Server logic (2)' })).toBeVisible();
    expect(screen.getByText('Renamed pending connection · Production / Reader fixture portal')).toBeVisible();
    expect(host.callsOf('queryAll')).toHaveLength(reads);
    expect(download).toHaveBeenCalledTimes(2);
    expect(identity).toHaveBeenCalledTimes(5);
  });

  it('clears an unconfirmed candidate after a hidden-tab connection change', async () => {
    const { host, download } = realInspectorHost();
    vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(TEST_CONNECTION).mockResolvedValueOnce(TEST_CONNECTION).mockRejectedValueOnce(new Error('final refresh failed')).mockResolvedValue({ ...TEST_CONNECTION, id: 'changed' });
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await select(user);
    await screen.findByText('Read 2 server logic files.');
    await act(async () => { host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(await screen.findByText('Choose a site in the title bar to start a scan.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry confirmation' })).toBeNull();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('distinguishes an initial connection failure from confirmed disconnection in the title bar', async () => {
    const host = createFakeHost();
    vi.spyOn(host, 'getActiveConnection').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(null);
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    expect(await screen.findByText('Connection unavailable')).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    await user.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText('Not connected')).toBeVisible();
    expect(screen.getByText('Select a connection in ToolBox to inspect a site.')).toBeVisible();
  });

  it('runs the actual reader/evaluator from the shell picker while Starter is visible', async () => {
    const { host, download } = realInspectorHost();
    const user = userEvent.setup();
    const view = render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await select(user);
    await waitFor(() => { expect(download).toHaveBeenCalledTimes(2); });
    expect(screen.getByRole('region', { name: 'Logic name' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(await screen.findByRole('region', { name: 'Server logic (2)' })).toBeVisible();
    expect(screen.getByRole('button', { name: /inactive-fixture-handler.*Inactive/ })).toBeVisible();
    expect(host.callsOf('queryAll').some((call) => call.query.entitySet === 'powerpagecomponents')).toBe(true);
    expect(host.callsOf('getActiveConnection').length).toBeGreaterThanOrEqual(2);
    expect(host.listenerCount()).toBe(2);
    view.unmount();
    expect(host.listenerCount()).toBe(0);
  });

  it('discards delayed reader work on a hidden-tab disconnect', async () => {
    const { host, download } = realInspectorHost();
    const pending = deferred<string>();
    download.mockImplementation(() => pending.promise);
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await select(user);
    await waitFor(() => { expect(download).toHaveBeenCalled(); });
    await act(async () => { host.setConnection(null); host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    expect(screen.getByRole('combobox', { name: /^Power Pages site:/ })).toHaveTextContent('No site selected');
    await act(async () => { pending.resolve('function get() { return "{}"; }'); await Promise.resolve(); });
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(screen.getByText('Select a connection in ToolBox to inspect a site.')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Server logic (2)' })).toBeNull();
    expect(host.callsOf('notify')).toHaveLength(0);
  });

  it('discards completed marks on a hidden-tab identity change', async () => {
    const { host } = realInspectorHost();
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await select(user);
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    await user.click(await screen.findByRole('button', { name: /live-fixture-handler.*Active/ }));
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Logic Starter' }));
    await act(async () => { host.setConnection({ id: 'different', name: 'Different', url: 'https://different.example', environment: 'Dev' }); host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    await user.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(await screen.findByText('Choose a site in the title bar to start a scan.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Undo review' })).toBeNull();
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/InspectorPage.test.tsx src/app/Inspector.integration.test.tsx`

Expected: exit 1; the placeholder has no state UI, findings, rescan or real combobox, and App does not provide an Inspector session.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/inspector/InspectorContent.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ExternalLink } from '@/app/ExternalLink';
import { useInspector } from '@/app/inspector-site/useInspector';
import { Button } from '@/components/Button';
import { Ring } from '@/components/Ring';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import type { RingState } from '@/lib/ringGeometry';
import type { CheckId, CheckStatus } from '@/types/inspector';
import { CHECK_COPY, TENANT_POLICY_NOTE } from './model/copy';
import { canReviewFinding, countChecks, filePill, fileSummary, ringLegend } from './model/rules';

const STATUS = {
  configured: { kind: 'ok', label: 'Configured' },
  reviewed: { kind: 'ok', label: 'Reviewed' },
  'needs-review': { kind: 'review', label: 'Needs review' },
  'not-scanned': { kind: 'unknown', label: 'Not scanned' },
} as const;
const LEARN: Record<CheckId, string> = {
  webRole: 'https://learn.microsoft.com/en-us/power-pages/security/security-best-practices',
  tablePermissions: 'https://learn.microsoft.com/en-us/power-pages/security/table-permissions',
  outbound: 'https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview',
};
const segment = (status: CheckStatus): RingState => status === 'not-scanned' ? 'not-scanned' : status === 'needs-review' ? 'review' : 'done';

export function InspectorContent({ actions }: { actions: ReactNode }) {
  const { result, state, session } = useInspector();
  const file = result?.files.find((item) => item.fileId === state.selectedFileId) ?? result?.files[0];
  if (result === null || file === undefined) return null;
  const finding = file.findings.find((item) => item.check === state.selectedCheck) ?? file.findings[0];
  const explanation = [...new Set([...finding.reasons.map((reason) => reason.text), ...finding.detail])];
  const snapshot = [['Web roles', file.snapshot.roles], ['Tables and privileges', file.snapshot.tables], ['Outbound settings', file.snapshot.outbound]] as const;

  return <div className="inspector-grid">
    <Tile heading={`Server logic (${String(result.files.length)})`} className="inspector-files">
      <ul className="inspector-file-list">
        {result.files.map((item) => {
          const pill = filePill(item);
          return <li key={item.fileId}>
            <button type="button" className="inspector-file" aria-pressed={item.fileId === file.fileId}
              aria-label={`${item.name} · ${item.active ? 'Active' : 'Inactive'} · ${pill} · ${fileSummary(item)}`}
              title={item.name} onClick={() => { session.selectFile(item.fileId); }}>
              <span className="inspector-file__name">{item.name}</span>
              <span>{item.active ? 'Active' : 'Inactive'}</span>
              <StatusBadge kind={pill === 'Needs review' ? 'review' : pill === 'Incomplete' ? 'unknown' : 'ok'} label={pill} />
              <span>{fileSummary(item)}</span>
            </button>
          </li>;
        })}
      </ul>
      <p className="inspector-tenant">{TENANT_POLICY_NOTE}</p>
    </Tile>
    <Tile className="inspector-title">
      <div className="inspector-title__copy">
        <p className="ui-mono inspector-file-heading" title={file.name}>{file.name} · {file.active ? 'Active' : 'Inactive'}</p>
        <h1>Review server logic readiness</h1>
        <p>Inspect access, permissions and outbound networking before release.</p>
        <p className="inspector-context">{result.facts.connection.name} · {result.facts.connection.environment} / {result.facts.site.name}</p>
      </div>
      <div className="inspector-actions">{actions}</div>
    </Tile>
    <Tile heading="Readiness" className="inspector-readiness">
      <Ring segments={file.findings.map((item) => segment(item.status))} label="addressed" size={190} />
      <p>{ringLegend(countChecks(file.findings))}</p>
    </Tile>
    {file.findings.map((item) => <button
      key={item.check} type="button" className={`inspector-finding inspector-finding--${item.check}`}
      aria-pressed={item.check === finding.check} aria-controls="inspector-detail"
      onClick={() => { session.selectCheck(item.check); }}>
      <span className="inspector-finding__title">{CHECK_COPY[item.check].title}</span>
      <span className="inspector-finding__summary" title={item.summary}>{item.summary}</span>
      <StatusBadge {...STATUS[item.status]} />
    </button>)}
    <Tile id="inspector-detail" heading={CHECK_COPY[finding.check].title} className="inspector-detail">
      <p className="inspector-category">{CHECK_COPY[finding.check].category}</p>
      <StatusBadge {...STATUS[finding.status]} />
      <p>{finding.guidance}</p>
      {explanation.length === 0 ? null : <>
        <h3>{finding.status === 'reviewed' ? 'Original findings' : 'Findings'}</h3>
        <ul>{explanation.map((text, index) => <li key={index}>{text}</li>)}</ul>
      </>}
      <h3>Questions to consider</h3>
      <ul>{finding.questions.map((question) => <li key={question}>{question}</li>)}</ul>
      <h3>Configuration snapshot</h3>
      {snapshot.map(([heading, lines]) => <section key={heading}>
        <h4>{heading}</h4>
        {lines.length === 0 ? <p>None found.</p> : <ul>{lines.map((line, index) => <li key={index}>{line}</li>)}</ul>}
      </section>)}
      <ExternalLink href={LEARN[finding.check]}>Read Microsoft Learn guidance</ExternalLink>
      {finding.status === 'reviewed' || canReviewFinding(finding) ? <Button onClick={() => { session.toggleReview(file.fileId, finding.check); }}>
        {finding.status === 'reviewed' ? 'Undo review' : 'Mark as reviewed'}
      </Button> : null}
    </Tile>
  </div>;
}
```

Patch `src/features/inspector/InspectorPage.tsx` (replace its ten-line placeholder):

```diff
-import type { ReactNode } from 'react';
-
-// Placeholder. Phase 23 builds the real page.
-export function InspectorPage(): ReactNode {
-  return (
-    <section aria-label="Logic Inspector">
-      <p>Logic Inspector page placeholder</p>
-    </section>
-  );
-}
+import type { ReactNode } from 'react';
+import { useInspector } from '@/app/inspector-site/useInspector';
+import { useActiveConnection, useConnectionStatus } from '@/app/useActiveConnection';
+import { Button } from '@/components/Button';
+import { Tile } from '@/components/Tile';
+import { InspectorContent } from './InspectorContent';
+import './inspector.css';
+
+export function InspectorPage(): ReactNode {
+  const { session, state, result } = useInspector();
+  const connection = useActiveConnection();
+  const status = useConnectionStatus();
+  const actions = state.site === null ? null : <Button busy={state.phase === 'scanning'} onClick={() => { void session.rescan(); }}>Rescan</Button>;
+  let message: ReactNode = null;
+  if (!status.confirmed) {
+    message = status.error === 'initial' ? <><p>Couldn't confirm the ToolBox connection.</p><Button busy={status.pending} onClick={status.refresh}>Retry connection</Button></> : <p>Checking the ToolBox connection…</p>;
+  } else if (connection === null) message = <p>Select a connection in ToolBox to inspect a site.</p>;
+  else if (state.sitesStatus === 'loading' || state.sitesStatus === 'idle') message = <p>Loading sites…</p>;
+  else if (state.sitesStatus === 'error') message = <><h2>Couldn't load sites</h2><p>{state.siteError}</p><Button onClick={() => { void session.reloadSites(); }}>Retry loading sites</Button></>;
+  else if (state.sites.length === 0) message = <p>No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.</p>;
+  else if (state.site === null) message = <p>Choose a site in the title bar to start a scan.</p>;
+  else if (state.phase === 'scanning') message = <p>Reading configuration and handler code…</p>;
+  else if (state.phase === 'awaiting-confirmation' || state.phase === 'confirming') message = <><h2>Confirm the scan connection</h2><p>Couldn't confirm the active connection. The obtained evidence is retained but isn't accepted for review or export.</p><p>Read {state.facts?.files.length ?? 0} server logic files.</p>{state.scanError === null ? null : <p>{state.scanError}</p>}<Button busy={state.phase === 'confirming'} onClick={() => { void session.retryConfirmation(); }}>Retry confirmation</Button></>;
+  else if (state.phase === 'error') message = <><h2>Couldn't scan this site</h2><p>{state.scanError}</p></>;
+  else if (result === null) message = <p>Scan cancelled. Confirm the ToolBox connection and rescan.</p>;
+  else if (result.files.length === 0) message = <p>No server logic found on this site</p>;
+
+  return <section aria-label="Logic Inspector" className="inspector-page">
+    {connection !== null && connection.environment !== 'Dev' ? <p className="inspector-banner">This isn't a development environment. Inspector is designed for dev sites.</p> : null}
+    {status.error === 'refresh' ? <div className="inspector-banner"><p>Couldn't refresh the connection. Showing the last confirmed connection.</p><Button busy={status.pending} onClick={status.refresh}>Retry connection</Button></div> : null}
+    {result !== null && result.banners.length > 0 ? <aside aria-label="Site notices">{result.banners.map((banner) => <p className="inspector-banner" key={banner}>{banner}</p>)}</aside> : null}
+    <p role="status" aria-live="polite" aria-atomic="true" className="inspector-status">{state.phase === 'scanning' ? `Scanned ${String(state.progress.scanned)} of ${String(state.progress.total)}` : state.announcement}</p>
+    {message === null ? <InspectorContent actions={actions} /> : <Tile heading="Logic Inspector" className="inspector-message">{message}<div className="inspector-actions">{actions}</div></Tile>}
+  </section>;
+}
```

Create `src/features/inspector/inspector.css`:

```css
.inspector-page { box-sizing: border-box; padding: 12px 16px 16px; min-height: calc(100vh - 42px); display: flex; flex-direction: column; gap: 12px; color: var(--text); }
.inspector-page p { margin: 0; }
.inspector-page .ui-tile { border-radius: 12px; background: var(--tile); backdrop-filter: none; box-shadow: none; }
.inspector-banner { padding: 10px 14px; border: 1px solid var(--review); border-radius: 8px; background: var(--review-tint); color: var(--text); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.inspector-page aside { display: grid; gap: 8px; }
.inspector-status { color: var(--muted); font-size: 12px; min-height: 16px; }
.inspector-grid { flex: 1; display: grid; grid-template-columns: 230px repeat(3, minmax(0, 1fr)); grid-template-rows: auto minmax(210px, 1fr) minmax(260px, 1fr); gap: 14px; min-height: 600px; }
.inspector-files { grid-column: 1; grid-row: 1 / 4; padding: 18px; }
.inspector-file-list { list-style: none; margin: 0; padding: 3px; display: flex; flex-direction: column; gap: 8px; overflow: auto; }
.inspector-file { width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; box-sizing: border-box; padding: 10px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--tile); color: var(--text); font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.inspector-file[aria-pressed='true'] { border-color: var(--primary); background: var(--ok-tint); }
.inspector-file__name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.inspector-tenant { margin-top: auto !important; padding-top: 18px; color: var(--muted); font-size: 11.5px; line-height: 1.5; }
.inspector-title { grid-column: 2 / 5; grid-row: 1; padding: 18px; flex-direction: row; align-items: center; gap: 18px; overflow: visible; }
.inspector-title__copy { flex: 1; min-width: 0; }
.inspector-title h1 { margin: 8px 0; font-size: 30px; line-height: 1.08; letter-spacing: -0.03em; font-weight: 700; }
.inspector-title p { font-size: 12px; color: var(--muted); line-height: 1.5; overflow-wrap: anywhere; }
.inspector-file-heading { color: var(--text) !important; }
.inspector-context { margin-top: 8px !important; }
.inspector-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.inspector-title .inspector-actions { max-width: 175px; flex: none; }
.inspector-readiness { grid-column: 2; grid-row: 2 / 4; padding: 18px; align-items: center; justify-content: center; gap: 18px; }
.inspector-readiness p { color: var(--muted); text-align: center; font-size: 12px; line-height: 1.5; }
.inspector-finding { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; min-width: 0; box-sizing: border-box; padding: 18px; border: 1px solid var(--control-border); border-radius: 12px; background: var(--tile); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.inspector-finding[aria-pressed='true'] { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.inspector-finding--webRole { grid-column: 3; grid-row: 2; }
.inspector-finding--tablePermissions { grid-column: 4; grid-row: 2; }
.inspector-finding--outbound { grid-column: 3; grid-row: 3; }
.inspector-finding__title { font-size: 15px; font-weight: 700; }
.inspector-finding__summary { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); font-size: 12px; line-height: 1.5; }
.inspector-finding .ui-pill { margin-top: auto; white-space: normal; }
.inspector-detail { grid-column: 4; grid-row: 3; padding: 18px; max-height: 400px; overflow: auto; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.inspector-detail .ui-pill { align-self: flex-start; }
.inspector-detail h3 { margin: 8px 0 0; font-size: 13px; font-weight: 700; }
.inspector-detail h4 { margin: 4px 0; font-size: 12px; }
.inspector-detail ul { margin: 0; padding-left: 18px; }
.inspector-detail li { white-space: pre-wrap; }
.inspector-category { color: var(--muted); }
.inspector-message { min-height: 160px; gap: 16px; overflow: visible; }
.inspector-message h2 { margin: 0; font-size: 20px; }
```

Patch `src/app/shell/SitePill.tsx`:

```diff
-import type { ReactElement } from 'react';
-import { Pill } from '@/components/Pill';
-
-// Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).
-export function SitePill(): ReactElement {
-  return (
-    <Pill compact aria-disabled="true" className="shell__site">
-      No site selected
-    </Pill>
-  );
-}
+import { SitePicker } from '@/app/inspector-site/SitePicker';
+import { useInspector } from '@/app/inspector-site/useInspector';
+import { useActiveConnection, useConnectionStatus } from '@/app/useActiveConnection';
+
+export function SitePill() {
+  const { state, session } = useInspector();
+  const connection = useActiveConnection();
+  const status = useConnectionStatus();
+  const reason = !status.confirmed ? 'Confirm the ToolBox connection in Logic Inspector'
+    : connection === null ? 'Select a connection in ToolBox'
+    : state.sitesStatus === 'loading' || state.sitesStatus === 'idle' ? 'Loading sites'
+    : state.sitesStatus === 'error' ? 'Retry loading sites in Logic Inspector'
+    : state.sites.length === 0 ? 'No enhanced data model sites available' : null;
+  return <SitePicker key={`${connection?.id ?? ''}:${connection?.url ?? ''}:${state.sitesStatus}:${reason ?? ''}`}
+    sites={state.sites} value={state.site} reason={reason} onSelect={(site) => { void session.selectSite(site.id); }} />;
+}
```

Patch `src/app/App.tsx`:

```diff
 import { ConnectionProvider } from '@/app/ConnectionProvider';
+import { InspectorProvider } from '@/app/inspector-site/InspectorProvider';
+import { INSPECTOR_DEPS } from '@/app/inspector-site/inspectorDeps';
+import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
@@
-export type AppProps = { host: PptbHost; starterDeps?: StarterDeps };
+export type AppProps = { host: PptbHost; starterDeps?: StarterDeps; inspectorDeps?: InspectorDeps };
@@
-export function App({ host, starterDeps = STARTER_DEPS }: AppProps): ReactElement {
+function InspectorBoundary({ children, deps }: { children: ReactNode; deps: InspectorDeps | undefined }): ReactNode {
+  return __PAGE_INSPECTOR__ ? <InspectorProvider deps={deps ?? INSPECTOR_DEPS}>{children}</InspectorProvider> : children;
+}
+
+export function App({ host, starterDeps = STARTER_DEPS, inspectorDeps }: AppProps): ReactElement {
@@
           <ViewContext value={[view, setView]}>
+            <InspectorBoundary deps={inspectorDeps}>
             <div className="shell">
@@
             </div>
+            </InspectorBoundary>
           </ViewContext>
```

Patch `src/app/shell/TitleBar.tsx`:

```diff
-import { useActiveConnection } from '@/app/useActiveConnection';
+import { useActiveConnection, useConnectionStatus } from '@/app/useActiveConnection';
@@
   const connection = useActiveConnection();
+  const status = useConnectionStatus();
+  const label = status.confirmed ? connectionLabel(connection) : status.error === 'initial' ? 'Connection unavailable' : 'Checking connection…';
@@
-        <span>{connectionLabel(connection)}</span>
+        <span className="shell__connection" title={label}>{label}</span>
```

Patch `src/app/shell/shell.css`:

```diff
 .shell__context {
+  min-width: 0;
   margin-left: auto;
@@
 .shell__content {
@@
   background: var(--surface);
 }
+
+.shell__connection {
+  min-width: 0;
+  max-width: 160px;
+  overflow: hidden;
+  text-overflow: ellipsis;
+}
```

Patch `src/app/App.test.tsx`:

```diff
-    expect(screen.getByText('No site selected').getAttribute('aria-disabled')).toBe('true');
+    expect(screen.getByRole('combobox', { name: 'Power Pages site: No site selected' })).toHaveAttribute('aria-disabled', 'true');
```

Apply this exact `tests/buildShape.test.ts` marker patch in Task 6d. Task 9's later release-completeness patch starts from the new marker:

```diff
-    expect(code).toContain('Logic Inspector page placeholder');
+    expect(code).toContain('Review server logic readiness');
@@
-      expect(code).not.toContain('Logic Inspector page placeholder');
+      expect(code).not.toContain('Review server logic readiness');
@@
-    'ships Starter and Server Objects but not the Inspector placeholder in --mode beta',
+    'ships Starter and Server Objects but not Inspector in --mode beta',
@@
-      expect(code).not.toContain('Logic Inspector page placeholder');
+      expect(code).not.toContain('Review server logic readiness');
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/InspectorPage.test.tsx src/app/Inspector.integration.test.tsx`

Expected: exit 0; page state/review tests and all App integration cases pass, including pending confirmation recovery while another tab is visible.

Run: `npx vitest run src/app/App.test.tsx src/app/ConnectionProvider.test.tsx src/app/inspector-site src/features/inspector/model tests/buildShape.test.ts`

Expected: exit 0; legacy App behavior, keyboard/session/rule checks and all-page / Inspector-excluded build-shape assertions pass.

Run: `npx eslint src/app/inspector-site src/app/ConnectionProvider.tsx src/app/useActiveConnection.ts src/app/Inspector.integration.test.tsx src/features/inspector/InspectorPage.tsx src/features/inspector/InspectorContent.tsx src/features/inspector/inspectorTestHarness.tsx src/features/inspector/InspectorPage.test.tsx src/app/shell/SitePill.tsx --max-warnings=0`

Expected: exit 0 for this slice's files; the integration owner runs the final whole-repository gates.

Rendered check: run `npm run dev`, open the tool in the Desktop Debug loader, connect to an enhanced-model development environment, and choose a site. At 1024×700 and 1100×780, in host light/dark and 200% zoom, verify the 230px rail, spanning title, large ring, three check controls and scrollable detail; long names expose full title/accessibility text. Keyboard through picker → files → checks → detail review → Rescan; confirm visible focus, inactive explanations, polite progress and no clipped unreachable content. Capture viewport/theme and observed results for RG-005. Actual host access and timings remain Task 10's live evidence gates.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/features/inspector/inspectorTestHarness.tsx src/features/inspector/InspectorPage.test.tsx src/app/Inspector.integration.test.tsx src/features/inspector/InspectorContent.tsx src/features/inspector/inspector.css src/features/inspector/InspectorPage.tsx src/app/App.tsx src/app/App.test.tsx src/app/shell/SitePill.tsx src/app/shell/TitleBar.tsx src/app/shell/shell.css tests/buildShape.test.ts
git commit --only -m "feat(inspector): complete site scan and review interface" -- src/features/inspector/inspectorTestHarness.tsx src/features/inspector/InspectorPage.test.tsx src/app/Inspector.integration.test.tsx src/features/inspector/InspectorContent.tsx src/features/inspector/inspector.css src/features/inspector/InspectorPage.tsx src/app/App.tsx src/app/App.test.tsx src/app/shell/SitePill.tsx src/app/shell/TitleBar.tsx src/app/shell/shell.css tests/buildShape.test.ts
```

### Task 8a: Capture an immutable report and own the complete native-save lifecycle

**Owns:** AC-9.8–9.9, export defaults, duplicate-submit exclusion, validity epoch and all build/save outcomes. Depends on Task 7's synchronous real PDF renderer.

**Files:**

- Create: `src/features/inspector/exportDeps.ts` — exact existing report contracts and a task-queue yield.
- Create: `src/features/inspector/exportController.ts` — one capture, options and idle/building/saving lifecycle.
- Create: `src/features/inspector/useExportReport.ts` — session-epoch subscription bridge.
- Create: `src/features/inspector/exportController.test.ts` — 32 output-option combinations and lifecycle failures/races.
- Signal: `src/features/inspector/exportController.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/exportController.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExportController } from './exportController';
import { EXPORT_DEPS } from './exportDeps';
import type { ExportDeps } from './exportDeps';
import { EXPORTED_AT, reportResult } from './report/reportFixtures';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Notice, SaveResult } from '@/services/pptb/host.types';
import type { ReportFormat, ReportScope } from '@/types/report';
import { deferred } from '@/test/deferred';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function setup(patch: Partial<ExportDeps> = {}) {
  let epoch = 1;
  const host = createFakeHost();
  const save = vi.spyOn(host, 'saveFile');
  const notify = vi.fn<(notice: Notice) => void>();
  const deps: ExportDeps = {
    ...EXPORT_DEPS,
    buildReportModel: vi.fn(EXPORT_DEPS.buildReportModel),
    renderMarkdown: vi.fn(EXPORT_DEPS.renderMarkdown),
    renderPdf: vi.fn(EXPORT_DEPS.renderPdf),
    reportFileNameBeforeBuild: vi.fn(EXPORT_DEPS.reportFileNameBeforeBuild),
    now: () => EXPORTED_AT,
    ...patch,
  };
  const controller = createExportController(host, notify, deps, (captured) => captured === epoch);
  return { host, save, notify, deps, controller,
    invalidate: () => { epoch += 1; controller.invalidate(); },
    job: () => { const job = controller.getSnapshot(); if (job === null) throw new Error('No export capture'); return job; },
  };
}
const combinations = (['file', 'site'] as const).flatMap((scope) => (['markdown', 'pdf'] as const).flatMap((format) =>
  [false, true].flatMap((questions) => [false, true].flatMap((snapshot) => [false, true].map((redact) => ({ scope, format, questions, snapshot, redact }))))));

describe('captured export options', () => {
  it.each(combinations)('saves $scope $format questions=$questions snapshot=$snapshot redact=$redact', async (options) => {
    const ui = setup();
    const result = reportResult();
    ui.controller.open(result, 'customer', 1);
    ui.controller.setOptions(options);
    const capture = ui.job().result;
    const expectedOptions = { ...options, fileId: 'customer' };
    const expected = EXPORT_DEPS.buildReportModel(capture, expectedOptions, EXPORTED_AT);
    await ui.controller.submit();
    expect(ui.deps.buildReportModel).toHaveBeenCalledWith(capture, expectedOptions, EXPORTED_AT);
    const content: unknown = options.format === 'markdown'
      ? EXPORT_DEPS.renderMarkdown(expected)
      : vi.mocked(ui.deps.renderPdf).mock.results[0]?.value;
    expect(ui.save).toHaveBeenCalledWith(EXPORT_DEPS.reportFileName(expected), content, [{ name: options.format === 'markdown' ? 'Markdown' : 'PDF', extensions: [options.format === 'markdown' ? 'md' : 'pdf'] }]);
    if (options.format === 'pdf') {
      expect(content).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode((content as Uint8Array).slice(0, 5))).toBe('%PDF-');
    }
    expect(ui.notify).toHaveBeenCalledWith({ title: `${EXPORT_DEPS.reportFileName(expected)} exported`, body: '', type: 'success' });
    expect(ui.controller.getSnapshot()).toBeNull();
  });

  it.each([{ selected: 'customer', scope: 'file' }, { selected: null, scope: 'site' }, { selected: 'missing', scope: 'site' }] satisfies { selected: string | null; scope: ReportScope }[])('defaults to $scope with selection $selected', ({ selected, scope }) => {
    const ui = setup();
    ui.controller.open(reportResult(), selected, 1);
    expect(ui.job().options).toMatchObject({ scope, format: 'markdown', questions: true, snapshot: true, redact: false });
    if (scope === 'site') {
      ui.controller.setOptions({ scope: 'file' });
      expect(ui.job().options.scope).toBe('site');
    }
  });

  it('captures selected ID and deeply freezes the original review/context', async () => {
    const ui = setup();
    const result = reportResult();
    ui.controller.open(result, 'customer', 1);
    const first = result.files[0];
    if (first === undefined) throw new Error('fixture missing');
    first.findings[1].status = 'reviewed';
    result.facts.connection.name = 'Later rename';
    result.facts.site.name = 'Later site label';
    ui.controller.invalidate();
    expect(ui.job().selectedFileId).toBe('customer');
    expect(ui.job().result.files[0]?.findings[1].status).toBe('needs-review');
    expect(ui.job().result.facts.connection.name).toBe('Contoso');
    expect(Object.isFrozen(ui.job().result.files[0]?.findings[1])).toBe(true);
    expect(ui.notify).not.toHaveBeenCalled();
    await ui.controller.submit();
    expect(ui.save).toHaveBeenCalledOnce();
    const body = ui.host.savedFiles[0]?.content;
    expect(body).not.toContain('Later rename');
  });

  it('refuses an empty or invalidated capture', () => {
    const ui = setup();
    ui.controller.open({ ...reportResult(), files: [] }, null, 1);
    expect(ui.controller.getSnapshot()).toBeNull();
    ui.invalidate();
    ui.controller.open(reportResult(), 'customer', 1);
    expect(ui.controller.getSnapshot()).toBeNull();
  });
});

describe('native-save lifecycle', () => {
  it('cancels once before the build microtask and saves nothing', async () => {
    const ui = setup();
    ui.controller.open(reportResult(), 'customer', 1);
    const pending = ui.controller.submit();
    expect(ui.job().phase).toBe('building');
    ui.invalidate();
    ui.controller.invalidate();
    await pending;
    expect(ui.deps.buildReportModel).not.toHaveBeenCalled();
    expect(ui.save).not.toHaveBeenCalled();
    expect(ui.notify).toHaveBeenCalledExactlyOnceWith({ title: 'Results changed, so the export was cancelled.', body: '', type: 'info' });
    expect(ui.controller.getSnapshot()).toBeNull();
  });

  it('lets a queued connection task invalidate after synchronous rendering and before save', async () => {
    vi.useFakeTimers();
    const ui = setup();
    vi.mocked(ui.deps.renderMarkdown).mockImplementation((model) => {
      // Represents a host callback queued while a synchronous renderer occupied the JS thread.
      setTimeout(ui.invalidate, 0);
      return EXPORT_DEPS.renderMarkdown(model);
    });
    ui.controller.open(reportResult(), 'customer', 1);
    const pending = ui.controller.submit();
    await Promise.resolve();
    expect(ui.deps.renderMarkdown).toHaveBeenCalledOnce();
    expect(ui.save).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    await pending;
    expect(ui.save).not.toHaveBeenCalled();
    expect(ui.notify).toHaveBeenCalledExactlyOnceWith({ title: 'Results changed, so the export was cancelled.', body: '', type: 'info' });
  });

  it('rechecks validity after the yield even without a proactive invalidation notification', async () => {
    const yieldGate = deferred<undefined>();
    let valid = true;
    const host = createFakeHost();
    const save = vi.spyOn(host, 'saveFile');
    const notify = vi.fn();
    const controller = createExportController(host, notify, { ...EXPORT_DEPS, yieldToHost: () => yieldGate.promise }, () => valid);
    controller.open(reportResult(), 'customer', 1);
    const pending = controller.submit();
    await Promise.resolve();
    valid = false;
    yieldGate.resolve(undefined);
    await pending;
    expect(save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledOnce();
  });

  it('prevents duplicate submissions and option/close changes while building or saving', async () => {
    const yieldGate = deferred<undefined>();
    const saveGate = deferred<SaveResult>();
    const ui = setup({ yieldToHost: () => yieldGate.promise });
    ui.save.mockReturnValue(saveGate.promise);
    ui.controller.open(reportResult(), 'customer', 1);
    const first = ui.controller.submit();
    const second = ui.controller.submit();
    ui.controller.setOptions({ format: 'pdf' });
    ui.controller.close();
    expect(ui.job().options.format).toBe('markdown');
    yieldGate.resolve(undefined);
    await vi.waitFor(() => { expect(ui.save).toHaveBeenCalledOnce(); });
    expect(ui.job().phase).toBe('saving');
    ui.controller.close();
    expect(ui.job().phase).toBe('saving');
    saveGate.resolve({ status: 'saved', path: 'C:\\report.md' });
    await Promise.all([first, second]);
    expect(ui.save).toHaveBeenCalledOnce();
  });

  it.each(['saved', 'cancelled', 'rejected'] as const)('preserves submitted content through invalidation during native save: %s', async (outcome) => {
    const saveGate = deferred<SaveResult>();
    const ui = setup();
    ui.save.mockReturnValue(saveGate.promise);
    ui.controller.open(reportResult(), 'customer', 1);
    const pending = ui.controller.submit();
    await vi.waitFor(() => { expect(ui.save).toHaveBeenCalledOnce(); });
    const submitted = ui.save.mock.calls[0]?.[1];
    ui.invalidate();
    expect(ui.job().phase).toBe('saving');
    expect(ui.notify).not.toHaveBeenCalled();
    if (outcome === 'rejected') saveGate.reject(new Error('Disk full'));
    else saveGate.resolve(outcome === 'saved' ? { status: 'saved', path: 'C:\\report.md' } : { status: 'cancelled' });
    await pending;
    expect(ui.save.mock.calls[0]?.[1]).toBe(submitted);
    expect(ui.controller.getSnapshot()).toBeNull();
    expect(ui.notify.mock.calls.some(([notice]) => notice.type === 'info')).toBe(false);
    if (outcome === 'cancelled') expect(ui.notify).not.toHaveBeenCalled();
    else expect(ui.notify).toHaveBeenCalledOnce();
  });

  it.each(['build', 'markdown', 'pdf', 'filename', 'save'] as const)('reports %s failure once, resets busy and permits a valid retry', async (failure) => {
    const ui = setup();
    const format: ReportFormat = failure === 'pdf' ? 'pdf' : 'markdown';
    const fail = (): never => { throw new Error('Fixture failure'); };
    if (failure === 'build') vi.mocked(ui.deps.buildReportModel).mockImplementationOnce(fail);
    if (failure === 'markdown') vi.mocked(ui.deps.renderMarkdown).mockImplementationOnce(fail);
    if (failure === 'pdf') vi.mocked(ui.deps.renderPdf).mockImplementationOnce(fail);
    if (failure === 'filename') vi.spyOn(ui.deps, 'reportFileName').mockImplementationOnce(fail);
    if (failure === 'save') ui.save.mockRejectedValueOnce(new Error('Fixture failure'));
    ui.controller.open(reportResult(), 'customer', 1);
    ui.controller.setOptions({ format });
    await ui.controller.submit();
    expect(ui.job().phase).toBe('idle');
    expect(ui.notify).toHaveBeenCalledExactlyOnceWith({ title: `Couldn't save customer-summary-readiness.${format === 'pdf' ? 'pdf' : 'md'}`, body: 'Fixture failure', type: 'error' });
    expect(ui.deps.reportFileNameBeforeBuild).toHaveBeenCalled();
    ui.controller.setOptions({ format: 'markdown' });
    await ui.controller.submit();
    expect(ui.controller.getSnapshot()).toBeNull();
    expect(ui.notify.mock.calls.at(-1)?.[0].type).toBe('success');
  });

  it('invalidates correctly after a native save rejected while the generation was valid', async () => {
    const ui = setup();
    ui.save.mockRejectedValueOnce(new Error('Disk full'));
    ui.controller.open(reportResult(), 'customer', 1);
    await ui.controller.submit();
    expect(ui.job().phase).toBe('idle');
    ui.invalidate();
    ui.controller.invalidate();
    expect(ui.controller.getSnapshot()).toBeNull();
    expect(ui.notify.mock.calls.map(([notice]) => notice.type)).toEqual(['error', 'info']);
    await ui.controller.submit();
    expect(ui.save).toHaveBeenCalledOnce();
  });

  it('closes silently on an idle Cancel or a native cancellation', async () => {
    const ui = setup();
    ui.controller.open(reportResult(), 'customer', 1);
    ui.controller.close();
    expect(ui.controller.getSnapshot()).toBeNull();
    ui.host.setSave('cancel');
    ui.controller.open(reportResult(), 'customer', 1);
    await ui.controller.submit();
    expect(ui.controller.getSnapshot()).toBeNull();
    expect(ui.notify).not.toHaveBeenCalled();
    expect(ui.host.savedFiles).toHaveLength(0);
  });

  it('ignores a save completion after disposal without a failure timeout', async () => {
    const saveGate = deferred<SaveResult>();
    const ui = setup();
    ui.save.mockReturnValue(saveGate.promise);
    ui.controller.open(reportResult(), 'customer', 1);
    const pending = ui.controller.submit();
    await vi.waitFor(() => { expect(ui.save).toHaveBeenCalledOnce(); });
    ui.controller.dispose();
    saveGate.resolve({ status: 'saved', path: 'C:\\report.md' });
    await pending;
    expect(ui.notify).not.toHaveBeenCalled();
    expect(ui.controller.getSnapshot()).toBeNull();
  });

  it('never fabricates a save failure while a native save remains unresolved', async () => {
    vi.useFakeTimers();
    const gate = deferred<SaveResult>();
    const ui = setup();
    ui.save.mockReturnValue(gate.promise);
    ui.controller.open(reportResult(), 'customer', 1);
    const pending = ui.controller.submit();
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(ui.job().phase).toBe('saving');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ui.job().phase).toBe('saving');
    expect(ui.notify).not.toHaveBeenCalled();
    expect(ui.save).toHaveBeenCalledOnce();
    gate.resolve({ status: 'saved', path: 'C:\\report.md' });
    await pending;
    expect(ui.notify.mock.calls.at(-1)?.[0].type).toBe('success');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/exportController.test.ts`

Expected: exit 1; `exportController` and `exportDeps` cannot be resolved.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/inspector/exportDeps.ts`:

```typescript
import { buildReportModel } from './report/buildReportModel';
import { renderMarkdown } from './report/renderMarkdown';
import { renderPdf } from './report/renderPdf';
import { reportFileName, reportFileNameBeforeBuild } from './report/reportFileName';

export type ExportDeps = {
  buildReportModel: typeof buildReportModel;
  renderMarkdown: typeof renderMarkdown;
  renderPdf: typeof renderPdf;
  reportFileName: typeof reportFileName;
  reportFileNameBeforeBuild: typeof reportFileNameBeforeBuild;
  now: () => Date;
  yieldToHost: () => Promise<void>;
};

export const EXPORT_DEPS: ExportDeps = {
  buildReportModel, renderMarkdown, renderPdf, reportFileName, reportFileNameBeforeBuild,
  now: () => new Date(),
  // A task-queue yield lets queued host events run after synchronous PDF work. It is not a save timeout.
  yieldToHost: () => new Promise<void>((resolve) => { setTimeout(resolve, 0); }),
};
```

Create `src/features/inspector/exportController.ts`:

```typescript
import type { ExportDeps } from './exportDeps';
import type { Notice, PptbHost } from '@/services/pptb/host.types';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

export type ExportJob = {
  id: number;
  epoch: number;
  result: SiteResult;
  selectedFileId: string | null;
  options: ReportOptions;
  phase: 'idle' | 'building' | 'saving';
};

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

export function createExportController(host: PptbHost, notify: (notice: Notice) => void, deps: ExportDeps, valid: (epoch: number) => boolean) {
  let state: ExportJob | null = null;
  let nextId = 0;
  let alive = true;
  const listeners = new Set<() => void>();
  const publish = (next: ExportJob | null): void => {
    state = next === null ? null : Object.freeze(next);
    if (alive) for (const listener of listeners) listener();
  };
  const current = (job: ExportJob): boolean => alive && state?.id === job.id;
  const cancelChanged = (job: ExportJob): void => {
    if (!current(job)) return;
    publish(null);
    notify({ title: 'Results changed, so the export was cancelled.', body: '', type: 'info' });
  };
  const beforeSave = (job: ExportJob): boolean => {
    if (!current(job)) return false;
    if (!valid(job.epoch)) { cancelChanged(job); return false; }
    return true;
  };

  return {
    getSnapshot: (): ExportJob | null => state,
    subscribe: (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate: (): void => { alive = true; },
    dispose: (): void => { alive = false; state = null; },
    open: (result: SiteResult, selectedFileId: string | null, epoch: number): void => {
      if (!alive || state !== null || !valid(epoch) || result.files.length === 0) return;
      const selected = result.files.some((file) => file.fileId === selectedFileId) ? selectedFileId : null;
      publish({
        id: ++nextId, epoch, result: freeze(structuredClone(result)), selectedFileId: selected, phase: 'idle',
        options: Object.freeze({ scope: selected === null ? 'site' : 'file', format: 'markdown', fileId: selected, questions: true, snapshot: true, redact: false }),
      });
    },
    close: (): void => { if (state?.phase === 'idle') publish(null); },
    invalidate: (): void => { if (state !== null && state.phase !== 'saving' && !valid(state.epoch)) cancelChanged(state); },
    setOptions: (patch: Partial<Omit<ReportOptions, 'fileId'>>): void => {
      if (state?.phase !== 'idle' || (patch.scope === 'file' && state.selectedFileId === null)) return;
      publish({ ...state, options: Object.freeze({ ...state.options, ...patch }) });
    },
    submit: async (): Promise<void> => {
      const job = state;
      if (job?.phase !== 'idle' || !beforeSave(job)) return;
      publish({ ...job, phase: 'building' });
      let name = job.options.format === 'pdf' ? 'readiness.pdf' : 'readiness.md';
      let handedOff = false;
      try {
        await Promise.resolve();
        if (!beforeSave(job)) return;
        name = deps.reportFileNameBeforeBuild(job.result, job.options);
        const model = deps.buildReportModel(job.result, job.options, deps.now());
        name = deps.reportFileName(model);
        const content = job.options.format === 'markdown' ? deps.renderMarkdown(model) : deps.renderPdf(model);
        await deps.yieldToHost();
        if (!beforeSave(job)) return;
        publish({ ...job, phase: 'saving' });
        handedOff = true;
        const saved = await host.saveFile(name, content, [{ name: job.options.format === 'markdown' ? 'Markdown' : 'PDF', extensions: [job.options.format === 'markdown' ? 'md' : 'pdf'] }]);
        if (!current(job)) return;
        publish(null);
        if (saved.status === 'saved') notify({ title: `${name} exported`, body: '', type: 'success' });
      } catch (error: unknown) {
        if (!current(job)) return;
        if (!handedOff && !valid(job.epoch)) { cancelChanged(job); return; }
        publish(valid(job.epoch) ? { ...job, phase: 'idle' } : null);
        notify({ title: `Couldn't save ${name}`, body: error instanceof Error ? error.message : 'Unknown error', type: 'error' });
      }
    },
  };
}

export type ExportController = ReturnType<typeof createExportController>;
```

Create `src/features/inspector/useExportReport.ts`:

```typescript
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';
import { useInspector } from '@/app/inspector-site/useInspector';
import { createExportController } from './exportController';
import { EXPORT_DEPS } from './exportDeps';
import type { ExportDeps } from './exportDeps';

export function useExportReport(deps: ExportDeps = EXPORT_DEPS) {
  const host = useHost();
  const notify = useNotify();
  const { session, state } = useInspector();
  const controller = useMemo(() => createExportController(host, notify, deps, (epoch) => {
    const current = session.getSnapshot();
    return current.epoch === epoch && current.phase === 'complete' && current.facts !== null;
  }), [host, notify, deps, session]);
  const job = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useLayoutEffect(() => { controller.activate(); return controller.dispose; }, [controller]);
  useLayoutEffect(() => { controller.invalidate(); }, [controller, state.epoch, state.phase]);
  return { controller, job };
}
```

`renderPdf` remains synchronous. The first resolved microtask permits immediate UI invalidation before building. The later **task-queue yield** is the required queued-host-event boundary after a long synchronous build. No timeout races or cancels `host.saveFile`; after handoff, its submitted bytes/string are the saved content even if the epoch changes.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/exportController.test.ts`

Expected: exit 0; all 32 scope/format/include/redact cases use the real report pipeline, queued-task invalidation submits nothing, every native outcome settles state, and rejection permits retry only for a valid generation.

Run: `npx vitest run src/features/inspector/report src/app/inspector-site/inspectorSession.test.ts src/services/pptb/pptbHost.test.ts`

Expected: exit 0; Task 7 report/PDF contracts, session invalidation and existing host save behavior remain passing.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/features/inspector/exportDeps.ts src/features/inspector/exportController.ts src/features/inspector/useExportReport.ts src/features/inspector/exportController.test.ts
git commit --only -m "feat(inspector): add immutable report export lifecycle" -- src/features/inspector/exportDeps.ts src/features/inspector/exportController.ts src/features/inspector/useExportReport.ts src/features/inspector/exportController.test.ts
```

### Task 8b: Add the working export dialog and page action

**Owns:** AC-9.1–9.7 controls and page eligibility; rendered APG dialog behavior; controller wiring to session invalidation. `Modal` keeps ownership of focus, Escape and focus return, adding one optional busy-dismiss reason.

**Files:**

- Create: `src/components/Modal.busy.test.tsx` — busy-dismiss contract without losing the focus trap.
- Modify: `src/components/Modal.tsx` — optional disabled-dismiss reason.
- Create: `src/features/inspector/ExportDialog.tsx` — captured scope/format/include controls.
- Create: `src/features/inspector/export.css` — token-based modal content layout.
- Create: `src/features/inspector/ExportDialog.test.tsx` — control wiring, keyboard/focus and native outcomes.
- Create: `src/features/inspector/exportLifecycle.test.tsx` — real session-to-dialog eligibility and invalidation.
- Modify: `src/features/inspector/InspectorPage.tsx` — working action and dialog import in one change.
- Signal: the three new test files above.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/components/Modal.busy.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

afterEach(cleanup);
it('explains blocked dismissal, traps focus, and resumes Escape dismissal when idle', async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  const view = render(<Modal open title="Busy operation" onClose={close} closeDisabledReason="Wait for the export to finish."><button>Inside</button></Modal>);
  expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
  await user.tab({ shift: true });
  const dismiss = screen.getByRole('button', { name: 'Close' });
  expect(dismiss).toHaveFocus();
  expect(dismiss).toHaveAttribute('aria-disabled', 'true');
  expect(dismiss).toHaveAccessibleDescription('Wait for the export to finish.');
  await user.keyboard('{Enter}{Escape}');
  expect(close).not.toHaveBeenCalled();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
  view.rerender(<Modal open title="Busy operation" onClose={close}><button>Inside</button></Modal>);
  await user.keyboard('{Escape}');
  expect(close).toHaveBeenCalledOnce();
});
```

Create `src/features/inspector/ExportDialog.test.tsx`:

```tsx
import { useSyncExternalStore } from 'react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportDialog } from './ExportDialog';
import { createExportController } from './exportController';
import type { ExportController } from './exportController';
import { EXPORT_DEPS } from './exportDeps';
import { reportResult } from './report/reportFixtures';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { SaveResult } from '@/services/pptb/host.types';
import { deferred } from '@/test/deferred';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Harness({ controller, selected }: { controller: ExportController; selected: string | null }) {
  const job = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return <><button onClick={() => { controller.open(reportResult(), selected, 1); }}>Open export</button>
    {job === null ? null : <ExportDialog controller={controller} job={job} />}</>;
}
function setup(selected: string | null = 'customer') {
  const host = createFakeHost();
  const notify = vi.fn();
  const deps = { ...EXPORT_DEPS, buildReportModel: vi.fn(EXPORT_DEPS.buildReportModel), renderPdf: vi.fn(EXPORT_DEPS.renderPdf) };
  const controller = createExportController(host, notify, deps, () => true);
  render(<Harness controller={controller} selected={selected} />);
  return { host, notify, deps, controller, user: userEvent.setup() };
}

describe('Export dialog', () => {
  it('uses captured defaults and 520px Modal, traps focus, and restores the opener on Escape', async () => {
    const ui = setup();
    const opener = screen.getByRole('button', { name: 'Open export' });
    await ui.user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Export report' });
    expect(dialog).toHaveStyle({ width: '520px' });
    expect(within(dialog).getByRole('radio', { name: 'This file' })).toHaveFocus();
    expect(within(dialog).getByRole('radio', { name: 'This file' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByRole('radio', { name: 'Markdown' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByLabelText('Questions to consider')).toBeChecked();
    expect(within(dialog).getByLabelText('Configuration snapshot')).toBeChecked();
    expect(within(dialog).getByLabelText('Redact environment and site names')).not.toBeChecked();
    within(dialog).getByRole('button', { name: 'Export Markdown' }).focus();
    await ui.user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    await ui.user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Export Markdown' })).toHaveFocus();
    await ui.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(ui.host.savedFiles).toHaveLength(0);
    expect(ui.notify).not.toHaveBeenCalled();
  });

  it('selects Site summary and explains disabled This file when no file was captured', async () => {
    const ui = setup(null);
    await ui.user.click(screen.getByRole('button', { name: 'Open export' }));
    const file = screen.getByRole('radio', { name: 'This file' });
    expect(file).toHaveAttribute('aria-disabled', 'true');
    expect(file).toHaveAccessibleDescription('Select a file first');
    expect(screen.getByRole('radio', { name: 'Site summary' })).toHaveAttribute('aria-checked', 'true');
    await ui.user.click(file);
    expect(screen.getByRole('radio', { name: 'Site summary' })).toHaveAttribute('aria-checked', 'true');
  });

  it('wires radio keyboard selection and every include checkbox into the real PDF build', async () => {
    const ui = setup();
    await ui.user.click(screen.getByRole('button', { name: 'Open export' }));
    await ui.user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Site summary' })).toHaveAttribute('aria-checked', 'true');
    screen.getByRole('radio', { name: 'Markdown' }).focus();
    await ui.user.keyboard('{ArrowRight}');
    await ui.user.click(screen.getByLabelText('Questions to consider'));
    await ui.user.click(screen.getByLabelText('Configuration snapshot'));
    await ui.user.click(screen.getByLabelText('Redact environment and site names'));
    await ui.user.click(screen.getByRole('button', { name: 'Export PDF' }));
    await waitFor(() => { expect(ui.host.savedFiles).toHaveLength(1); });
    expect(ui.deps.buildReportModel.mock.calls[0]?.[1]).toEqual({ scope: 'site', format: 'pdf', fileId: 'customer', questions: false, snapshot: false, redact: true });
    expect(ui.deps.renderPdf).toHaveBeenCalledOnce();
    expect(ui.host.savedFiles[0]?.defaultName).toBe('site-site-readiness.pdf');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(ui.notify).toHaveBeenCalledOnce();
  });

  it('blocks duplicate export and all dismissal paths while native save is pending', async () => {
    const ui = setup();
    const gate = deferred<SaveResult>();
    const save = vi.spyOn(ui.host, 'saveFile').mockReturnValue(gate.promise);
    await ui.user.click(screen.getByRole('button', { name: 'Open export' }));
    await ui.user.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(save).toHaveBeenCalledOnce(); });
    expect(screen.getByRole('button', { name: 'Export Markdown' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAccessibleDescription('Wait for the export to finish.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: 'PDF' })).toHaveAttribute('aria-disabled', 'true');
    await ui.user.keyboard('{Escape}');
    await ui.user.click(screen.getByRole('button', { name: 'Close' }));
    await ui.user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    screen.getByRole('button', { name: 'Close' }).focus();
    await ui.user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await act(async () => { gate.resolve({ status: 'cancelled' }); await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open export' })).toHaveFocus();
    expect(ui.notify).not.toHaveBeenCalled();
  });

  it('recovers from PDF build failure with the same capture and a working Markdown action', async () => {
    const ui = setup();
    ui.deps.renderPdf.mockImplementationOnce(() => { throw new Error('PDF unavailable'); });
    await ui.user.click(screen.getByRole('button', { name: 'Open export' }));
    await ui.user.click(screen.getByRole('radio', { name: 'PDF' }));
    await ui.user.click(screen.getByRole('button', { name: 'Export PDF' }));
    await waitFor(() => { expect(ui.notify).toHaveBeenCalledOnce(); });
    expect(screen.getByRole('button', { name: 'Export PDF' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveAttribute('aria-disabled');
    await ui.user.click(screen.getByRole('radio', { name: 'Markdown' }));
    await ui.user.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(ui.host.savedFiles).toHaveLength(1); });
    expect(ui.host.savedFiles[0]?.content).toEqual(expect.any(String));
  });
});
```

Create `src/features/inspector/exportLifecycle.test.tsx`:

```tsx
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InspectorPage } from './InspectorPage';
import { EXPORT_DEPS } from './exportDeps';
import { fakeInspectorDeps, OTHER_SITE, renderInspector, TEST_CONNECTION } from './inspectorTestHarness';
import { siteFacts } from './model/fixtures';
import { EXPORTED_AT } from './report/reportFixtures';
import { ScanConfirmationError } from './scan/scan';
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import type { SaveResult, Connection } from '@/services/pptb/host.types';
import type { SiteFacts } from '@/types/inspector';
import { deferred } from '@/test/deferred';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function choose(ui: ReturnType<typeof renderInspector>) {
  await waitFor(() => { expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled'); });
  await ui.user.click(screen.getByRole('combobox'));
  await ui.user.click(screen.getByRole('option', { name: /Development site/ }));
}
async function open(ui: ReturnType<typeof renderInspector>) {
  await choose(ui);
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Export report' })).not.toHaveAttribute('aria-disabled'); });
  await ui.user.click(screen.getByRole('button', { name: 'Export report' }));
  return screen.getByRole('dialog');
}

describe('session to export integration', () => {
  it('keeps export disabled for retained candidate facts until identity-only Retry succeeds', async () => {
    const confirm = vi.fn<InspectorDeps['confirmScanIdentity']>().mockImplementation((_host, facts) => Promise.resolve(facts));
    const run = vi.fn<InspectorDeps['runScan']>().mockImplementation((_host, connection, site, scanId) => Promise.reject(new ScanConfirmationError(siteFacts({ connection, site, scanId }))));
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan: run, confirmScanIdentity: confirm }) });
    await choose(ui);
    await screen.findByRole('heading', { name: 'Confirm the scan connection' });
    expect(ui.current().state.facts?.files).toHaveLength(1);
    expect(ui.current().result).toBeNull();
    expect(screen.getByRole('button', { name: 'Export report' })).toHaveAccessibleDescription('Confirm the scan connection before exporting');
    await ui.user.click(screen.getByRole('button', { name: 'Export report' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await ui.user.click(screen.getByRole('button', { name: 'Retry confirmation' }));
    expect(await screen.findByRole('region', { name: 'Server logic (1)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export report' })).not.toHaveAttribute('aria-disabled');
    expect(run).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('disables export before selection, while scanning, and with zero files', async () => {
    const gate = deferred<SiteFacts>();
    let ready: SiteFacts | null = null;
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan: (_host, connection, site, scanId) => { ready = siteFacts({ connection, site, scanId, files: [] }); return gate.promise; } }) });
    expect(screen.getByRole('button', { name: 'Export report' })).toHaveAttribute('aria-disabled', 'true');
    await choose(ui);
    expect(screen.getByRole('button', { name: 'Export report' })).toHaveAttribute('aria-disabled', 'true');
    await act(async () => { if (ready === null) throw new Error('scan not started'); gate.resolve(ready); await Promise.resolve(); });
    expect(screen.getByText('No server logic found on this site')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export report' })).toHaveAccessibleDescription('No server logic files to export');
    expect(ui.host.savedFiles).toHaveLength(0);
  });

  it('exports a stopped scan with its retained connection-loss notice', async () => {
    const runScan: InspectorDeps['runScan'] = (_host, connection, site, scanId) => Promise.resolve(siteFacts({ connection, site, scanId, stopped: 'connection-lost', inventoryComplete: false }));
    const ui = renderInspector(<InspectorPage />, { deps: fakeInspectorDeps({ runScan }) });
    const dialog = await open(ui);
    await ui.user.click(within(dialog).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(ui.host.savedFiles).toHaveLength(1); });
    expect(ui.host.savedFiles[0]?.content).toContain('Connection lost. Reconnect and rescan.');
    expect(ui.host.savedFiles[0]?.content).toContain('Inventory incomplete. Reconnect and rescan.');
  });

  it('freezes review state and selected file at open while preserving same-identity rename validity', async () => {
    const ui = renderInspector(<InspectorPage exportDeps={{ ...EXPORT_DEPS, now: () => EXPORTED_AT }} />);
    const dialog = await open(ui);
    const captured = ui.current().result;
    if (captured === null) throw new Error('No result');
    act(() => { ui.current().session.toggleReview('file-1', 'webRole'); ui.current().session.selectFile('inactive'); });
    await act(async () => { ui.host.setConnection({ ...TEST_CONNECTION, name: 'Later rename', environment: 'Test' }); ui.host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    expect(screen.getByRole('dialog')).toBe(dialog);
    await ui.user.click(within(dialog).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(ui.host.savedFiles).toHaveLength(1); });
    const expected = EXPORT_DEPS.renderMarkdown(EXPORT_DEPS.buildReportModel(captured, { scope: 'file', format: 'markdown', fileId: 'file-1', questions: true, snapshot: true, redact: false }, EXPORTED_AT));
    expect(ui.host.savedFiles[0]?.content).toBe(expected);
    expect(ui.host.savedFiles[0]?.defaultName).toBe('customer-summary-readiness.md');
  });

  it.each(['id', 'url', 'null', 'site', 'rescan'] as const)('closes once with no save when %s invalidates an idle capture', async (change) => {
    const ui = renderInspector(<InspectorPage />);
    await open(ui);
    await act(async () => {
      if (change === 'site') await ui.current().session.selectSite(OTHER_SITE.id);
      else if (change === 'rescan') await ui.current().session.rescan();
      else {
        const connection: Connection | null = change === 'null' ? null : { ...TEST_CONNECTION, ...(change === 'id' ? { id: 'new-id' } : { url: 'https://new.example' }) };
        ui.host.setConnection(connection);
        ui.host.emit({ kind: 'connection-changed' });
      }
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(ui.host.savedFiles).toHaveLength(0);
    expect(ui.host.callsOf('notify').filter((call) => call.notice.title === 'Results changed, so the export was cancelled.')).toHaveLength(1);
  });

  it('processes a queued host connection event between synchronous report rendering and native handoff', async () => {
    const deps = { ...EXPORT_DEPS, renderMarkdown: vi.fn(EXPORT_DEPS.renderMarkdown) };
    const ui = renderInspector(<InspectorPage exportDeps={deps} />);
    const dialog = await open(ui);
    deps.renderMarkdown.mockImplementation((model) => {
      setTimeout(() => { ui.host.setConnection(null); ui.host.emit({ kind: 'connection-changed' }); }, 0);
      return EXPORT_DEPS.renderMarkdown(model);
    });
    await ui.user.click(within(dialog).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull(); });
    expect(ui.host.callsOf('saveFile')).toHaveLength(0);
    expect(ui.host.callsOf('notify').filter((call) => call.notice.type === 'info')).toHaveLength(1);
  });

  it('clears saving after rejection so a later rescan still closes the failed capture', async () => {
    const ui = renderInspector(<InspectorPage />);
    ui.host.setSave('reject');
    const dialog = await open(ui);
    await ui.user.click(within(dialog).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(ui.host.callsOf('notify').some((call) => call.notice.type === 'error')).toBe(true); });
    expect(within(dialog).getByRole('button', { name: 'Export Markdown' })).not.toBeDisabled();
    await act(async () => { await ui.current().session.rescan(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(ui.host.callsOf('notify').map((call) => call.notice.type)).toEqual(['error', 'info']);
  });

  it('retains submitted content when the session changes during native save', async () => {
    const ui = renderInspector(<InspectorPage />);
    const gate = deferred<SaveResult>();
    const save = vi.spyOn(ui.host, 'saveFile').mockReturnValue(gate.promise);
    const dialog = await open(ui);
    await ui.user.click(within(dialog).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => { expect(save).toHaveBeenCalledOnce(); });
    const content = save.mock.calls[0]?.[1];
    await act(async () => { ui.host.setConnection(null); ui.host.emit({ kind: 'connection-changed' }); await Promise.resolve(); });
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(ui.host.callsOf('notify')).toHaveLength(0);
    await act(async () => { gate.resolve({ status: 'saved', path: 'C:\\captured.md' }); await Promise.resolve(); });
    expect(save.mock.calls[0]?.[1]).toBe(content);
    expect(ui.host.callsOf('notify').map((call) => call.notice.type)).toEqual(['success']);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/components/Modal.busy.test.tsx src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx`

Expected: exit 1; Modal ignores the missing busy-dismiss contract, `ExportDialog` is absent, and the page has no Export report action.

- [ ] **Step 3: Implement the minimum fix**

Patch `src/components/Modal.tsx`:

```diff
 import { Icon } from './Icon';
+import { normalizeReason, useDisabledReason } from './useDisabledReason';
@@
   onClose: () => void;
+  closeDisabledReason?: string | null;
@@
   onClose,
+  closeDisabledReason,
   footer,
@@
   const titleId = useId();
+  const reason = normalizeReason(closeDisabledReason);
+  const { triggerProps, tooltip } = useDisabledReason(reason);
@@
     if (event.key === 'Escape') {
-      onClose();
+      if (reason === null) onClose();
       return;
@@
-          <button
+          <span className="ui-reason-anchor">
+          <button
+            {...triggerProps}
             type="button"
             className="ui-icon-button"
             aria-label="Close"
+            aria-disabled={reason === null ? undefined : true}
             data-modal-close="true"
-            onClick={onClose}
+            onClick={reason === null ? onClose : undefined}
           >
             <Icon name="dismiss" />
           </button>
+          {tooltip}
+          </span>
```

Create `src/features/inspector/ExportDialog.tsx`:

```tsx
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { PillGroup } from '@/components/PillGroup';
import type { ExportController, ExportJob } from './exportController';
import type { ReportFormat, ReportScope } from '@/types/report';
import './export.css';

const INCLUDE = [
  ['questions', 'Questions to consider'],
  ['snapshot', 'Configuration snapshot'],
  ['redact', 'Redact environment and site names'],
] as const;

export function ExportDialog({ controller, job }: { controller: ExportController; job: ExportJob }) {
  const busy = job.phase !== 'idle';
  const busyReason = busy ? 'Wait for the export to finish.' : null;
  const file = job.result.files.find((candidate) => candidate.fileId === job.selectedFileId);
  return <Modal open title="Export report" width={520} onClose={controller.close} closeDisabledReason={busyReason}
    footer={<>
      <Button disabledReason={busyReason} onClick={controller.close}>Cancel</Button>
      <Button variant="primary" busy={busy} onClick={() => { void controller.submit(); }}>Export {job.options.format === 'markdown' ? 'Markdown' : 'PDF'}</Button>
    </>}>
    <p className="inspector-export__context">{job.result.facts.site.name}{file === undefined ? '' : ` / ${file.name}`}</p>
    <section className="inspector-export__section">
      <h3>Report</h3>
      <PillGroup<ReportScope> label="Report" value={job.options.scope} onChange={(scope) => { controller.setOptions({ scope }); }}
        options={[
          { value: 'file', label: 'This file', disabledReason: busyReason ?? (job.selectedFileId === null ? 'Select a file first' : null) },
          { value: 'site', label: 'Site summary', disabledReason: busyReason },
        ]} />
    </section>
    <section className="inspector-export__section">
      <h3>Format</h3>
      <PillGroup<ReportFormat> label="Format" value={job.options.format} onChange={(format) => { controller.setOptions({ format }); }}
        options={[
          { value: 'markdown', label: 'Markdown', disabledReason: busyReason },
          { value: 'pdf', label: 'PDF', disabledReason: busyReason },
        ]} />
    </section>
    <section className="inspector-export__section">
      <h3>Include</h3>
      <div className="inspector-export__includes">{INCLUDE.map(([key, label]) => <label key={key}>
        <input type="checkbox" checked={job.options[key]} disabled={busy} onChange={(event) => { controller.setOptions({ [key]: event.currentTarget.checked }); }} />
        <span>{label}</span>
      </label>)}</div>
    </section>
    <p role="status" aria-live="polite" className="inspector-export__status">{job.phase === 'building' ? 'Building report…' : job.phase === 'saving' ? 'Saving report…' : ''}</p>
  </Modal>;
}
```

Create `src/features/inspector/export.css`:

```css
.inspector-export__context { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.inspector-export__section { margin-top: 20px; }
.inspector-export__section h3 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: var(--text); }
.inspector-export__includes { display: grid; gap: 12px; }
.inspector-export__includes label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text); }
.inspector-export__includes input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
.inspector-export__status { min-height: 18px; margin: 16px 0 0; color: var(--muted); font-size: 12px; }
```

Patch the 6d version of `src/features/inspector/InspectorPage.tsx`:

```diff
 import { InspectorContent } from './InspectorContent';
+import { ExportDialog } from './ExportDialog';
+import type { ExportDeps } from './exportDeps';
+import { useExportReport } from './useExportReport';
 import './inspector.css';
 
-export function InspectorPage(): ReactNode {
+export function InspectorPage({ exportDeps }: { exportDeps?: ExportDeps } = {}): ReactNode {
   const { session, state, result } = useInspector();
+  const { controller, job } = useExportReport(exportDeps);
   const connection = useActiveConnection();
   const status = useConnectionStatus();
-  const actions = state.site === null ? null : <Button busy={state.phase === 'scanning'} onClick={() => { void session.rescan(); }}>Rescan</Button>;
+  const eligible = state.phase === 'complete' && result !== null && result.files.length > 0;
+  const exportReason = eligible ? null : state.phase === 'scanning' ? 'Wait for the scan to finish' : state.phase === 'awaiting-confirmation' || state.phase === 'confirming' ? 'Confirm the scan connection before exporting' : result !== null && result.files.length === 0 ? 'No server logic files to export' : 'Finish a scan before exporting';
+  const actions = <>
+    {state.site === null ? null : <Button busy={state.phase === 'scanning'} onClick={() => { void session.rescan(); }}>Rescan</Button>}
+    <Button variant="primary" disabledReason={exportReason} onClick={() => { if (result !== null) controller.open(result, state.selectedFileId, state.epoch); }}>Export report</Button>
+  </>;
@@
     {message === null ? <InspectorContent actions={actions} /> : <Tile heading="Logic Inspector" className="inspector-message">{message}<div className="inspector-actions">{actions}</div></Tile>}
+    {job === null ? null : <ExportDialog controller={controller} job={job} />}
   </section>;
 }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/components/Modal.busy.test.tsx src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx`

Expected: exit 0; every dialog control, focus-trap/return, busy-dismiss, eligibility, frozen review, queued-host-event and post-handoff outcome assertion passes.

Run: `npx vitest run src/features/inspector src/app/inspector-site src/app/Inspector.integration.test.tsx src/components/Modal.test.tsx src/components/PillGroup.test.tsx tests/buildShape.test.ts`

Expected: exit 0; both export scopes/formats, actual reader composition, existing modal/radio behavior and Inspector exclusion pass.

Run: `npx eslint src/features/inspector/ExportDialog.tsx src/features/inspector/exportController.ts src/features/inspector/exportDeps.ts src/features/inspector/useExportReport.ts src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportController.test.ts src/features/inspector/exportLifecycle.test.tsx src/features/inspector/InspectorPage.tsx src/components/Modal.tsx src/components/Modal.busy.test.tsx --max-warnings=0`

Expected: exit 0 for changed files.

Rendered/live check: with a finished or stopped nonempty scan in the Desktop Debug loader, open Export report by keyboard, traverse both radio groups and all three checkboxes, verify Escape and focus return, then export file/site Markdown and PDF. Compare statuses, Reviewed original reasons, Not scanned, banners, include-off and redaction-on output against the capture. Measure primary-click → native dialog and native-confirm → success toast independently; each must be ≤5s. Cancel and retry a rejected save. Record the real host result and keep Task 10's release gates open until that evidence exists.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/components/Modal.tsx src/components/Modal.busy.test.tsx src/features/inspector/ExportDialog.tsx src/features/inspector/export.css src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx src/features/inspector/InspectorPage.tsx
git commit --only -m "feat(inspector): wire captured Markdown and PDF export dialog" -- src/components/Modal.tsx src/components/Modal.busy.test.tsx src/features/inspector/ExportDialog.tsx src/features/inspector/export.css src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx src/features/inspector/InspectorPage.tsx
```

## Coverage and final integration

| Requirement | Authoritative task / proof |
|---|---|
| Initial versus refresh errors, null success, focus/visible cleanup, latest/unmount guards | 6a lifecycle tests |
| Hidden-tab state, id+URL identity, rename/relabel retention, synchronous clearing, serialized replacement scans | 6b store + 6d actual App reader tests |
| Failed final identity confirmation, retained candidate facts, identity-only retry, export blocked until acceptance | 6b store + 6d hidden-tab reader integration + 8b eligibility tests |
| No preselection, active/inactive, APG type-ahead/navigation/commit/Escape, long names | 6c control tests + 6d rendered gate |
| Loading/error/empty/scanning/finished/stopped/incomplete UI, banners, guidance/questions/snapshot | 6d page tests |
| Canonical review eligibility, original reasons, derived counts and file summaries | 6b + 6d; Task 4 owns evidence semantics and 64 combinations |
| Immutable capture, all 32 scope/format/include combinations, task-yield validity, success/cancel/failure/retry | 8a controller tests |
| Focus/return/Escape, busy-dismiss constraints, actual export eligibility and generation invalidation | 8b rendered tests |
| Placeholder removal and explicit build exclusion | 6d marker patch, followed by Task 9's final build proof |

After the owning tasks integrate, run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run build:beta` once. Expected: every gate exits 0, with the integration checkpoint's recorded baseline as the comparison. No Prettier command or new package is required.

### Actual planning verification — 2026-11-01

The unique scratch validator reads this plan plus the transport/reader, rule and report/build plans. It applies source overlays in memory; proposed new tests are reached through scratch-only Vitest entrypoints. Every UI patch anchor matched the planning checkout. Production source was not edited.

| Executed command | Observed result |
|---|---|
| `node .scratch/phase5-2026-11-01/ui-overlay.mjs` | Full local TypeScript program with 74 overlaid files, including all 34 UI-owned files: **0 diagnostics**. |
| `node .scratch/phase5-2026-11-01/ui-overlay.mjs lint` | All UI-owned TypeScript/TSX files against that program: **0 errors or warnings**. |
| `npm test -- --config .scratch/phase5-2026-11-01/ui-postchange.config.ts --reporter=dot` | **13 files / 157 tests passed**. Includes all proposed UI/session/export tests, existing App/connection/modal/radio tests, the real reader integration, real synchronous PDF rendering, the 32 report-option combinations, and four-read drain proof. |
| `node .scratch/phase5-2026-11-01/ui-overlay.mjs build` | Both explicit `starter,objects,inspector` and `starter,objects` overlay builds produce one classic-script bundle. Page/session/export/PDF markers are present only in the Inspector-enabled artifact. |

Final integration correction: scan acceptance now compares `facts.connection` with the captured scan-source `connection`; the epoch guard remains unchanged. Re-running `node .scratch/phase5-2026-11-01/ui-overlay.mjs` produced **0 diagnostics**. Re-running `npm test -- --config .scratch/phase5-2026-11-01/ui-postchange.config.ts .scratch/phase5-2026-11-01/ui-probe-tests/src__app__inspector-site__inspectorSession.test.ts .scratch/phase5-2026-11-01/ui-probe-tests/src__app__Inspector.integration.test.tsx --reporter=dot` passed **2 files / 27 tests**.

The first executable overlay run exposed cross-realm abort classification and a queued-host-event handoff race. The final listings fix them at the host-error predicate and connection lifecycle owner, and the same tests now pass. Review/rename never invalidates an export epoch; pre-handoff changes cancel once; post-handoff changes preserve submitted content.

No unresolved local UI contract, compiler, scoped lint or test issue remains. Actual Desktop visual/contrast checks, screen-reader behavior outside JSDOM, live Dataverse/native-save timing and publication gates remain the explicitly assigned RG-004–RG-006 execution checks; the overlay evidence does not claim those observations.

The final cross-task rerun after the PDF metadata correction is recorded in [Final planning handoff](11-01-2026-phase-5-baseline.md#final-planning-handoff).
