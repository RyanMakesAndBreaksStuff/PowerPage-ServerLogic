# P5.5 plan — App-scoped Inspector session and the finished Inspector page

**Date:** 2026-11-02
**Baseline:** branch `logic-inspector-v2-build`, HEAD `1e0156b`. P5.1 to P5.4 and P5.6 are merged. At that HEAD `npm test` passes 105 files / 1727 tests, and `npm run typecheck`, `npm run lint` (`eslint . --max-warnings=0`) and `npm run build` exit 0 (bundle `index-*.js` 932.90 kB).
**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v4.2.0: AC-1.2, AC-1.3, AC-1.7, AC-7.1 to AC-7.12, AC-8.1 to AC-8.12 (display and review), FR-1, FR-7 (scan ID, four reads in flight), FR-8, FR-11, the accessibility NFR (L889 to L894) and Error Scenarios L909 to L935. D-19 C (a reloaded list that omits the selected site resets the page to 'Select a site', dropping that site's results) is the one spec delta; it is a pre-execution step. Same-identity events update only the title bar and the AC-7.5 warning, within AC-7.6.
**Audit items:** CR-001 and WR-005 (this slice owns both), IN-001 (the build marker), RG-002 (host lifecycle: one subscription, cleanup, same-identity events, transient refresh rejection) and RG-005 (rendered checks: supplied by the code, recorded in the evidence; the live parts stay open).
**Status:** Draft for owner review. Revised 2026-11-02 for the owner's picks (D-02 C, D-03 C, D-05 B, D-09 B, D-14 B) and the four choices they raised, with the owner's later 2026-11-02 reversals: D-16 A (reversed from B), D-19 C, D-21 B; D-17, D-18, D-20 superseded/confirmed as recorded in P5-5choices.md. S-06 and S-08 are settled below; S-07 is withdrawn.
**Supersedes:** Tasks 6a to 6d of `docs/archive/11-01-2026-phase-5-session-export.md` (L31, L306, L897 and L1222, with the marker patch at L1887), as reference only. That draft targets the old reader contract (`ScanConfirmationError`, pending facts), spec 4.0.1 and baseline `820d7b8`; none of its code is reused as written.

## Goal

Replace the disabled site pill and the placeholder page with the real Inspector journey, on the P5.4 reader and the P5.3 rules, with no second evaluator. The ConnectionProvider keeps the last confirmed connection when a refresh rejects, reports the failure separately from a confirmed disconnect, and recovers on connection events, window focus, a visible document and a Retry button (D-05). A same-identity connection event leaves the site list, selection, results and marks untouched (D-16 A); a list reload that no longer contains the selected site resets the page to 'Select a site' (D-19 C). One app-scoped session mounted around the whole shell (title bar and every page, behind `__PAGE_INSPECTOR__`) owns the selected site, the scan generation and its `AbortController`, the facts, the file selection and the review marks once, and hands the title-bar APG select-only combobox and the page the same state. The page shows every state (disconnected, unknown connection, loading, no sites, site-list error with Retry, scanning, scan failed, no files, finished, stopped or partial) and, for a finished scan, layout 10a on the Graphite tokens: files rail, title tile with Scan again and a permanently disabled Export report, and, once the user picks a file (D-03), the readiness ring, three finding tiles and a detail tile with Mark as reviewed and Undo review wired to `canReviewFinding`. Until a file is picked one prompt fills those cells (D-18). A scan the connection change abandoned says so until the new identity arrives (D-14). The export dialog and save are P5.7; the button is here so AC-7.4 and AC-7.8 hold literally (D-09, D-17). Nothing under `src/services/pptb/` changes and no runtime dependency is added.

## Decisions adopted (the owner approves these with the plan)

Each decision has its context, options and an "Owner decision" line in `docs/phase-5/plans/P5-5choices.md`. The owner answered D-02, D-03, D-05, D-09, D-14 and D-16 on 2026-11-02, D-17 to D-20 the same day, and reversed D-16 (now A) and D-19 (now C) later that day; the rows below carry the final answers. The other ten decisions take their Adopted option when the plan is approved.

| ID | Decision |
|---|---|
| D-01 | **No Stop control.** A running scan is replaced by selecting another site, a rescan or a connection change. "Stopped" always means connection loss (AC-7.10). |
| D-02 | **Scan again (owner: C).** A ghost button labelled "Scan again" with a refresh glyph in the title tile and in the failed-scan panel; never shown while scanning, with no site, in a connection or site-list state, or after the connection changed under a scan. The session action is still `rescan`, and the spec banners keep "Reconnect and rescan." verbatim. The site-list error has "Retry". |
| D-03 | **No file selected after a scan (owner: C).** The rail lists the files with none highlighted; its buttons stay in the tab order. Once the user picks a file, AC-8.3 applies (the first Needs-review finding, else the first check), and a finding the user chooses, marks or undoes is remembered per file until the next scan. AC-8.1 and AC-8.3 are "given a selected file", so no spec edit. P5.7 note: a file-scope export needs a selected file; a site-scope export does not. |
| D-04 | **Picker label.** "No site selected" in every state without a selection; the control is `aria-disabled` with a reason on hover and focus when it cannot open; after a choice it shows the site name. Options show name, domain and an "Inactive" tag; inactive options are disabled. |
| D-05 | **Unknown connection, with Retry (owner: B).** `ConnectionState` is `unknown \| disconnected \| connected`, each with `refreshFailed`. The title bar says "Checking connection…" or "Connection unavailable", never "Not connected", for an unread connection. A failure after a confirmed state keeps it and adds a notice. A **Retry** button on the "Couldn't read the active connection" panel and in that notice re-reads the connection; it shows only after a read rejected and hides while a read is in flight (S-06). Events, focus and visibility still retry on their own. |
| D-06 | **Copy.** Spec strings verbatim; the rest is authored in `pageCopy.ts` (listed in the choices file). The polite live region changes only on state transitions, never with the running count. |
| D-07 | **AC-7.5 and AC-7.11 warning.** A persistent notice at the top of the Inspector page for any confirmed connection that is not Dev, from the live connection so a relabel updates it. |
| D-08 | **Ring wording.** The spec wins: "K/3 addressed" and `ringLegend`. |
| D-09 | **A permanently disabled Export report (owner: B).** The shared `Button` with `disabledReason` (F47: `aria-disabled`, focusable, reason on hover and focus, clicks ignored). P5.7 enables it for a finished or stopped scan with at least one file and swaps the reason for the real action. `result`, `fileId`, `marks` and `generation` are exposed for it. |
| D-10 | **Banners.** One "Site notices" list above the grid with every `SiteResult.banners` entry, once, backticks removed. |
| D-11 | **Zero files.** "No server logic found on this site" only for a complete, unstopped inventory; otherwise "No server logic records were read." |
| D-12 | **Detail tile.** Literal 10a cell, scrollable and focusable. |
| D-13 | **Picker keys.** Inactive options can be highlighted, never committed; Tab commits only after the highlight moved; blur and click-away cancel; type-ahead buffer 600 ms. |
| D-14 | **Scan outcomes (owner: B).** Our own `AbortError` is a cancellation; any other rejection is a failed state with Scan again. `ScanAbandonedError` publishes `scan: { status: 'connection-changed', site }` (results never shown, `fileId` and `marks` cleared, generation bumped) and the page shows **The connection changed while scanning** until the provider adopts the new identity (which clears the session as before) or the user chooses a site. `rescan()` does nothing from this state, so no Scan again. Accepted consequence: if the event never arrives the message stays until the next re-read or site choice. |
| D-15 | **Title bar.** The connection label ellipsizes with a tooltip so the picker stays on screen at 1024 px (`TitleBar.tsx` and `shell.css` join the file list). |
| D-16 | **Site list reloads (owner: A)** on a first confirmed connection, a changed id or URL, Retry and mount only. A same-identity `connection:*` event, a rejected re-read and a focus or visibility re-read do not reload it. A reload goes through the same `track` chain and `listToken` as `loadSites()` (S-02). |
| D-17 | **Where Export report shows (owner: A).** In the title tile for every finished or stopped scan, including an empty site (AC-7.4), and under the AC-7.8 "No sites found" panel. One reason text: "Report export arrives in a later update." |
| D-18 | **Before a file is chosen (owner: A).** The title tile keeps its heading, sub-line, Scan again and Export report, with the site name where `<file> · <status>` will go. One prompt fills the ring, finding and detail cells: "Select a file to review its readiness." |
| D-19 | **The selected site is missing from a reloaded list (owner: C).** When a successful list load omits the selected site, the store clears `selectedSite`, the scan, `fileId` and `marks` (generation bumped), so the picker shows 'No site selected' and the page its no-selection state. No notice. Spec delta recorded (pre-execution step 1). |
| D-20 | **Superseded (D-16 A).** No background reload exists; the Retry/mount loads keep the 'Couldn't load sites' state with Retry. |
| S-01 | **Architecture.** `src/app/inspector-site/inspectorSession.ts` is a plain TypeScript store (`createInspectorStore(host, deps)`) read through `useSyncExternalStore`; the provider adds no host subscription (it follows `ConnectionProvider`'s state), so `App.test.tsx`'s `host.listenerCount()` assertion stays at 2 unchanged. The store keeps source state only; `evaluateSite(facts, marks)` runs during render in the provider. |
| S-02 | **Reads.** A scan has at most four reads in flight (FR-7). `runScan` settles only after every read it started has settled, even when one of them rejects with `AbortError` (it waits with `Promise.allSettled` and rethrows the first rejection, step B11a). The old scan is aborted first, and a new scan or site-list read starts only after the previous `runScan` has fully settled (the store's `settled` chain), which bounds reads across generations to four. `listSites` has no signal: a stale result is discarded by token. A scan id is `<connection id>:<site id>:<generation>`. |
| S-03 | **Synchronous clearing.** Until the provider's effect has adopted a changed identity, the provider renders the session as already cleared, so a result is never rendered against a different connection. `stop()` (effect cleanup) aborts, resets and allows re-adoption, so StrictMode's double effects are safe. |
| S-04 | **Test seams.** The fake host cannot reject or delay `getActiveConnection` or hold reads, so `src/test/gatedHost.ts` wraps it (no change under `src/services/pptb/`). Fidelity: gatedHost's immediate `AbortError` rejection of a parked read does not model the adapter, whose in-flight host calls cannot be interrupted (a `queryData` call in progress keeps running); `holdDataReads(true, { ignoreAbort: true })` with `releaseHeldDataReads(n)` models that case. `createWorld` in `scan.test.ts` is left alone; `src/test/inspectorWorld.ts` is a small site-aware world for page tests, and `src/test/fixedDeps.ts` supplies exact facts for display tests. |
| S-06 | **Retry reaches the provider through a second context.** `ConnectionRefreshContext` carries `{ refresh, pending }`, read with `useRefreshConnection()`. `refresh` calls the effect's own `load()` through a ref, so the host is still subscribed once and the `latest` token still supersedes older reads. `ConnectionState` and its consumers keep their shapes; the alternative, a `pending` flag on every `ConnectionState` variant, would touch every consumer and test for no visible gain. |
| S-07 | **S-07 (withdrawn 2026-11-02).** D-16 A needs no event signal to the session; the provider's existing `connectionKey` identity change is the only trigger. |
| S-08 | **The picker while "The connection changed while scanning" shows** reads "No site selected": `selectedSite` is null for the new scan state as for `none`, because the scan was discarded (matches D-04). The alternative, keeping the discarded site's name, would imply results exist for it. |
| S-05 | **Build marker (IN-001).** `tests/buildShape.test.ts` now requires `Review server logic readiness` and `useInspector must be used inside the Inspector session provider` in the all-pages bundle and forbids both in the starter-only and beta bundles. Both exist only in Inspector code. `No site selected` stays (SitePill, Inspector only). |

## Pre-execution

1. Record the D-19 C spec delta via `sdd-spec-update` (owner): a reloaded site list that omits the selected site resets the Inspector to 'Select a site' and drops that site's results and marks.
2. Move `docs/plans/p5-5_plan.md` and `docs/plans/P5-5choices.md` to `docs/phase-5/plans/` and add the README row (`docs/phase-5/README.md` L29 rule).

## Spec items missing from the build (gap table)

| # | Spec item | Current code (verbatim) | Gap |
|---|---|---|---|
| G1 | WR-005: a rejected refresh must keep the last confirmed connection | `ConnectionProvider.tsx` L21 to L23 `        () => {` `          if (request === latest) setConnection(null);` `        },` | A rejection is shown as "Not connected" and cannot be told from a confirmed null. |
| G2 | WR-005 and AC-7.6: recover on focus and visibility, not only on events | `ConnectionProvider.tsx` L27 to L29 `    const unsubscribe = host.onEvent((event) => {` `      if (event.kind === 'connection-changed') load();` `    });` | No `focus` or `visibilitychange` retry (compare `useHostTheme.ts`, which has both). |
| G3 | The failure channel | `useActiveConnection.ts` L4 `export const ConnectionContext = createContext<Connection \| null>(null);` | The context value is a bare `Connection \| null`: no unknown state, no failure flag. |
| G4 | CR-001: one app-scoped session around the title bar and the pages | `App.tsx` L53 to L54 `            <div className="shell">` `              <TitleBar />` and L69 to L71 `                {__PAGE_INSPECTOR__ ? (` `                  <Panel id="inspector" label="Logic Inspector" view={view}>` `                    <InspectorPage />` | `src/app/inspector-site/` does not exist; the title bar sits outside any Inspector provider and the page has no state. |
| G5 | AC-7.2, AC-1.2: the site picker | `SitePill.tsx` L4 to L8 `// Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).` `export function SitePill(): ReactElement {` `    <Pill compact aria-disabled="true" className="shell__site">` `      No site selected` | A permanently disabled placeholder; nothing lists sites or starts a scan. |
| G6 | Stories 7 and 8: the page | `InspectorPage.tsx` L3 to L7 `// Placeholder. Phase 23 builds the real page.` `export function InspectorPage(): ReactNode {` `      <p>Logic Inspector page placeholder</p>` | No state, no files, no ring, no findings, no review. |
| G7 | AC-7.5 and AC-7.11: the non-development warning | `grep -rn "development environment" src` finds nothing | The warning text exists nowhere in the code. |
| G8 | IN-001: the build marker asserts the placeholder | `tests/buildShape.test.ts` L101 `    expect(code).toContain('Logic Inspector page placeholder');` (also L116 and L131 as `not.toContain`) | The test requires scaffolding, not behaviour. |
| G9 | Tests of a failing or slow host | `fakeHost.ts` L175 to L178 `    getActiveConnection: () => {` `      calls.push({ method: 'getActiveConnection' });` `      return Promise.resolve(connection);` | The fake cannot reject or delay a connection read, and reads answer after one microtask, so a refresh failure or a scan still running cannot be staged. |
| G10 | Four reads across scans (FR-7) and `listSites` has no signal | `scan.ts` L315 `export async function listSites(host: PptbHost): Promise<readonly SiteRef[]> {` and `runScan` takes `options.signal` | The reader bounds reads inside one scan only; the session must abort and await the old scan and discard a stale list by token. |
| G11 | Title bar at 1024 px (found by the rendered check) | `shell.css` `.shell__context {` … `  white-space: nowrap;` `}` (no `min-width`, no ellipsis) | A long connection name pushes the picker off screen and adds a horizontal scrollbar. |

Existing behaviour that must not change: `host.listenerCount()` is 2 for the app (`App.test.tsx`, unchanged); `useActiveConnection()` still returns `Connection | null` (no production caller after this slice; retained for P5.7 and the legacy test); `TopTabs`, the Starter and Server Objects pages, the model, the reader, the report code and `src/services/pptb/` are untouched; the exact signatures pinned in `src/skeleton.test.ts` do not change.

## Files

| Action | Path |
|---|---|
| Create | `src/test/gatedHost.ts`, `gatedHost.test.ts`, `deferred.ts`, `inspectorWorld.ts`, `fixedDeps.ts` |
| Create | `src/app/inspector-site/inspectorDeps.ts`, `inspectorSession.types.ts`, `inspectorSession.ts`, `useInspector.ts`, `InspectorSessionProvider.tsx` |
| Create | `src/app/inspector-site/inspectorTestHarness.tsx`, `inspectorSession.test.ts`, `InspectorSessionProvider.test.tsx` |
| Create | `src/app/shell/SiteCombobox.tsx`, `siteCombobox.css`, `SiteCombobox.test.tsx`, `SitePill.test.tsx` |
| Create | `src/app/App.inspector.test.tsx` |
| Create | `src/features/inspector/pageState.ts`, `pageCopy.ts`, `StatePanel.tsx`, `FilesRail.tsx`, `ResultsView.tsx`, `ReadinessTile.tsx`, `FindingTile.tsx`, `FindingDetail.tsx`, `inspector.css`, `InspectorPage.test.tsx`, `ResultsView.test.tsx` |
| Replace | `src/app/ConnectionProvider.test.tsx` (334 lines, full new content), `src/features/inspector/InspectorPage.tsx` (the 10-line placeholder) |
| Edit | `src/features/inspector/scan/scan.ts` (settle-all, B11a), `src/features/inspector/scan/scan.test.ts` (two tests, B3a) |
| Edit | `src/app/useActiveConnection.ts`, `src/app/ConnectionProvider.tsx`, `src/app/shell/connectionLabel.ts`, `connectionLabel.test.ts`, `TitleBar.tsx`, `SitePill.tsx` (whole body), `shell.css`, `src/app/App.tsx`, `src/app/App.test.tsx`, `tests/buildShape.test.ts` |
| Create | `docs/phase-5/evidence/p5-5/execution.md` (Evidence step) |
| Local only, not committed | `.rm-frontend-review/p5-5/` (rendered-check files; git-ignored; deleted before the final gates) |

Not touched: `src/services/pptb/`, `src/features/inspector/model/`, `scan/` except `scan.ts` and `scan.test.ts` (above), `report/`, the Starter and Server Objects code, `package.json`, `vite.config.ts`, `src/skeleton.test.ts`, the spec. `createWorld` and the existing tests in `scan.test.ts` are unchanged.

---

## Execution convention

The working tree uses CRLF and `core.autocrlf` is `true`; the git index is LF. New files in this plan are pasted whole and saved with CRLF endings (`src/app/App.tsx` and `tokens.css` are the working-tree exceptions that are LF). Anchored edits are written as LF diffs: in each block, lines beginning with a space are context, `-` lines are removed and `+` lines are added. Match the context and removed lines of a block together, line by line, ignoring `\r`; the block must match exactly once. Easiest is a small script that normalises the file to LF, applies the replacement (old block = context plus removed lines, new block = context plus added lines), asserts a single match and restores the file's original endings. Keep one ending style per file. Run `git diff --cached --check` before each commit to catch trailing whitespace (mixed endings are normalised on add and are not detected); diffs are written LF. Test helpers use only the public fake host, the host types and `HostCallError` from `src/services/pptb/`, and change nothing there. Every test-first step runs with the implementation of that slice absent, exactly as written, and its observed signal is recorded; the commands use the repo's `npm test --` form.

Each sub-slice leaves the tree compiling with all tests passing and is committed on its own; later slices depend on earlier ones. `git add` names files explicitly; commit messages carry no attribution lines.

---

## Sub-slice A — Connection provider: last confirmed connection, failure kept apart, focus and visibility recovery (WR-005)

**Commit:** `fix(app): keep the last confirmed connection when a refresh fails and recover on focus`

### Phase A1 — Failing tests

- [x] **A1. Create `src/test/gatedHost.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { gateHost } from './gatedHost';

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};
const QUERY = { entitySet: 'things', select: ['id'], filter: null, orderBy: null, pageSize: 10 };

describe('gateHost', () => {
  it('passes calls through to the fake and records them', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO, tables: { things: [{ id: 1 }] } }));
    await expect(host.getActiveConnection()).resolves.toEqual(CONTOSO);
    await expect(host.queryAll(QUERY)).resolves.toEqual([{ id: 1 }]);
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
    expect(host.callsOf('queryAll')).toHaveLength(1);
    expect(host.dataReads).toEqual({ started: 1, inFlight: 0, peak: 1 });
  });

  it('rejects connection reads in reject mode', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('reject');
    await expect(host.getActiveConnection()).rejects.toThrow('getActiveConnection');
    host.setConnectionRead('ok');
    await expect(host.getActiveConnection()).resolves.toEqual(CONTOSO);
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
  });

  it('parks connection reads in hold mode until the test settles each one', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    const first = host.getActiveConnection();
    const second = host.getActiveConnection();
    expect(host.parkedConnectionReads).toBe(2);
    host.rejectConnectionRead(0);
    host.settleConnectionRead(1, CONTOSO);
    await expect(first).rejects.toThrow('getActiveConnection');
    await expect(second).resolves.toEqual(CONTOSO);
  });

  it('parks data reads until released and counts them', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [{ id: 1 }] } }));
    host.holdDataReads(true);
    const read = host.queryAll(QUERY);
    await Promise.resolve();
    expect(host.dataReads).toMatchObject({ started: 1, inFlight: 1, peak: 1 });
    expect(host.callsOf('queryAll')).toHaveLength(0);
    host.holdDataReads(false);
    await expect(read).resolves.toEqual([{ id: 1 }]);
    expect(host.dataReads.inFlight).toBe(0);
  });

  it('rejects a parked data read with AbortError when its signal aborts', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [] } }));
    host.holdDataReads(true);
    const controller = new AbortController();
    const read = host.queryAll(QUERY, controller.signal);
    controller.abort();
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    expect(host.dataReads.inFlight).toBe(0);
  });

  it('keeps a parked data read pending after its signal aborts when the hold ignores abort', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [{ id: 1 }] } }));
    host.holdDataReads(true, { ignoreAbort: true });
    const controller = new AbortController();
    const state = { settled: false };
    const outcome = host.queryAll(QUERY, controller.signal).then(
      () => {
        state.settled = true;
      },
      () => {
        state.settled = true;
      },
    );
    controller.abort();
    await Promise.resolve();
    await Promise.resolve();
    expect(state.settled).toBe(false);
    expect(host.dataReads.inFlight).toBe(1);
    host.releaseHeldDataReads(1);
    await outcome;
    expect(state.settled).toBe(true);
    expect(host.dataReads.inFlight).toBe(0);
  });
});
```

- [x] **A2. Replace the entire content of `src/app/ConnectionProvider.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import {
  useActiveConnection,
  useConnectionState,
  useRefreshConnection,
} from '@/app/useActiveConnection';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { gateHost } from '@/test/gatedHost';
import type { GatedHost } from '@/test/gatedHost';

afterEach(cleanup);

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};
const FABRIKAM: Connection = {
  id: 'c2',
  name: 'Fabrikam',
  url: 'https://fabrikam.crm.dynamics.com',
  environment: 'Test',
};

function Show(): ReactElement {
  const state = useConnectionState();
  const text = state.status === 'connected' ? `connected ${state.connection.name}` : state.status;
  return <p>{state.refreshFailed ? `${text} (refresh failed)` : text}</p>;
}

function ShowLegacy(): ReactElement {
  const connection = useActiveConnection();
  return <p>{connection === null ? 'none' : connection.name}</p>;
}

/** The state, whether a read is in flight and a Retry, as the page uses them (D-05). */
function ShowRefresh(): ReactElement {
  const { refresh, pending } = useRefreshConnection();
  return (
    <div>
      <Show />
      <p>{pending ? 'pending' : 'idle'}</p>
      <button type="button" onClick={refresh}>
        Retry
      </button>
    </div>
  );
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

async function mount(connection: Connection | null, ui: ReactElement = <Show />) {
  const host = gateHost(createFakeHost({ connection }));
  const view = render(
    <HostContext value={host}>
      <ConnectionProvider>{ui}</ConnectionProvider>
    </HostContext>,
  );
  await flush();
  return { host, ...view };
}

async function changed(host: GatedHost) {
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('ConnectionProvider', () => {
  it('reads the active connection on start', async () => {
    await mount(CONTOSO);
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('reads a successful null as a confirmed disconnect, not as unknown', async () => {
    await mount(null);
    expect(screen.getByText('disconnected')).toBeTruthy();
  });

  it('is unknown, with no failure, until the first read settles', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(screen.getByText('unknown')).toBeTruthy();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('keeps the legacy hook null until a connection is confirmed', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <ShowLegacy />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(screen.getByText('none')).toBeTruthy();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('Contoso')).toBeTruthy();
  });

  it('re-reads on connection-changed and subscribes once', async () => {
    const { host } = await mount(CONTOSO);
    expect(host.listenerCount()).toBe(1);
    host.setConnection(FABRIKAM);
    await changed(host);
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
  });

  it('ignores other events', async () => {
    const { host } = await mount(CONTOSO);
    await act(async () => {
      host.emit({ kind: 'settings-updated' });
      await Promise.resolve();
    });
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
  });

  it('publishes a rename that keeps the same id and URL', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnection({ ...CONTOSO, name: 'Contoso renamed', environment: 'Production' });
    await changed(host);
    expect(screen.getByText('connected Contoso renamed')).toBeTruthy();
  });

  it('keeps the last confirmed connection when a refresh rejects, and says the refresh failed (WR-005)', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    host.setConnectionRead('ok');
    await changed(host);
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('keeps a confirmed disconnect when a refresh rejects', async () => {
    const { host } = await mount(null);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('disconnected (refresh failed)')).toBeTruthy();
  });

  it('reads a rejected first read as unknown with a failure, never as "none"', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('reject');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    await flush();
    expect(screen.getByText('unknown (refresh failed)')).toBeTruthy();
  });

  it('recovers on window focus after a failed refresh', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnectionRead('reject');
    await changed(host);
    host.setConnectionRead('ok');
    host.setConnection(FABRIKAM);
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('recovers when the document becomes visible, and ignores becoming hidden', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnection(FABRIKAM);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();
      expect(screen.getByText('connected Contoso')).toBeTruthy();
    } finally {
      Reflect.deleteProperty(document, 'visibilityState');
    }
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('ignores the answer to a read that a newer read superseded', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    await changed(host);
    expect(host.parkedConnectionReads).toBe(2);
    host.settleConnectionRead(1, FABRIKAM);
    await flush();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('drops a late answer after unmount and removes every listener', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    const { unmount } = render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(host.listenerCount()).toBe(1);
    unmount();
    expect(host.listenerCount()).toBe(0);
    host.settleConnectionRead(0, CONTOSO);
    host.setConnectionRead('ok');
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
  });
});

describe('ConnectionProvider: Retry (D-05, S-06)', () => {
  const retry = () =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await Promise.resolve();
    });

  it('re-reads the active connection on Retry', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnection(FABRIKAM);
    await retry();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
    expect(host.listenerCount()).toBe(1);
  });

  it('says a read is pending from start to settle, so Retry can be hidden meanwhile', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <ShowRefresh />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(screen.getByText('pending')).toBeTruthy();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('idle')).toBeTruthy();
    await retry();
    expect(screen.getByText('pending')).toBeTruthy();
    host.settleConnectionRead(1, CONTOSO);
    await flush();
    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('lets a newer read supersede the one Retry started', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <ShowRefresh />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    await retry();
    await changed(host);
    expect(host.parkedConnectionReads).toBe(3);
    host.settleConnectionRead(2, FABRIKAM);
    await flush();
    host.settleConnectionRead(1, CONTOSO);
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('clears the failure when Retry succeeds', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    host.setConnectionRead('ok');
    await retry();
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('keeps the confirmed connection when Retry fails too', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnectionRead('reject');
    await retry();
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
  });
});
```

- [x] **A3. Edit existing tests**

In `src/app/shell/connectionLabel.test.ts`:

```diff
-import { connectionLabel } from './connectionLabel';
+import type { ConnectionState } from '@/app/useActiveConnection';
+import { connectionLabel, connectionStateLabel } from './connectionLabel';
```

In `src/app/shell/connectionLabel.test.ts`:

```diff
     expect(connectionLabel(at(environment))).toBe(expected);
   });
 });
+
+describe('connectionStateLabel', () => {
+  it.each([
+    [{ status: 'connected', connection: at('Dev'), refreshFailed: false }, 'Contoso · Development'],
+    [{ status: 'connected', connection: at('Dev'), refreshFailed: true }, 'Contoso · Development'],
+    [{ status: 'disconnected', refreshFailed: false }, 'Not connected'],
+    [{ status: 'unknown', refreshFailed: false }, 'Checking connection…'],
+    [{ status: 'unknown', refreshFailed: true }, 'Connection unavailable'],
+  ] as const satisfies readonly (readonly [ConnectionState, string])[])(
+    'labels %j as "%s"',
+    (state, expected) => {
+      expect(connectionStateLabel(state)).toBe(expected);
+    },
+  );
+});
```

In `src/app/App.test.tsx`:

```diff
 import type { Connection } from '@/services/pptb/host.types';
+import { gateHost } from '@/test/gatedHost';
 
 afterEach(cleanup);
```

In `src/app/App.test.tsx`:

```diff
+  it('does not call an unreadable connection "Not connected" (WR-005)', async () => {
+    const host = gateHost(createFakeHost({ connection: CONTOSO }));
+    host.setConnectionRead('reject');
+    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
+    await act(async () => {
+      await Promise.resolve();
+      await Promise.resolve();
+    });
+    expect(screen.getByText('Connection unavailable')).toBeTruthy();
+    expect(screen.queryByText('Not connected')).toBeNull();
+    host.setConnectionRead('ok');
+    await act(async () => {
+      window.dispatchEvent(new Event('focus'));
+      await Promise.resolve();
+    });
+    expect(screen.getByText('Contoso · Development')).toBeTruthy();
+  });
+
   it('registers one host event listener for the whole app and removes it on unmount', async () => {
```

- [x] **A4. Run the new tests with the implementation still absent**

```powershell
npm test -- src/test/gatedHost.test.ts src/app/ConnectionProvider.test.tsx src/app/shell/connectionLabel.test.ts src/app/App.test.tsx
```

Expected: exit 1; `Test Files  4 failed (4)`, `Tests  5 failed | 6 passed (11)`. The three new or rewritten suites fail to load (`Failed to resolve import "./gatedHost"`, `"@/test/gatedHost"`); the five `connectionStateLabel` cases fail with `TypeError: connectionStateLabel is not a function`; the 6 passing tests are the existing `connectionLabel` cases.

### Phase A2 — Implementation

- [x] **A5. Create `src/test/gatedHost.ts`**

```typescript
import type { FakeHostControls } from '@/services/pptb/fakeHost';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import { HostCallError } from '@/services/pptb/hostErrors';

type FakeHost = PptbHost & FakeHostControls;

/** `ok` answers at once, `reject` fails the way the adapter does, `hold` parks each read until the test settles it. */
export type ConnectionReadMode = 'ok' | 'reject' | 'hold';

type ParkedRead = {
  resolve: (value: Connection | null) => void;
  reject: (error: Error) => void;
};

export type DataReadStats = { started: number; inFlight: number; peak: number };

/**
 * A test-only wrapper around the fake host. The fake answers every call after one microtask and its
 * `getActiveConnection` cannot fail, so it cannot show a refresh that rejects or a scan that is still
 * running. This wrapper adds both without changing `src/services/pptb/`.
 */
export type GatedHost = FakeHost & {
  setConnectionRead(mode: ConnectionReadMode): void;
  /** How many `getActiveConnection` reads have been parked in `hold` mode so far. */
  readonly parkedConnectionReads: number;
  settleConnectionRead(index: number, value: Connection | null): void;
  rejectConnectionRead(index: number): void;
  /**
   * While true, `queryAll` and `downloadFileColumn` park until the flag is turned off or their signal aborts.
   * With `ignoreAbort` a parked read keeps waiting after its signal fires, as an adapter call already in flight
   * does (the adapter cannot interrupt a `queryData` in progress); only turning the hold off or `releaseHeldDataReads` releases it.
   */
  holdDataReads(hold: boolean, options?: { ignoreAbort?: boolean }): void;
  /** Releases the oldest `count` parked data reads and keeps the hold on, so a test can settle reads one at a time. */
  releaseHeldDataReads(count: number): void;
  readonly dataReads: DataReadStats;
};

export function gateHost(base: FakeHost): GatedHost {
  let mode: ConnectionReadMode = 'ok';
  let hold = false;
  let ignoreAbort = false;
  const parked: ParkedRead[] = [];
  const waiting = new Set<() => void>();
  const stats: DataReadStats = { started: 0, inFlight: 0, peak: 0 };

  async function gated<T>(signal: AbortSignal | undefined, work: () => Promise<T>): Promise<T> {
    stats.started += 1;
    stats.inFlight += 1;
    stats.peak = Math.max(stats.peak, stats.inFlight);
    try {
      if (hold) {
        const honourAbort = !ignoreAbort;
        await new Promise<void>((resolve, reject) => {
          const release = (): void => {
            signal?.removeEventListener('abort', cancel);
            waiting.delete(release);
            resolve();
          };
          const cancel = (): void => {
            waiting.delete(release);
            reject(new DOMException('Scan cancelled.', 'AbortError'));
          };
          if (honourAbort && signal?.aborted === true) {
            cancel();
            return;
          }
          waiting.add(release);
          if (honourAbort) signal?.addEventListener('abort', cancel, { once: true });
        });
      }
      return await work();
    } finally {
      stats.inFlight -= 1;
    }
  }

  return {
    ...base,
    getActiveConnection: () => {
      const answer = base.getActiveConnection();
      if (mode === 'ok') return answer;
      if (mode === 'reject') {
        return answer.then(() =>
          Promise.reject(new HostCallError('Host call failed: getActiveConnection.')),
        );
      }
      return new Promise<Connection | null>((resolve, reject) => {
        parked.push({ resolve, reject });
      });
    },
    queryAll: (query, signal) => gated(signal, () => base.queryAll(query, signal)),
    downloadFileColumn: (ref, signal) =>
      gated(signal, () => base.downloadFileColumn(ref, signal)),
    setConnectionRead: (next) => {
      mode = next;
    },
    get parkedConnectionReads() {
      return parked.length;
    },
    settleConnectionRead: (index, value) => {
      parked[index]?.resolve(value);
    },
    rejectConnectionRead: (index) => {
      parked[index]?.reject(new HostCallError('Host call failed: getActiveConnection.'));
    },
    holdDataReads: (next, options) => {
      hold = next;
      ignoreAbort = next && options?.ignoreAbort === true;
      if (!hold) for (const release of [...waiting]) release();
    },
    releaseHeldDataReads: (count) => {
      for (const release of [...waiting].slice(0, count)) release();
    },
    get dataReads() {
      return stats;
    },
  };
}
```

- [x] **A6. Edit existing code**

In `src/app/useActiveConnection.ts`:

```diff
 import { createContext, use } from 'react';
 import type { Connection } from '@/services/pptb/host.types';
 
-export const ConnectionContext = createContext<Connection | null>(null);
-
-export function useActiveConnection(): Connection | null {
-  return use(ConnectionContext);
+/**
+ * What the app knows about the active connection. `refreshFailed` is the outcome of the latest refresh and is
+ * separate from the confirmed identity: a rejected refresh keeps the last confirmed state (WR-005), and
+ * `unknown` means no read has succeeded yet (still pending, or every read so far rejected).
+ */
+export type ConnectionState =
+  | { status: 'unknown'; refreshFailed: boolean }
+  | { status: 'disconnected'; refreshFailed: boolean }
+  | { status: 'connected'; connection: Connection; refreshFailed: boolean };
+
+export const INITIAL_CONNECTION_STATE: ConnectionState = { status: 'unknown', refreshFailed: false };
+
+export const ConnectionContext = createContext<ConnectionState>(INITIAL_CONNECTION_STATE);
+
+/**
+ * The provider's second context (S-06): `refresh` re-reads the active connection on demand (the Retry button,
+ * D-05) and `pending` is true while a read is in flight.
+ */
+export type ConnectionRefresh = {
+  readonly refresh: () => void;
+  readonly pending: boolean;
+};
+
+export const INITIAL_CONNECTION_REFRESH: ConnectionRefresh = {
+  refresh: () => undefined,
+  pending: false,
+};
+
+export const ConnectionRefreshContext = createContext<ConnectionRefresh>(INITIAL_CONNECTION_REFRESH);
+
+/** The identity AC-7.6 compares: the connection id and URL. Names and environment labels are display context. */
+export function connectionKey(connection: Connection): string {
+  return `${connection.id}\n${connection.url}`;
+}
+
+export function useConnectionState(): ConnectionState {
+  return use(ConnectionContext);
+}
+
+export function useRefreshConnection(): ConnectionRefresh {
+  return use(ConnectionRefreshContext);
+}
+
+/** The confirmed active connection, or null when none is confirmed (disconnected or still unknown). */
+export function useActiveConnection(): Connection | null {
+  const state = use(ConnectionContext);
+  return state.status === 'connected' ? state.connection : null;
 }
```

In `src/app/ConnectionProvider.tsx`:

```diff
-import { useEffect, useState } from 'react';
-import type { ReactElement, ReactNode } from 'react';
-import { useHost } from '@/app/HostContext';
-import { ConnectionContext } from '@/app/useActiveConnection';
-import type { Connection } from '@/services/pptb/host.types';
-
-export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
-  const host = useHost();
-  const [connection, setConnection] = useState<Connection | null>(null);
-
-  useEffect(() => {
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
-    const unsubscribe = host.onEvent((event) => {
-      if (event.kind === 'connection-changed') load();
-    });
-    return () => {
-      latest += 1;
-      unsubscribe();
-    };
-  }, [host]);
-
-  return <ConnectionContext value={connection}>{children}</ConnectionContext>;
+import { useEffect, useRef, useState } from 'react';
+import type { ReactElement, ReactNode } from 'react';
+import { useHost } from '@/app/HostContext';
+import {
+  ConnectionContext,
+  ConnectionRefreshContext,
+  INITIAL_CONNECTION_STATE,
+} from '@/app/useActiveConnection';
+import type { ConnectionRefresh, ConnectionState } from '@/app/useActiveConnection';
+
+/**
+ * Owns the last confirmed active connection (AC-7.6, WR-005). A successful read, including a successful
+ * null, replaces it. A rejected read keeps it and only flags the failure, so a transient error is never
+ * shown as "Not connected" and never invalidates results. It re-reads on every connection event, on window
+ * focus, when the document becomes visible and when the page asks it to (Retry, D-05).
+ */
+export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
+  const host = useHost();
+  const [state, setState] = useState<ConnectionState>(INITIAL_CONNECTION_STATE);
+  const [pending, setPending] = useState(false);
+  // The effect below owns `load`; Retry reaches it through this ref, so the host is subscribed exactly once.
+  const reload = useRef<() => void>(() => undefined);
+
+  useEffect(() => {
+    let latest = 0;
+    const load = (): void => {
+      latest += 1;
+      const request = latest;
+      setPending(true);
+      host.getActiveConnection().then(
+        (value) => {
+          if (request !== latest) return;
+          setPending(false);
+          setState(
+            value === null
+              ? { status: 'disconnected', refreshFailed: false }
+              : { status: 'connected', connection: value, refreshFailed: false },
+          );
+        },
+        () => {
+          // The host could not say (the adapter has logged it): keep what was confirmed and note the failure.
+          if (request !== latest) return;
+          setPending(false);
+          setState((current) => ({ ...current, refreshFailed: true }));
+        },
+      );
+    };
+    const retry = (): void => {
+      load();
+    };
+    const onVisibility = (): void => {
+      if (document.visibilityState === 'visible') load();
+    };
+    reload.current = retry;
+    load();
+    const unsubscribe = host.onEvent((event) => {
+      if (event.kind === 'connection-changed') load();
+    });
+    window.addEventListener('focus', retry);
+    document.addEventListener('visibilitychange', onVisibility);
+    return () => {
+      latest += 1;
+      reload.current = () => undefined;
+      unsubscribe();
+      window.removeEventListener('focus', retry);
+      document.removeEventListener('visibilitychange', onVisibility);
+    };
+  }, [host]);
+
+  const refresh: ConnectionRefresh = {
+    refresh: () => {
+      reload.current();
+    },
+    pending,
+  };
+
+  return (
+    <ConnectionContext value={state}>
+      <ConnectionRefreshContext value={refresh}>{children}</ConnectionRefreshContext>
+    </ConnectionContext>
+  );
 }
```

In `src/app/shell/connectionLabel.ts`:

```diff
+import type { ConnectionState } from '@/app/useActiveConnection';
 import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';
```

In `src/app/shell/connectionLabel.ts`:

```diff
   return c === null ? 'Not connected' : `${c.name} · ${ENVIRONMENT_TEXT[c.environment]}`;
 }
+
+/** "Not connected" is only for a confirmed disconnect; an unread connection is never called that (WR-005). */
+export function connectionStateLabel(state: ConnectionState): string {
+  switch (state.status) {
+    case 'connected':
+      return connectionLabel(state.connection);
+    case 'disconnected':
+      return connectionLabel(null);
+    case 'unknown':
+      return state.refreshFailed ? 'Connection unavailable' : 'Checking connection…';
+  }
+}
```

In `src/app/shell/TitleBar.tsx`:

```diff
-import { useActiveConnection } from '@/app/useActiveConnection';
-import { useView } from '@/app/useView';
-import { connectionLabel } from './connectionLabel';
+import { useConnectionState } from '@/app/useActiveConnection';
+import { useView } from '@/app/useView';
+import { connectionStateLabel } from './connectionLabel';
```

In `src/app/shell/TitleBar.tsx`:

```diff
-  const connection = useActiveConnection();
+  const connection = useConnectionState();
```

In `src/app/shell/TitleBar.tsx`:

```diff
-        <span>{connectionLabel(connection)}</span>
+        <span>{connectionStateLabel(connection)}</span>
```

- [x] **A7. Run the slice tests again**

```powershell
npm test -- src/test/gatedHost.test.ts src/app/ConnectionProvider.test.tsx src/app/shell/connectionLabel.test.ts src/app/App.test.tsx
```

Expected: exit 0; `Test Files  4 passed (4)`, `Tests  44 passed (44)`.

- [x] **A8. Type, lint and full-suite gates for this slice**

```powershell
npm run typecheck
npx --no-install eslint src/app src/test --max-warnings=0
npm test
```

Expected: `typecheck` and `eslint` exit 0 with no output; `npm test` exits 0 with `Test Files  106 passed (106)`, `Tests  1754 passed (1754)` (baseline 105 / 1727 plus 1 / 27).

- [x] **A9. Commit**

```powershell
git add -- src/test/gatedHost.test.ts src/app/ConnectionProvider.test.tsx src/test/gatedHost.ts src/app/shell/connectionLabel.test.ts src/app/App.test.tsx src/app/useActiveConnection.ts src/app/ConnectionProvider.tsx src/app/shell/connectionLabel.ts src/app/shell/TitleBar.tsx
git diff --cached --check
git commit -m "fix(app): keep the last confirmed connection when a refresh fails and recover on focus"
```

## Sub-slice B — App-scoped Inspector session and the title-bar site picker (CR-001, first half)

**Commit:** `feat(app): add the app-scoped Inspector session and the title-bar site picker`

### Phase B1 — Failing tests

- [x] **B1. Create `src/test/deferred.ts`**

```typescript
export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

/** A promise the test settles by hand, to hold an async step open while it checks what happens meanwhile. */
export function deferred<T>(): Deferred<T> {
  const holder: Pick<Deferred<T>, 'resolve' | 'reject'> = {
    resolve: () => undefined,
    reject: () => undefined,
  };
  const promise = new Promise<T>((resolve, reject) => {
    holder.resolve = resolve;
    holder.reject = reject;
  });
  return { promise, resolve: holder.resolve, reject: holder.reject };
}
```

- [x] **B2. Create `src/test/inspectorWorld.ts`**

```typescript
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeFailure, FakeResponder } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import type { SiteRef } from '@/types/inspector';
import { gateHost } from './gatedHost';
import type { GatedHost } from './gatedHost';

export const guid = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
export const fileId = (n: number): string => guid(0x1000 + n);

export const CONNECTION: Connection = {
  id: 'connection-1',
  name: 'Development',
  url: 'https://example.crm.dynamics.com',
  environment: 'Dev',
};
export const OTHER_CONNECTION: Connection = {
  id: 'connection-2',
  name: 'Fabrikam',
  url: 'https://fabrikam.crm.dynamics.com',
  environment: 'Dev',
};

export const SITE_ALPHA: SiteRef = {
  id: guid(1),
  name: 'Alpha portal',
  domain: 'alpha.example.com',
  active: true,
};
export const SITE_BETA: SiteRef = {
  id: guid(2),
  name: 'Beta portal',
  domain: 'beta.example.com',
  active: true,
};
export const SITE_RETIRED: SiteRef = {
  id: guid(3),
  name: 'Retired portal',
  domain: 'retired.example.com',
  active: false,
};

export const ROLE_STAFF = guid(0x11);
export const ROLE_ANONYMOUS = guid(0x12);
export const ROLE_AUTHENTICATED = guid(0x13);
export const PLAIN_CODE = 'function get() { return "{}"; }';
export const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';

type Row = Record<string, unknown>;

/** `code: null` means the host has no such file (404). */
export type WorldFile = {
  n: number;
  /** Defaults to `handler-NN`. */
  name?: string;
  roleIds?: readonly string[];
  statecode?: number;
  code?: string | null;
};
export type WorldSite = { ref: SiteRef; files: readonly WorldFile[] };
export type World = {
  sites: readonly WorldSite[];
  failures?: readonly FakeFailure[];
};

/**
 * Alpha has a configured file and a file that an anonymous role can call (Needs review); Beta has one
 * configured file; the retired site is inactive.
 */
export const DEFAULT_WORLD: World = {
  sites: [
    {
      ref: SITE_ALPHA,
      files: [
        { n: 1, roleIds: [ROLE_STAFF], code: PLAIN_CODE },
        { n: 2, roleIds: [ROLE_ANONYMOUS], code: HTTP_CODE },
      ],
    },
    { ref: SITE_BETA, files: [{ n: 11, roleIds: [ROLE_STAFF], code: PLAIN_CODE }] },
    { ref: SITE_RETIRED, files: [] },
  ],
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

const logicRow = (file: WorldFile): Row =>
  component(
    35,
    fileId(file.n),
    file.name ?? `handler-${String(file.n).padStart(2, '0')}`,
    { adx_serverlogic_adx_webrole: file.roleIds ?? [ROLE_STAFF] },
    file.statecode ?? 0,
  );

const ROLES: readonly Row[] = [
  component(11, ROLE_STAFF, 'staff', {}),
  component(11, ROLE_ANONYMOUS, 'anonymous', {
    anonymoususersrole: true,
    authenticatedusersrole: false,
  }),
  component(11, ROLE_AUTHENTICATED, 'authenticated', {
    anonymoususersrole: false,
    authenticatedusersrole: true,
  }),
];
const PERMISSIONS: readonly Row[] = [
  component(18, guid(0x21), 'contact-read', {
    scope: 756150001,
    entitylogicalname: 'contact',
    read: true,
    adx_entitypermission_webrole: [ROLE_STAFF],
  }),
];

const COMPONENT_FILTER = /_powerpagesiteid_value eq (\S+) and powerpagecomponenttype eq (\d+)/;

/** The fake ignores `$select` and `$filter`, so this responder applies the two filters the reader writes. */
export function createInspectorHost(
  world: World = DEFAULT_WORLD,
  connection: Connection | null = CONNECTION,
): GatedHost {
  const responder: FakeResponder = (query) => {
    if (query.entitySet !== 'powerpagecomponents') return undefined;
    const match = COMPONENT_FILTER.exec(query.filter ?? '');
    const site = world.sites.find((candidate) => candidate.ref.id === match?.[1]);
    switch (Number(match?.[2])) {
      case 35:
        return site?.files.map(logicRow) ?? [];
      case 11:
        return ROLES;
      case 18:
        return PERMISSIONS;
      default:
        return [];
    }
  };
  const fileColumns = Object.fromEntries(
    world.sites.flatMap((site) =>
      site.files
        .filter((file) => file.code !== null)
        .map((file): [string, string] => [
          `powerpagecomponent/${fileId(file.n)}/filecontent`,
          file.code ?? PLAIN_CODE,
        ]),
    ),
  );
  return gateHost(
    createFakeHost({
      connection,
      tables: {
        powerpagesites: world.sites.map((site) => ({
          powerpagesiteid: site.ref.id,
          name: site.ref.name,
          primarydomainname: site.ref.domain,
          statecode: site.ref.active ? 0 : 1,
        })),
      },
      responders: [responder],
      fileColumns,
      failures: world.failures ?? [],
    }),
  );
}
```

- [x] **B3. Create `src/app/inspector-site/inspectorTestHarness.tsx`**

```tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { ViewContext } from '@/app/useView';
import { createInspectorHost } from '@/test/inspectorWorld';
import type { GatedHost } from '@/test/gatedHost';
import { INSPECTOR_DEPS } from './inspectorDeps';
import type { InspectorDeps } from './inspectorDeps';
import { InspectorSessionProvider } from './InspectorSessionProvider';

export type InspectorHarnessOptions = {
  host?: GatedHost;
  deps?: InspectorDeps;
  /** Render under StrictMode, as main.tsx does, to run every effect twice. */
  strict?: boolean;
};

/**
 * Renders `ui` inside the same provider chain as the app (host, notifications, connection, view, Inspector
 * session) but without the other pages. Tests drive the fake host; never import this from app code.
 */
export function renderInspector(ui: ReactElement, options: InspectorHarnessOptions = {}) {
  const host = options.host ?? createInspectorHost();
  const user = userEvent.setup();
  const tree = (
    <HostContext value={host}>
      <NotifyProvider>
        <ConnectionProvider>
          <ViewContext value={['inspector', () => undefined]}>
            <InspectorSessionProvider deps={options.deps ?? INSPECTOR_DEPS}>
              {ui}
            </InspectorSessionProvider>
          </ViewContext>
        </ConnectionProvider>
      </NotifyProvider>
    </HostContext>
  );
  const view = render(options.strict === true ? <StrictMode>{tree}</StrictMode> : tree);
  return { host, user, ...view };
}
```

- [x] **B3a. Add two tests to `src/features/inspector/scan/scan.test.ts`** (S-02: `runScan` settles only after every read has settled)

In `src/features/inspector/scan/scan.test.ts`, inside `describe('runScan cancellation and concurrency')`, after the test "never has more than four reads in flight":

```diff
     expect(gate.stats.fileStarts).toHaveLength(12);
     expect(facts.files.every((file) => file.code.ok)).toBe(true);
   });
+
+  it('does not settle after an abort until every query already in flight has settled', async () => {
+    const controller = new AbortController();
+    const gate = gated(createWorld(HAPPY), { holdQueries: true });
+    const result = scan(gate.host, { signal: controller.signal });
+    const state = { settled: false };
+    const outcome = result.then(
+      () => {
+        state.settled = true;
+      },
+      () => {
+        state.settled = true;
+      },
+    );
+    await vi.waitFor(
+      () => {
+        expect(gate.holds).toHaveLength(4);
+      },
+      { interval: 1 },
+    );
+    controller.abort();
+    gate.holds.splice(0, 1)[0]?.release();
+    await flush();
+    expect(state.settled).toBe(false);
+    expect(gate.stats.inFlight).toBe(3);
+    gate.releaseAll();
+    await outcome;
+    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
+    expect(gate.stats.inFlight).toBe(0);
+  });
+
+  it('does not settle after an abort until every download already in flight has settled', async () => {
+    const controller = new AbortController();
+    const gate = gated(createWorld({ ...HAPPY, logic: specs(4) }), { holdFiles: true });
+    const result = scan(gate.host, { signal: controller.signal });
+    const state = { settled: false };
+    const outcome = result.then(
+      () => {
+        state.settled = true;
+      },
+      () => {
+        state.settled = true;
+      },
+    );
+    await vi.waitFor(
+      () => {
+        expect(gate.holds).toHaveLength(4);
+      },
+      { interval: 1 },
+    );
+    controller.abort();
+    gate.holds.splice(0, 1)[0]?.release();
+    await flush();
+    expect(state.settled).toBe(false);
+    expect(gate.stats.inFlight).toBe(3);
+    gate.releaseAll();
+    await outcome;
+    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
+    expect(gate.stats.inFlight).toBe(0);
+  });
 });
 
 type Hold = { key: string; release: () => void };
```

- [x] **B4. Create `src/app/inspector-site/inspectorSession.test.ts`**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionKey } from '@/app/useActiveConnection';
import { siteFacts } from '@/features/inspector/model/fixtures';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import type { Connection } from '@/services/pptb/host.types';
import { deferred } from '@/test/deferred';
import type { GatedHost } from '@/test/gatedHost';
import {
  CONNECTION,
  createInspectorHost,
  guid,
  OTHER_CONNECTION,
  SITE_ALPHA,
  SITE_BETA,
  SITE_RETIRED,
} from '@/test/inspectorWorld';
import type { ReviewKey, SiteFacts, SiteRef } from '@/types/inspector';
import { INSPECTOR_DEPS } from './inspectorDeps';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorStore } from './inspectorSession';
import type { InspectorSnapshot } from './inspectorSession.types';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function setup(host: GatedHost = createInspectorHost(), deps: InspectorDeps = INSPECTOR_DEPS) {
  const store = createInspectorStore(host, deps);
  const seen: InspectorSnapshot[] = [];
  store.subscribe(() => {
    seen.push(store.getSnapshot());
  });
  const snap = () => store.getSnapshot();
  return { host, store, seen, snap };
}

const until = (check: () => boolean) =>
  vi.waitFor(() => {
    expect(check()).toBe(true);
  });

const MARK: ReviewKey = `${guid(0x1001)}:webRole`;
const componentReads = (host: GatedHost) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');
const siteListReads = (host: GatedHost) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagesites');

describe('site list', () => {
  it('loads the sites of an adopted connection and selects nothing, even for a single site', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => snap().sites.status === 'ok');
    expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_ALPHA] });
    expect(snap().scan).toEqual({ status: 'none' });
    expect(snap().ownerKey).toBe(connectionKey(CONNECTION));
    expect(componentReads(host)).toHaveLength(0);
  });

  it('keeps the list idle, and reads nothing, for a confirmed disconnect', () => {
    const { host, store, snap } = setup();
    store.adopt(null);
    expect(snap()).toMatchObject({ ownerKey: null, connection: null, sites: { status: 'idle' } });
    expect(host.callsOf('queryAll')).toHaveLength(0);
  });

  it('reports a failed read with its reason, and Retry reloads it', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503, times: 1 }],
    });
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'error');
    expect(snap().sites).toEqual({
      status: 'error',
      message: 'The server had a problem. Please try again later.',
    });
    store.retrySites();
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => snap().sites.status === 'ok');
  });

  it('ignores Retry unless the list failed', async () => {
    const { host, store, snap } = setup();
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.retrySites();
    expect(siteListReads(host)).toHaveLength(1);
  });

  it('discards the answer to a list read that a newer connection superseded', async () => {
    const first = deferred<readonly [typeof SITE_ALPHA]>();
    const second = deferred<readonly [typeof SITE_BETA]>();
    const calls = [first, second];
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => calls.shift()?.promise ?? Promise.reject(new Error('unexpected read')),
    };
    const { store, seen, snap } = setup(createInspectorHost(), deps);
    store.adopt(CONNECTION);
    await until(() => calls.length === 1);
    store.adopt(OTHER_CONNECTION);
    first.resolve([SITE_ALPHA]);
    await until(() => calls.length === 0);
    second.resolve([SITE_BETA]);
    await until(() => snap().sites.status === 'ok');
    expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_BETA] });
    expect(JSON.stringify(seen)).not.toContain(SITE_ALPHA.id);
  });
});

describe('scan', () => {
  async function ready(host = createInspectorHost()) {
    const context = setup(host);
    context.store.adopt(CONNECTION);
    await until(() => context.snap().sites.status === 'ok');
    return context;
  }

  it('scans an active site with the real reader and keeps its facts', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_ALPHA, progress: null });
    await until(() => snap().scan.status === 'done');
    const { scan } = snap();
    if (scan.status !== 'done') throw new Error('expected a finished scan');
    expect(scan.facts.scanId).toMatch(new RegExp(`^connection-1:${SITE_ALPHA.id}:\\d+$`));
    expect(scan.facts.files.map((file) => file.name)).toEqual(['handler-01', 'handler-02']);
    expect(snap().fileId).toBeNull();
  });

  it('does not scan an inactive site or one that is not in the list', async () => {
    const { host, store, snap } = await ready();
    store.selectSite(SITE_RETIRED);
    store.selectSite({ ...SITE_ALPHA, id: guid(99) });
    expect(snap().scan).toEqual({ status: 'none' });
    expect(componentReads(host)).toHaveLength(0);
  });

  it('publishes progress while a scan runs', async () => {
    const finish = deferred<SiteFacts>();
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: (_host, _connection, _site, _scanId, onProgress) => {
        onProgress({ scanned: 1, total: 3, inventoryComplete: false });
        return finish.promise;
      },
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => {
      const { scan } = snap();
      return scan.status === 'scanning' && scan.progress !== null;
    });
    expect(snap().scan).toMatchObject({
      progress: { scanned: 1, total: 3, inventoryComplete: false },
    });
    finish.resolve(siteFacts());
    await until(() => snap().scan.status === 'done');
  });

  it('replaces the results, the file selection and the marks on a rescan', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.selectFile(guid(0x1002));
    store.setReviewed(MARK, true);
    const generation = snap().generation;
    store.rescan();
    expect(snap().scan.status).toBe('scanning');
    expect(snap()).toMatchObject({ fileId: null });
    expect(snap().marks.size).toBe(0);
    expect(snap().generation).toBeGreaterThan(generation);
    await until(() => snap().scan.status === 'done');
  });

  it('replaces the results and marks when a different site is selected', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.setReviewed(MARK, true);
    store.selectSite(SITE_BETA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    expect(snap().marks.size).toBe(0);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
  });

  it('adds and removes review marks only once there are results, and counts each change', async () => {
    const { store, snap } = await ready();
    store.setReviewed(MARK, true);
    store.selectFile('x');
    expect(snap().marks.size).toBe(0);
    expect(snap().fileId).toBeNull();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    const generation = snap().generation;
    store.setReviewed(MARK, true);
    expect(snap().marks.has(MARK)).toBe(true);
    expect(snap().generation).toBe(generation + 1);
    store.setReviewed(MARK, false);
    expect(snap().marks.size).toBe(0);
    store.selectFile(guid(0x1002));
    expect(snap().fileId).toBe(guid(0x1002));
  });

  it('shows a scan that fails as failed, and a rescan can recover', async () => {
    let fail = true;
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(siteFacts())),
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'failed');
    expect(snap().scan).toEqual({ status: 'failed', site: SITE_ALPHA });
    fail = false;
    store.rescan();
    await until(() => snap().scan.status === 'done');
  });

  it('drops the facts of a scan that finds the connection changed, and says so (ScanAbandonedError, D-14)', async () => {
    const { host, store, seen, snap } = await ready();
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'connection-changed');
    expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
    expect(seen.some((entry) => entry.scan.status === 'done')).toBe(false);
    expect(snap().ownerKey).toBe(connectionKey(CONNECTION));
    expect(snap().fileId).toBeNull();
    expect(snap().marks.size).toBe(0);
  });

  it('maps ScanAbandonedError from the reader to the connection-changed state, not a failure', async () => {
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: () => Promise.reject(new ScanAbandonedError()),
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'connection-changed' && snap().generation > 2);
    expect(console.error).not.toHaveBeenCalled();
  });

  describe('after the connection changed under a scan (D-14)', () => {
    async function abandoned() {
      const context = setup(createInspectorHost(), {
        ...INSPECTOR_DEPS,
        runScan: () => Promise.reject(new ScanAbandonedError()),
      });
      context.store.adopt(CONNECTION);
      await until(() => context.snap().sites.status === 'ok');
      context.store.selectSite(SITE_ALPHA);
      await until(() => context.snap().scan.status === 'connection-changed');
      return context;
    }

    it('ignores rescan, so no Scan again is offered', async () => {
      const { host, store, snap } = await abandoned();
      store.rescan();
      store.selectFile(guid(0x1001));
      store.setReviewed(MARK, true);
      expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
      expect(snap().fileId).toBeNull();
      expect(snap().marks.size).toBe(0);
      expect(componentReads(host)).toHaveLength(0);
    });

    it('keeps the message through a same-identity re-read (the accepted consequence)', async () => {
      const { store, snap } = await abandoned();
      store.adopt({ ...CONNECTION, name: 'Renamed' });
      expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
      expect(snap().connection?.name).toBe('Renamed');
    });

    it('leaves the state when the new identity is adopted', async () => {
      const { store, snap } = await abandoned();
      store.adopt(OTHER_CONNECTION);
      expect(snap().scan).toEqual({ status: 'none' });
      expect(snap().sites).toEqual({ status: 'loading' });
    });

    it('leaves the state when a site is chosen', async () => {
      const { store, snap } = await abandoned();
      store.selectSite(SITE_BETA);
      expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    });
  });
});

describe('site list loads (D-16 A)', () => {
  /** `listSites` answers from a queue of deferreds, so a test controls each read. */
  function queued() {
    const reads: ReturnType<typeof deferred<readonly SiteRef[]>>[] = [];
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => {
        const read = deferred<readonly SiteRef[]>();
        reads.push(read);
        return read.promise;
      },
    };
    return { deps, reads };
  }

  async function listed(host = createInspectorHost()) {
    const { deps, reads } = queued();
    const context = setup(host, deps);
    context.store.adopt(CONNECTION);
    await until(() => reads.length === 1);
    reads[0]?.resolve([SITE_ALPHA, SITE_BETA]);
    await until(() => context.snap().sites.status === 'ok');
    return { ...context, reads };
  }

  it('does not reload for a same-identity adopt, however often the connection is re-read', async () => {
    const { store, snap, reads } = await listed();
    const before = snap();
    store.adopt({ ...CONNECTION });
    store.adopt({ ...CONNECTION, name: 'Renamed' });
    store.adopt({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await Promise.resolve();
    expect(reads).toHaveLength(1);
    expect(snap().sites).toBe(before.sites);
    expect(snap().connection).toMatchObject({ name: 'Renamed', environment: 'Production' });
  });

  it('leaves results, marks, the selection and a running scan alone for a same-identity adopt', async () => {
    const host = createInspectorHost();
    const { store, snap, reads } = await listed(host);
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.selectFile(guid(0x1002));
    store.setReviewed(MARK, true);
    const before = snap();
    store.adopt({ ...CONNECTION, name: 'Renamed' });
    await Promise.resolve();
    expect(reads).toHaveLength(1);
    expect(snap().scan).toBe(before.scan);
    expect(snap().marks).toBe(before.marks);
    expect(snap().fileId).toBe(before.fileId);
    expect(snap().generation).toBe(before.generation);
  });

  it('reloads a failed list in the open on Retry', async () => {
    const { deps, reads } = queued();
    const { store, snap } = setup(createInspectorHost(), deps);
    store.adopt(CONNECTION);
    await until(() => reads.length === 1);
    reads[0]?.reject(new Error('boom'));
    await until(() => snap().sites.status === 'error');
    store.retrySites();
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => reads.length === 2);
    reads[1]?.resolve([SITE_ALPHA]);
    await until(() => snap().sites.status === 'ok');
  });
});

describe('connection identity (AC-7.6)', () => {
  async function scanned() {
    const context = setup();
    context.store.adopt(CONNECTION);
    await until(() => context.snap().sites.status === 'ok');
    context.store.selectSite(SITE_ALPHA);
    await until(() => context.snap().scan.status === 'done');
    context.store.selectFile(guid(0x1002));
    context.store.setReviewed(MARK, true);
    return context;
  }

  it('keeps results and marks for a rename or relabel with the same id and URL', async () => {
    const { host, store, snap } = await scanned();
    const before = snap();
    store.adopt({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    expect(snap().connection).toMatchObject({ name: 'Renamed', environment: 'Production' });
    expect(snap().scan).toBe(before.scan);
    expect(snap().marks).toBe(before.marks);
    expect(snap().fileId).toBe(before.fileId);
    expect(snap().sites).toBe(before.sites);
    expect(siteListReads(host)).toHaveLength(1);
  });

  it.each<[string, Connection | null]>([
    ['a different id', { ...CONNECTION, id: 'connection-9' }],
    ['a different URL', { ...CONNECTION, url: 'https://other.crm.dynamics.com' }],
    ['a successful null', null],
  ])('discards results, marks and the file selection for %s', async (_name, next) => {
    const { host, store, snap } = await scanned();
    const generation = snap().generation;
    store.adopt(next);
    expect(snap().scan).toEqual({ status: 'none' });
    expect(snap().marks.size).toBe(0);
    expect(snap().fileId).toBeNull();
    expect(snap().generation).toBeGreaterThan(generation);
    if (next === null) {
      expect(snap().sites).toEqual({ status: 'idle' });
    } else {
      await until(() => snap().sites.status === 'ok');
      expect(siteListReads(host)).toHaveLength(2);
    }
  });
});

describe('switching away during a delayed scan', () => {
  it('aborts the old scan and never starts new reads until the old ones settled (four at most)', async () => {
    const host = createInspectorHost();
    const { store, seen, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.adopt(OTHER_CONNECTION);
    expect(snap()).toMatchObject({ scan: { status: 'none' }, sites: { status: 'loading' } });
    await until(() => host.dataReads.inFlight === 1);
    host.holdDataReads(false);
    await until(() => snap().sites.status === 'ok');
    expect(host.dataReads.peak).toBe(4);
    expect(seen.some((entry) => entry.scan.status === 'done')).toBe(false);
    expect(snap().ownerKey).toBe(connectionKey(OTHER_CONNECTION));
  });

  it('shows only the newer site when a different site is selected mid-scan', async () => {
    const host = createInspectorHost();
    const { store, seen, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.selectSite(SITE_BETA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
    expect(
      seen.filter((entry) => entry.scan.status === 'done').every((entry) => entry.scan.status === 'done' && entry.scan.site.id === SITE_BETA.id),
    ).toBe(true);
    expect(componentReads(host).every((call) => call.query.filter?.includes(SITE_BETA.id))).toBe(
      true,
    );
    expect(host.dataReads.peak).toBe(4);
  });

  it('keeps at most four reads in flight across generations when the host ignores abort', async () => {
    const host = createInspectorHost();
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true, { ignoreAbort: true });
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.selectSite(SITE_BETA);
    host.releaseHeldDataReads(1);
    await until(() => host.dataReads.inFlight === 3);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(host.dataReads.inFlight).toBe(3);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
    expect(host.dataReads.peak).toBeLessThanOrEqual(4);
  });

  it('stop() aborts the scan, forgets everything and can adopt again (StrictMode remount)', async () => {
    const host = createInspectorHost();
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.stop();
    expect(snap()).toMatchObject({ ownerKey: undefined, scan: { status: 'none' } });
    host.holdDataReads(false);
    await until(() => host.dataReads.inFlight === 0);
    expect(snap().scan).toEqual({ status: 'none' });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
  });
});
```

- [x] **B5. Create `src/app/inspector-site/InspectorSessionProvider.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteRef } from '@/types/inspector';
import { CONNECTION, createInspectorHost, OTHER_CONNECTION, SITE_ALPHA, SITE_BETA } from '@/test/inspectorWorld';
import { INSPECTOR_DEPS } from './inspectorDeps';
import { renderInspector } from './inspectorTestHarness';
import { useInspector } from './useInspector';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Records `connection|sites|scan` for every commit, so a test can see what any render showed. */
function Probe({ log }: { log: string[] }): ReactElement {
  const session = useInspector();
  const line = `${session.connection?.name ?? '-'}|${session.sites.status}|${session.scan.status}`;
  useEffect(() => {
    log.push(line);
  });
  const first = session.sites.status === 'ok' ? session.sites.sites[0] : undefined;
  return (
    <div>
      <p>{`sites:${session.sites.status}`}</p>
      <p>{`listed:${session.sites.status === 'ok' ? session.sites.sites.map((site) => site.name).join(',') : '-'}`}</p>
      <p>{`selected:${session.selectedSite?.name ?? 'none'}`}</p>
      <p>{`scan:${session.scan.status}`}</p>
      <p>{`connection:${session.connection?.name ?? 'none'}`}</p>
      <p>{`marks:${String(session.marks.size)}`}</p>
      <button
        type="button"
        onClick={() => {
          if (first !== undefined) session.selectSite(first);
        }}
      >
        scan first
      </button>
      <button
        type="button"
        onClick={() => {
          session.setReviewed('file-1:webRole', true);
        }}
      >
        mark
      </button>
    </div>
  );
}

async function scanFirst(user: ReturnType<typeof renderInspector>['user']) {
  await screen.findByText('sites:ok');
  await user.click(screen.getByRole('button', { name: 'scan first' }));
  await screen.findByText('scan:done');
  await user.click(screen.getByRole('button', { name: 'mark' }));
  await screen.findByText('marks:1');
}

async function changeConnection(
  host: ReturnType<typeof createInspectorHost>,
  next: typeof CONNECTION | null,
) {
  host.setConnection(next);
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('InspectorSessionProvider', () => {
  it('adopts the confirmed connection, loads its sites and selects nothing', async () => {
    renderInspector(<Probe log={[]} />);
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(await screen.findByText('sites:ok')).toBeTruthy();
    expect(screen.getByText('scan:none')).toBeTruthy();
    expect(screen.getByText('connection:Development')).toBeTruthy();
  });

  it('adds no host subscription of its own', async () => {
    const { host } = renderInspector(<Probe log={[]} />);
    await screen.findByText('sites:ok');
    expect(host.listenerCount()).toBe(1);
  });

  it('keeps results, marks and the site list when a connection event only renames the connection (D-16 A)', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    await changeConnection(host, { ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await screen.findByText('connection:Renamed');
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(1);
  });

  it('clears results and marks for a changed connection without ever rendering them for the new one', async () => {
    const log: string[] = [];
    const { host, user } = renderInspector(<Probe log={log} />);
    await scanFirst(user);
    const before = log.length;
    await changeConnection(host, OTHER_CONNECTION);
    await screen.findByText('connection:Fabrikam');
    await screen.findByText('sites:ok');
    expect(screen.getByText('scan:none')).toBeTruthy();
    expect(screen.getByText('marks:0')).toBeTruthy();
    expect(log.slice(before).some((line) => line.endsWith('|done'))).toBe(false);
    expect(log.slice(before)).toContain('Fabrikam|loading|none');
  });

  it('clears results for a successful null connection', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    await changeConnection(host, null);
    await screen.findByText('scan:none');
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(screen.getByText('connection:none')).toBeTruthy();
  });

  it('keeps results through a rejected refresh and recovers on focus', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    host.setConnectionRead('reject');
    await changeConnection(host, CONNECTION);
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    host.setConnectionRead('ok');
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    await screen.findByText('connection:Fabrikam');
    expect(screen.getByText('scan:none')).toBeTruthy();
  });

  it('waits for the first confirmed connection before reading anything', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    renderInspector(<Probe log={[]} />, { host });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(host.callsOf('queryAll')).toHaveLength(0);
    host.settleConnectionRead(0, CONNECTION);
    expect(await screen.findByText('sites:ok')).toBeTruthy();
  });

  it('survives StrictMode double effects and still loads the sites', async () => {
    const { host } = renderInspector(<Probe log={[]} />, { strict: true });
    expect(await screen.findByText('sites:ok')).toBeTruthy();
    expect(host.listenerCount()).toBe(1);
  });

  it('aborts a running scan on unmount and ignores whatever arrives later', async () => {
    const host = createInspectorHost();
    const { unmount, user } = renderInspector(<Probe log={[]} />, { host });
    await screen.findByText('sites:ok');
    host.holdDataReads(true);
    await user.click(screen.getByRole('button', { name: 'scan first' }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    unmount();
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(0);
    });
    host.holdDataReads(false);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('InspectorSessionProvider: no site list reload for a same-identity event (D-16 A)', () => {
  /** `listSites` answers from a script of outcomes; the real reader is not involved. */
  function scripted(outcomes: readonly (readonly SiteRef[] | Error)[]) {
    const queue = [...outcomes];
    let calls = 0;
    return {
      deps: {
        ...INSPECTOR_DEPS,
        listSites: () => {
          calls += 1;
          const next = queue.shift();
          if (next === undefined) return Promise.reject(new Error('unexpected read'));
          return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        },
      },
      calls: () => calls,
    };
  }

  it('leaves the list, results and marks alone when an event confirms the same identity, or its re-read rejects', async () => {
    const script = scripted([[SITE_ALPHA, SITE_BETA]]);
    const { host, user } = renderInspector(<Probe log={[]} />, { deps: script.deps });
    await scanFirst(user);
    await changeConnection(host, { ...CONNECTION });
    host.setConnectionRead('reject');
    await changeConnection(host, { ...CONNECTION });
    host.setConnectionRead('ok');
    expect(screen.getByText('listed:Alpha portal,Beta portal')).toBeTruthy();
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    expect(screen.getByText('selected:Alpha portal')).toBeTruthy();
    expect(script.calls()).toBe(1);
    expect(host.listenerCount()).toBe(1);
    expect(host.callsOf('notify')).toHaveLength(0);
  });

  it('does not reload for a focus or visibility re-read', async () => {
    const script = scripted([[SITE_ALPHA, SITE_BETA]]);
    const { user } = renderInspector(<Probe log={[]} />, { deps: script.deps });
    await scanFirst(user);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(script.calls()).toBe(1);
    expect(screen.getByText('listed:Alpha portal,Beta portal')).toBeTruthy();
  });

  it('shows no site in the picker after the connection changed under a scan (D-14, S-08)', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />, { host: createInspectorHost() });
    await screen.findByText('sites:ok');
    host.holdDataReads(true);
    await user.click(screen.getByRole('button', { name: 'scan first' }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    expect(screen.getByText('selected:Alpha portal')).toBeTruthy();
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    expect(await screen.findByText('scan:connection-changed')).toBeTruthy();
    expect(screen.getByText('selected:none')).toBeTruthy();
  });
});
```

- [x] **B6. Create `src/app/shell/SiteCombobox.test.tsx`**

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteCombobox } from './SiteCombobox';
import type { SiteComboboxProps, SiteOption } from './SiteCombobox';

afterEach(cleanup);

const OPTIONS: readonly SiteOption[] = [
  { id: 'a', label: 'Alpha portal', detail: 'alpha.example.com', disabled: false },
  { id: 'r', label: 'Retired portal', detail: 'retired.example.com', disabled: true },
  { id: 'b', label: 'Beta portal', detail: 'beta.example.com', disabled: false },
];

function mount(props: Partial<SiteComboboxProps> = {}) {
  const onSelect = vi.fn<(id: string) => void>();
  const user = userEvent.setup();
  render(
    <SiteCombobox
      label="Power Pages site"
      placeholder="No site selected"
      options={OPTIONS}
      selectedId={null}
      unavailableReason={null}
      onSelect={onSelect}
      {...props}
    />,
  );
  const combobox = screen.getByRole('combobox', { name: 'Power Pages site' });
  return { onSelect, user, combobox };
}

const optionNamed = (name: RegExp) => screen.getByRole('option', { name });
const active = (combobox: HTMLElement) => combobox.getAttribute('aria-activedescendant');

describe('SiteCombobox (APG select-only combobox)', () => {
  it('starts collapsed with the placeholder, a listbox popup and nothing selected', async () => {
    const { combobox, user } = mount();
    expect(combobox.textContent).toBe('No site selected');
    expect(combobox.getAttribute('aria-haspopup')).toBe('listbox');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();
    combobox.focus();
    await user.keyboard('{Enter}');
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('aria-selected')).toBe('false');
    }
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
    ['Down Arrow', '{ArrowDown}'],
    ['Alt+Down Arrow', '{Alt>}{ArrowDown}{/Alt}'],
  ])('opens with %s', async (_name, keys) => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard(keys);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: 'Power Pages site' })).toBeTruthy();
    expect(combobox.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  });

  it('lists inactive sites disabled and labelled "Inactive", and highlights the first active one', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    const retired = optionNamed(/Retired portal/);
    expect(retired.getAttribute('aria-disabled')).toBe('true');
    expect(within(retired).getByText('Inactive')).toBeTruthy();
    expect(optionNamed(/Alpha portal/).getAttribute('aria-disabled')).toBeNull();
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
  });

  it('moves the highlight with arrows, Home and End, and never wraps', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    expect(active(combobox)).toBe(optionNamed(/Retired portal/).id);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
    await user.keyboard('{Home}');
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
    await user.keyboard('{ArrowUp}');
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
    await user.keyboard('{End}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it('opens on the last option with End', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{End}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
    ['Alt+Up Arrow', '{Alt>}{ArrowUp}{/Alt}'],
  ])('commits the highlighted active option with %s and closes', async (_name, keys) => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{End}');
    await user.keyboard(keys);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(combobox);
  });

  it('does not commit an inactive option, and stays open', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
  });

  it('commits on Tab only after the highlight was moved', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{Tab}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    combobox.focus();
    await user.keyboard('{Enter}{End}{Tab}');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('cancels with Escape and selects nothing', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{End}{Escape}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(combobox.textContent).toBe('No site selected');
  });

  it('moves the highlight by type-ahead, opening the list if needed', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('be');
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it('reaches an inactive option by type-ahead so it can be read', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('r');
    expect(active(combobox)).toBe(optionNamed(/Retired portal/).id);
  });

  it('commits an active option by click and ignores an inactive one', async () => {
    const { combobox, onSelect, user } = mount();
    await user.click(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    await user.click(optionNamed(/Retired portal/));
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    await user.click(optionNamed(/Beta portal/));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a press outside and on blur, without committing', async () => {
    const { combobox, onSelect, user } = mount();
    await user.click(combobox);
    fireEvent.pointerDown(document.body);
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    combobox.focus();
    await user.keyboard('{Enter}{End}');
    fireEvent.blur(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the selected site, opens on it and marks it selected', async () => {
    const { combobox, onSelect, user } = mount({ selectedId: 'b' });
    expect(combobox.textContent).toBe('Beta portal');
    expect(combobox.getAttribute('title')).toBe('Beta portal');
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(optionNamed(/Beta portal/).getAttribute('aria-selected')).toBe('true');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('is unavailable with a reason on focus: it does not open and explains itself', async () => {
    const { combobox, onSelect, user } = mount({ unavailableReason: 'Loading sites…' });
    expect(combobox.getAttribute('aria-disabled')).toBe('true');
    await user.click(combobox);
    await user.keyboard('{Enter}{ArrowDown}');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
    const reason = screen.getByRole('tooltip');
    expect(reason.textContent).toBe('Loading sites…');
    expect(combobox.getAttribute('aria-describedby')).toBe(reason.id);
  });

  it('stays closed when there are no options', async () => {
    const { combobox, user } = mount({ options: [] });
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SiteCombobox: a selection the options do not carry', () => {
  it('falls back to the placeholder (D-19 C clears such a selection in the store, so this is a guard)', () => {
    expect(mount({ selectedId: 'gone' }).combobox.textContent).toBe('No site selected');
  });
});
```

- [x] **B7. Create `src/app/shell/SitePill.test.tsx`**

```tsx
// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderInspector } from '@/app/inspector-site/inspectorTestHarness';
import {
  CONNECTION,
  createInspectorHost,
  SITE_ALPHA,
  SITE_BETA,
  SITE_RETIRED,
} from '@/test/inspectorWorld';
import { SitePill } from './SitePill';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const combobox = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const scanReads = (host: ReturnType<typeof createInspectorHost>) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');

async function ready() {
  const context = renderInspector(<SitePill />);
  await waitFor(() => {
    expect(combobox().getAttribute('aria-disabled')).toBeNull();
  });
  return context;
}

describe('SitePill (AC-1.2, AC-1.3, AC-7.2)', () => {
  it('is disabled and explains itself while no connection is active', async () => {
    renderInspector(<SitePill />, { host: createInspectorHost(undefined, null) });
    await waitFor(() => {
      expect(screen.getByText('Select a connection in Power Platform ToolBox first.')).toBeTruthy();
    });
    expect(screen.getByText('No site selected').getAttribute('aria-disabled')).toBe('true');
  });

  it('is disabled while the site list loads', async () => {
    const host = createInspectorHost();
    host.holdDataReads(true);
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(screen.getByText('Loading sites…')).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
    host.holdDataReads(false);
    await waitFor(() => {
      expect(combobox().getAttribute('aria-disabled')).toBeNull();
    });
  });

  it('is disabled with a reason when the site list cannot be read', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503 }],
    });
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(screen.getByText("Couldn't load sites. Open Logic Inspector to retry.")).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
  });

  it('is disabled when the environment has no sites', async () => {
    renderInspector(<SitePill />, { host: createInspectorHost({ sites: [] }) });
    await waitFor(() => {
      expect(screen.getByText('No Power Pages sites in this environment.')).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
  });

  it('offers active sites and lists inactive ones disabled, with nothing preselected', async () => {
    const { host, user } = await ready();
    expect(combobox().textContent).toBe('No site selected');
    await user.click(combobox());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(screen.getByRole('option', { name: /Alpha portal/ }).getAttribute('aria-disabled')).toBeNull();
    const retired = screen.getByRole('option', { name: /Retired portal/ });
    expect(retired.getAttribute('aria-disabled')).toBe('true');
    expect(within(retired).getByText('Inactive')).toBeTruthy();
    expect(scanReads(host)).toHaveLength(0);
  });

  it('does not select the only site on its own', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(combobox().getAttribute('aria-disabled')).toBeNull();
    });
    expect(combobox().textContent).toBe('No site selected');
    expect(scanReads(host)).toHaveLength(0);
  });

  it('starts the scan of the chosen site and shows its name', async () => {
    const { host, user } = await ready();
    await user.click(combobox());
    await user.click(screen.getByRole('option', { name: /Beta portal/ }));
    await waitFor(() => {
      expect(combobox().textContent).toBe(SITE_BETA.name);
    });
    await waitFor(() => {
      expect(scanReads(host).length).toBeGreaterThan(0);
    });
    expect(scanReads(host).every((call) => call.query.filter?.includes(SITE_BETA.id))).toBe(true);
  });

  it('selects with the keyboard alone', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe(SITE_BETA.name);
    await waitFor(() => {
      expect(scanReads(host).length).toBeGreaterThan(0);
    });
  });

  it('never scans an inactive site', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe('No site selected');
    expect(combobox().getAttribute('aria-expanded')).toBe('true');
    expect(scanReads(host)).toHaveLength(0);
    expect(screen.getByRole('option', { name: new RegExp(SITE_RETIRED.name) })).toBeTruthy();
  });

  it('goes back to "No site selected" when the connection changes', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe(SITE_ALPHA.name);
    host.setConnection({ ...CONNECTION, id: 'connection-9' });
    host.emit({ kind: 'connection-changed' });
    await waitFor(() => {
      expect(screen.getByText('No site selected')).toBeTruthy();
    });
  });
});
```

- [x] **B8. Edit existing tests**

In `src/app/App.test.tsx`:

```diff
-import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
+import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
```

In `src/app/App.test.tsx`:

```diff
+  it('keeps following the connection while Logic Starter is visible (CR-001)', async () => {
+    const host = gateHost(createFakeHost({ connection: CONTOSO, tables: { powerpagesites: [] } }));
+    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
+    const siteListReads = () =>
+      host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagesites');
+    await waitFor(() => {
+      expect(siteListReads()).toHaveLength(1);
+    });
+    expect(panel('starter')?.hidden).toBe(false);
+    host.setConnection({ ...CONTOSO, id: 'c2' });
+    await act(async () => {
+      host.emit({ kind: 'connection-changed' });
+      await Promise.resolve();
+    });
+    await waitFor(() => {
+      expect(siteListReads()).toHaveLength(2);
+    });
+  });
+
   it('does not call an unreadable connection "Not connected" (WR-005)', async () => {
```

In `src/app/App.test.tsx`:

```diff
     expect(screen.getByText('Contoso · Development')).toBeTruthy();
+    expect(screen.getByText('Contoso · Development').getAttribute('title')).toBe('Contoso · Development');
     host.setConnection(null);
```

- [x] **B9. Run the new tests with the implementation still absent**

```powershell
npm test -- src/features/inspector/scan/scan.test.ts src/app/inspector-site src/app/shell/SiteCombobox.test.tsx src/app/shell/SitePill.test.tsx src/app/App.test.tsx
```

Expected: exit 1; `Test Files  6 failed (6)`, `Tests  4 failed | 52 passed (56)`. The two new `scan.test.ts` tests fail with `expected true to be false` (the scan settled while a read was still in flight); four suites fail to load (`Failed to resolve import "./inspectorDeps"`, `"./useInspector"`, `"./SiteCombobox"`); in `App.test.tsx` "keeps following the connection while Logic Starter is visible (CR-001)" fails with `expected [] to have a length of 1 but got +0` and "shows the connection and its environment (AC-1.2)…" fails on the new `title` assertion; the 52 other tests pass (45 of them the existing `scan.test.ts` cases).

### Phase B2 — Implementation

- [x] **B10. Create `src/app/inspector-site/inspectorDeps.ts`**

```typescript
import { listSites, runScan } from '@/features/inspector/scan/scan';

/**
 * What the session needs from the Inspector feature, supplied by the app as Starter supplies STARTER_DEPS.
 * Tests mostly use the real pair against the fake host; a test that needs exact facts passes its own.
 */
export type InspectorDeps = {
  listSites: typeof listSites;
  runScan: typeof runScan;
};

export const INSPECTOR_DEPS: InspectorDeps = { listSites, runScan };
```

- [x] **B11. Create `src/app/inspector-site/inspectorSession.types.ts`**

```typescript
import type { Connection } from '@/services/pptb/host.types';
import type { ReviewKey, ScanProgress, SiteFacts, SiteRef, SiteResult } from '@/types/inspector';

export type SiteListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; sites: readonly SiteRef[] };

/**
 * `done` also covers a scan that stopped on connection loss: `facts.stopped` says which. `connection-changed`
 * is a scan the reader abandoned because the active connection changed under it (D-14): its facts are never
 * shown, and the state lasts until the new identity is adopted or another site is chosen.
 */
export type ScanState =
  | { status: 'none' }
  | { status: 'scanning'; site: SiteRef; progress: ScanProgress | null }
  | { status: 'failed'; site: SiteRef }
  | { status: 'connection-changed'; site: SiteRef }
  | { status: 'done'; site: SiteRef; facts: SiteFacts };

/** Source state only. Evaluated results and counts are derived from `facts` and `marks` during render. */
export type InspectorSnapshot = {
  /** Identity key of the connection this state belongs to: undefined before any, null for a confirmed disconnect. */
  ownerKey: string | null | undefined;
  /** The latest confirmed connection, for display and for new scans. A rename updates it and nothing else. */
  connection: Connection | null;
  sites: SiteListState;
  scan: ScanState;
  fileId: string | null;
  marks: ReadonlySet<ReviewKey>;
  /** Changes whenever what a report would capture is replaced: a scan starts, results are discarded or a mark changes. */
  generation: number;
};

export type InspectorActions = {
  selectSite: (site: SiteRef) => void;
  rescan: () => void;
  retrySites: () => void;
  selectFile: (fileId: string) => void;
  setReviewed: (key: ReviewKey, reviewed: boolean) => void;
};

/** What the title bar and the page read: the snapshot, the results derived from it, and the actions. */
export type InspectorSession = Omit<InspectorSnapshot, 'ownerKey'> &
  InspectorActions & {
    selectedSite: SiteRef | null;
    result: SiteResult | null;
  };
```

- [x] **B11a. Edit `src/features/inspector/scan/scan.ts`: settle every read before `runScan` settles**

Cause: `Promise.all` rejects on the first `AbortError` while the other reads of that scan are still running (the adapter cannot interrupt a `queryData` in progress), so the store started the next scan's four reads on top of them (reproduced peak 7). The three `Promise.all` calls become `Promise.allSettled`; `fulfilledValue` then rethrows the first rejection in input order, so the first-error behaviour and `AbortError` propagation are unchanged. `limiter` and `guarded` are not touched.

In `src/features/inspector/scan/scan.ts`:

```diff
   return { list: { ok: true, value: items }, unreadable };
 }
 
+/**
+ * The value of a settled read, or its rejection rethrown. Callers wait with `Promise.allSettled` first, so a
+ * scan never settles while one of its reads is still in flight: the adapter cannot interrupt a `queryData`
+ * call in progress, and the session starts the next scan's reads as soon as this one settles (S-02).
+ */
+function fulfilledValue<T>(result: PromiseSettledResult<T>): T {
+  if (result.status === 'rejected') {
+    const reason: unknown = result.reason;
+    throw reason;
+  }
+  return result.value;
+}
+
 async function readFiles(
```

In `src/features/inspector/scan/scan.ts`:

```diff
   let scanned = 0;
-  const files = await Promise.all(
+  const settled = await Promise.allSettled(
     records.map(async (record): Promise<ServerLogicFileFacts> => {
       const result = await reader.download(record.id);
       if (result.kind !== 'unread') {
         scanned += 1;
         onProgress({ scanned, total, inventoryComplete });
       }
       return { ...record, code: result.kind === 'ok' ? { ok: true, value: result.value } : failureOf(result) };
     }),
   );
+  const files = settled.map(fulfilledValue);
   return { files, inventoryComplete };
 }
```

In `src/features/inspector/scan/scan.ts`:

```diff
   const { bindings } = parsed;
-  const [enabled, allowedDomains, allowAll, timeout] = await Promise.all([
+  const [enabledRead, domainsRead, allowAllRead, timeoutRead] = await Promise.allSettled([
     resolveBinding(reader, bindings['ServerLogic/Enabled']),
     resolveBinding(reader, bindings['ServerLogic/AllowedDomains']),
     resolveBinding(reader, bindings['ServerLogic/AllowNetworkingToAllDomains']),
     resolveBinding(reader, bindings['ServerLogic/TimeoutInSeconds']),
   ]);
+  const enabled = fulfilledValue(enabledRead);
+  const allowedDomains = fulfilledValue(domainsRead);
+  const allowAll = fulfilledValue(allowAllRead);
+  const timeout = fulfilledValue(timeoutRead);
   return {
     settings: {
```

In `src/features/inspector/scan/scan.ts`:

```diff
  * Rejects with the adapter's AbortError when `options.signal` aborts, and with ScanAbandonedError when the
  * active connection changed. Connection loss resolves with `stopped: 'connection-lost'` instead.
+ * It settles only after every read it started has settled, so a caller that starts the next scan after this
+ * one never runs more than four reads at once (FR-7, S-02).
  */
```

In `src/features/inspector/scan/scan.ts`:

```diff
     const settings = reader.query(componentQuery(site.id, COMPONENT_TYPE.siteSetting));
-    const [inventoryResult, rolesResult, permissionsResult, settingsResult] = await Promise.all([
+    const [inventoryRead, rolesRead, permissionsRead, settingsRead] = await Promise.allSettled([
       readFiles(reader, inventory, onProgress),
       readList(roles, parseRoles),
       readList(permissions, parsePermissions),
       readSettings(reader, settings),
     ]);
+    const inventoryResult = fulfilledValue(inventoryRead);
+    const rolesResult = fulfilledValue(rolesRead);
+    const permissionsResult = fulfilledValue(permissionsRead);
+    const settingsResult = fulfilledValue(settingsRead);
     throwIfAborted(signal);
```

- [x] **B12. Create `src/app/inspector-site/inspectorSession.ts`**

```typescript
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import { connectionKey } from '@/app/useActiveConnection';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import { errorName } from '@/services/pptb/hostErrors';
import type { ReviewKey, SiteRef } from '@/types/inspector';
import type { InspectorDeps } from './inspectorDeps';
import type { InspectorActions, InspectorSnapshot } from './inspectorSession.types';

export const EMPTY_MARKS: ReadonlySet<ReviewKey> = new Set<ReviewKey>();

export const INITIAL_SNAPSHOT: InspectorSnapshot = {
  ownerKey: undefined,
  connection: null,
  sites: { status: 'idle' },
  scan: { status: 'none' },
  fileId: null,
  marks: EMPTY_MARKS,
  generation: 0,
};

export type InspectorStore = InspectorActions & {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => InspectorSnapshot;
  /**
   * Gives the store the confirmed active connection. A different id or URL, or a successful null, discards
   * everything and reloads the site list; the same identity only refreshes the display context (AC-7.6) and
   * reloads nothing (D-16 A).
   */
  adopt: (connection: Connection | null) => void;
  /** Aborts the running scan, discards late results and returns to the initial state. Safe to adopt again. */
  stop: () => void;
};

const noop = (): void => undefined;

/**
 * The one owner of the selected site, the scan generation and its AbortController, the facts, the file
 * selection and the review marks. It is plain TypeScript so the async lifecycle can be tested without React.
 *
 * Reads: a superseded scan is aborted. Each generation runs four reads at most (FR-7), `runScan` settles only
 * after every read it started has settled (scan.ts settle-all, B11a), and the next scan or site-list read
 * waits for that, so reads across generations stay at four.
 */
export function createInspectorStore(host: PptbHost, deps: InspectorDeps): InspectorStore {
  let snapshot: InspectorSnapshot = INITIAL_SNAPSHOT;
  let listToken = 0;
  let controller: AbortController | null = null;
  let settled: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<InspectorSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of [...listeners]) listener();
  };

  /** Work that never rejects. Later reads wait for it; for a scan, until its `runScan` has fully settled. */
  const track = (work: Promise<void>): void => {
    settled = Promise.all([settled, work]).then(noop);
  };

  const abortScan = (): void => {
    controller?.abort();
    controller = null;
  };

  function loadSites(): void {
    listToken += 1;
    const token = listToken;
    publish({ sites: { status: 'loading' } });
    const previous = settled;
    track(
      (async () => {
        await previous;
        if (token !== listToken) return;
        try {
          const sites = await deps.listSites(host);
          if (token !== listToken) return;
          const selected = snapshot.scan.status === 'none' ? null : snapshot.scan.site;
          if (selected !== null && !sites.some((candidate) => candidate.id === selected.id)) {
            // D-19 C: a successful list that omits the selected site drops the selection and everything under it.
            abortScan();
            publish({
              sites: { status: 'ok', sites },
              scan: { status: 'none' },
              fileId: null,
              marks: EMPTY_MARKS,
              generation: snapshot.generation + 1,
            });
            return;
          }
          publish({ sites: { status: 'ok', sites } });
        } catch (error) {
          if (token !== listToken) return;
          console.error('The site list could not be read.', errorName(error));
          publish({
            sites: {
              status: 'error',
              message:
                error instanceof HostReadError ? error.message : "Couldn't read the site list.",
            },
          });
        }
      })(),
    );
  }

  function startScan(site: SiteRef): void {
    const { connection } = snapshot;
    if (connection === null) return;
    abortScan();
    const mine = snapshot.generation + 1;
    const own = new AbortController();
    controller = own;
    publish({
      scan: { status: 'scanning', site, progress: null },
      fileId: null,
      marks: EMPTY_MARKS,
      generation: mine,
    });
    const previous = settled;
    track(
      (async () => {
        await previous;
        if (mine !== snapshot.generation) return;
        try {
          const facts = await deps.runScan(
            host,
            connection,
            site,
            `${connection.id}:${site.id}:${String(mine)}`,
            (progress) => {
              if (mine === snapshot.generation) {
                publish({ scan: { status: 'scanning', site, progress } });
              }
            },
            { signal: own.signal },
          );
          if (mine === snapshot.generation) publish({ scan: { status: 'done', site, facts } });
        } catch (error) {
          // Cancelled by our own abort, or superseded: the newer generation owns the state.
          if (mine !== snapshot.generation || own.signal.aborted) return;
          if (error instanceof ScanAbandonedError) {
            // The active connection changed under the scan: its facts must not be shown (D-14).
            publish({ scan: { status: 'connection-changed', site }, generation: mine + 1 });
            return;
          }
          console.error('The scan failed.', errorName(error));
          publish({ scan: { status: 'failed', site } });
        }
      })(),
    );
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,

    adopt: (connection) => {
      const key = connection === null ? null : connectionKey(connection);
      if (key === snapshot.ownerKey) {
        if (connection !== snapshot.connection) publish({ connection });
        return;
      }
      abortScan();
      publish({
        ownerKey: key,
        connection,
        sites: { status: 'idle' },
        scan: { status: 'none' },
        fileId: null,
        marks: EMPTY_MARKS,
        generation: snapshot.generation + 1,
      });
      listToken += 1;
      if (connection !== null) loadSites();
    },

    stop: () => {
      abortScan();
      listToken += 1;
      publish({ ...INITIAL_SNAPSHOT, generation: snapshot.generation + 1 });
    },

    selectSite: (site) => {
      const { sites, scan } = snapshot;
      if (!site.active || sites.status !== 'ok') return;
      if (!sites.sites.some((candidate) => candidate.id === site.id)) return;
      if (scan.status === 'scanning' && scan.site.id === site.id) return;
      startScan(site);
    },

    rescan: () => {
      const { scan } = snapshot;
      if (scan.status === 'done' || scan.status === 'failed') startScan(scan.site);
    },

    retrySites: () => {
      if (snapshot.sites.status === 'error') loadSites();
    },

    selectFile: (fileId) => {
      if (snapshot.scan.status === 'done') publish({ fileId });
    },

    setReviewed: (key, reviewed) => {
      if (snapshot.scan.status !== 'done') return;
      const marks = new Set(snapshot.marks);
      if (reviewed) marks.add(key);
      else marks.delete(key);
      publish({ marks, generation: snapshot.generation + 1 });
    },
  };
}
```

- [x] **B13. Create `src/app/inspector-site/useInspector.ts`**

```typescript
import { createContext, use } from 'react';
import type { InspectorSession } from './inspectorSession.types';

export const InspectorSessionContext = createContext<InspectorSession | null>(null);

export function useInspector(): InspectorSession {
  const session = use(InspectorSessionContext);
  if (session === null) {
    throw new Error('useInspector must be used inside the Inspector session provider');
  }
  return session;
}
```

- [x] **B14. Create `src/app/inspector-site/InspectorSessionProvider.tsx`**

```tsx
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import { connectionKey, useConnectionState } from '@/app/useActiveConnection';
import { evaluateSite } from '@/features/inspector/model/rules';
import type { Connection } from '@/services/pptb/host.types';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorStore, EMPTY_MARKS, INITIAL_SNAPSHOT } from './inspectorSession';
import type { InspectorSnapshot, InspectorSession } from './inspectorSession.types';
import { InspectorSessionContext } from './useInspector';

/** The snapshot as it must read for a connection the store has not adopted yet: nothing carries over (AC-7.6). */
function blankFor(connection: Connection | null, generation: number): InspectorSnapshot {
  return {
    ...INITIAL_SNAPSHOT,
    ownerKey: connection === null ? null : connectionKey(connection),
    connection,
    sites: connection === null ? { status: 'idle' } : { status: 'loading' },
    marks: EMPTY_MARKS,
    generation,
  };
}

/**
 * Mounted around the whole shell (title bar and every page), so connection changes are handled while Starter
 * or Server Objects is visible. It adds no host subscription: it follows the ConnectionProvider's state.
 * The host and deps are fixed for the life of the app, as they are for the other providers.
 */
export function InspectorSessionProvider({
  children,
  deps,
}: {
  readonly children: ReactNode;
  readonly deps: InspectorDeps;
}): ReactElement {
  const host = useHost();
  const connectionState = useConnectionState();
  const [store] = useState(() => createInspectorStore(host, deps));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // undefined: no read has succeeded yet, so there is nothing to adopt or to invalidate.
  const confirmed: Connection | null | undefined =
    connectionState.status === 'unknown'
      ? undefined
      : connectionState.status === 'connected'
        ? connectionState.connection
        : null;

  // A first confirmed connection or a changed identity loads the site list; a same-identity re-read reloads nothing (D-16 A).
  useEffect(() => {
    if (confirmed !== undefined) store.adopt(confirmed);
  }, [store, confirmed]);

  useEffect(
    () => () => {
      store.stop();
    },
    [store],
  );

  // Until the effect above has adopted a changed identity, show it as already cleared.
  const stale =
    confirmed !== undefined &&
    snapshot.ownerKey !== (confirmed === null ? null : connectionKey(confirmed));
  const view = stale ? blankFor(confirmed, snapshot.generation) : snapshot;

  const session: InspectorSession = {
    connection: view.connection,
    sites: view.sites,
    scan: view.scan,
    fileId: view.fileId,
    marks: view.marks,
    generation: view.generation,
    // S-08: a scan the connection change discarded has no site to show in the picker.
    selectedSite:
      view.scan.status === 'none' || view.scan.status === 'connection-changed' ? null : view.scan.site,
    result: view.scan.status === 'done' ? evaluateSite(view.scan.facts, view.marks) : null,
    selectSite: store.selectSite,
    rescan: store.rescan,
    retrySites: store.retrySites,
    selectFile: store.selectFile,
    setReviewed: store.setReviewed,
  };

  return <InspectorSessionContext value={session}>{children}</InspectorSessionContext>;
}
```

- [x] **B15. Create `src/app/shell/SiteCombobox.tsx`**

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '@/components/Icon';
import { useDisabledReason } from '@/components/useDisabledReason';
import { classNames } from '@/lib/classNames';
import './siteCombobox.css';

export type SiteOption = {
  id: string;
  label: string;
  /** Muted second line, for example the site's domain. */
  detail: string;
  /** An inactive site: listed and labelled, never selectable. */
  disabled: boolean;
};

export type SiteComboboxProps = {
  /** Accessible name of the control. */
  label: string;
  /** Shown while nothing is selected. */
  placeholder: string;
  options: readonly SiteOption[];
  selectedId: string | null;
  /** When set, the control is unavailable and explains why on hover and focus (F47). */
  unavailableReason: string | null;
  onSelect: (id: string) => void;
};

const TYPE_AHEAD_MS = 600;

/** APG type-ahead: a repeated letter cycles through matches; a longer string matches a prefix from the current option. */
function findMatch(options: readonly SiteOption[], from: number, typed: string): number {
  const query = typed.toLowerCase();
  const first = query.charAt(0);
  const cycle = query === first.repeat(query.length);
  const search = cycle ? first : query;
  const start = from + (cycle ? 1 : 0);
  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset) % options.length;
    if (options[index]?.label.toLowerCase().startsWith(search) === true) return index;
  }
  return -1;
}

/**
 * The title-bar site picker: the WAI-ARIA APG select-only combobox. Focus stays on the combobox and the
 * highlighted option is announced through aria-activedescendant. Arrow keys, Home, End and type-ahead only
 * move the highlight; Enter, Space and (after the highlight moved) Tab commit it, Escape and a click away
 * cancel. Inactive options can be highlighted so they can be read, but never committed.
 */
export function SiteCombobox({
  label,
  placeholder,
  options,
  selectedId,
  unavailableReason,
  onSelect,
}: SiteComboboxProps): ReactElement {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typing = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const { triggerProps, tooltip } = useDisabledReason(unavailableReason);

  const unavailable = unavailableReason !== null;
  const expanded = open && !unavailable && options.length > 0;
  const last = options.length - 1;
  const activeIndex = Math.min(active, Math.max(last, 0));
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const selected = selectedIndex < 0 ? null : (options[selectedIndex] ?? null);
  const shownLabel = selected?.label ?? null;
  const optionId = (index: number): string => `${baseId}-option-${String(index)}`;

  const firstEnabled = (): number => {
    const index = options.findIndex((option) => !option.disabled);
    return index < 0 ? 0 : index;
  };
  const openAt = (index: number, navigated = false): void => {
    setActive(index);
    setMoved(navigated);
    setOpen(true);
  };
  const move = (index: number): void => {
    setActive(index);
    setMoved(true);
  };
  const commit = (index: number): void => {
    const option = options[index];
    if (option === undefined || option.disabled) return;
    setOpen(false);
    if (option.id !== selectedId) onSelect(option.id);
  };

  useEffect(() => {
    if (!expanded) return;
    const dismissOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [expanded]);

  useEffect(() => {
    const list = listRef.current;
    const option = expanded ? list?.children.item(activeIndex) : null;
    if (list === null || !(option instanceof HTMLElement)) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [expanded, activeIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!expanded) {
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          event.preventDefault();
          openAt(selectedIndex < 0 ? firstEnabled() : selectedIndex);
          return;
        case 'Home':
          event.preventDefault();
          openAt(0, true);
          return;
        case 'End':
          event.preventDefault();
          openAt(Math.max(last, 0), true);
          return;
        default:
          break;
      }
    } else {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(Math.min(activeIndex + 1, last));
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (event.altKey) commit(activeIndex);
          else move(Math.max(activeIndex - 1, 0));
          return;
        case 'Home':
          event.preventDefault();
          move(0);
          return;
        case 'End':
          event.preventDefault();
          move(last);
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          commit(activeIndex);
          return;
        case 'Escape':
          event.preventDefault();
          setOpen(false);
          return;
        case 'Tab':
          // Focus moves on; a highlight the user never moved is not a choice.
          if (moved) commit(activeIndex);
          else setOpen(false);
          return;
        default:
          break;
      }
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    const now = Date.now();
    const text = now - typing.current.at > TYPE_AHEAD_MS ? event.key : typing.current.text + event.key;
    typing.current = { text, at: now };
    const match = findMatch(options, expanded ? activeIndex : Math.max(selectedIndex, 0), text);
    if (match < 0) return;
    event.preventDefault();
    if (expanded) move(match);
    else openAt(match, true);
  };

  const behaviour = unavailable
    ? triggerProps
    : {
        onKeyDown,
        onBlur: () => {
          setOpen(false);
        },
        onClick: () => {
          if (expanded) setOpen(false);
          else openAt(selectedIndex < 0 ? firstEnabled() : selectedIndex);
        },
      };

  return (
    <div className="site-combobox" ref={rootRef}>
      <span className="ui-reason-anchor">
        <div
          {...behaviour}
          role="combobox"
          tabIndex={0}
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded ? optionId(activeIndex) : undefined}
          aria-disabled={unavailable ? true : undefined}
          title={shownLabel ?? undefined}
          className={classNames(
            'site-combobox__trigger',
            shownLabel !== null && 'site-combobox__trigger--selected',
          )}
        >
          <span className="site-combobox__label">{shownLabel ?? placeholder}</span>
          <Icon name="chevron-down" size={12} />
        </div>
        {tooltip}
      </span>
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        hidden={!expanded}
        className="site-combobox__list"
        onMouseDown={(event) => {
          // Keep focus on the combobox while the pointer picks an option.
          event.preventDefault();
        }}
      >
        {options.map((option, index) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox owns keyboard operation (APG select-only)
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={option.id === selectedId}
            aria-disabled={option.disabled ? true : undefined}
            data-active={expanded && index === activeIndex}
            className={classNames(
              'site-combobox__option',
              option.disabled && 'site-combobox__option--disabled',
            )}
            onClick={() => {
              commit(index);
            }}
          >
            <span className="site-combobox__name">{option.label}</span>
            <span className="site-combobox__detail">{option.detail}</span>
            {option.disabled ? <span className="site-combobox__tag">Inactive</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [x] **B16. Create `src/app/shell/siteCombobox.css`**

```css
/* Title-bar site picker (APG select-only combobox). Colours come only from the theme tokens. */

.site-combobox {
  position: relative;
}

.site-combobox__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  max-width: 240px;
  padding: 3px 10px;
  background: transparent;
  border: 1px solid var(--control-border);
  border-radius: 99px;
  color: var(--text-2);
  cursor: pointer;
  font-size: 11.5px;
  line-height: 1.3;
}

/* The ellipsis lives on the label: text-overflow does nothing on an inline-flex container. */
.site-combobox__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-combobox__trigger > svg {
  flex: none;
}

.site-combobox__trigger--selected {
  color: var(--text);
  font-weight: 700;
}

/* An unavailable control: dashed outline and muted text, so the state is not colour alone. */
.site-combobox__trigger[aria-disabled='true'] {
  border-style: dashed;
  color: var(--muted);
  cursor: not-allowed;
}

.site-combobox__list {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  box-sizing: border-box;
  width: max-content;
  min-width: 100%;
  max-width: 360px;
  max-height: 260px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  background: var(--tile);
  border: 1px solid var(--control-border);
  border-radius: 10px;
  color: var(--text);
  list-style: none;
}

.site-combobox__list[hidden] {
  display: none;
}

.site-combobox__option {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}

/* The highlighted option uses the primary role (FR-11), never the needs-review colour. */
.site-combobox__option[data-active='true'] {
  border-color: var(--primary);
}

.site-combobox__option[aria-selected='true'] .site-combobox__name {
  font-weight: 700;
}

.site-combobox__option--disabled {
  color: var(--muted);
  cursor: not-allowed;
}

.site-combobox__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-combobox__detail {
  margin-left: auto;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.site-combobox__tag {
  padding: 0 7px;
  border: 1px dashed var(--control-border);
  border-radius: 99px;
  color: var(--muted);
  font-size: 10.5px;
  white-space: nowrap;
}

/* The control sits at the right edge of the title bar, so its reason opens leftwards. */
.site-combobox .ui-reason {
  right: 0;
  left: auto;
}
```

- [x] **B17. Edit existing code**

In `src/app/shell/SitePill.tsx`:

```diff
 import type { ReactElement } from 'react';
-import { Pill } from '@/components/Pill';
-
-// Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).
-export function SitePill(): ReactElement {
-  return (
-    <Pill compact aria-disabled="true" className="shell__site">
-      No site selected
-    </Pill>
+import type { SiteListState } from '@/app/inspector-site/inspectorSession.types';
+import { useInspector } from '@/app/inspector-site/useInspector';
+import { useConnectionState } from '@/app/useActiveConnection';
+import type { ConnectionState } from '@/app/useActiveConnection';
+import { SiteCombobox } from './SiteCombobox';
+
+function unavailableReason(connection: ConnectionState, sites: SiteListState): string | null {
+  if (connection.status === 'unknown') return 'Waiting for the active connection.';
+  if (connection.status === 'disconnected') {
+    return 'Select a connection in Power Platform ToolBox first.';
+  }
+  switch (sites.status) {
+    case 'idle':
+    case 'loading':
+      return 'Loading sites…';
+    case 'error':
+      return "Couldn't load sites. Open Logic Inspector to retry.";
+    case 'ok':
+      return sites.sites.length === 0 ? 'No Power Pages sites in this environment.' : null;
+  }
+}
+
+/**
+ * The title-bar site picker (AC-1.2, AC-7.2). It reads the app-owned Inspector session only. No site is
+ * preselected, not even when the environment has one; choosing an active site starts its scan.
+ */
+export function SitePill(): ReactElement {
+  const connection = useConnectionState();
+  const { sites, selectedSite, selectSite } = useInspector();
+  const list = sites.status === 'ok' ? sites.sites : [];
+  return (
+    <SiteCombobox
+      label="Power Pages site"
+      placeholder="No site selected"
+      options={list.map((site) => ({
+        id: site.id,
+        label: site.name,
+        detail: site.domain,
+        disabled: !site.active,
+      }))}
+      selectedId={selectedSite?.id ?? null}
+      unavailableReason={unavailableReason(connection, sites)}
+      onSelect={(id) => {
+        const site = list.find((candidate) => candidate.id === id);
+        if (site !== undefined) selectSite(site);
+      }}
+    />
   );
 }
```

In `src/app/App.tsx`:

```diff
 import { ConnectionProvider } from '@/app/ConnectionProvider';
 import { HostContext } from '@/app/HostContext';
+import { INSPECTOR_DEPS } from '@/app/inspector-site/inspectorDeps';
+import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
+import { InspectorSessionProvider } from '@/app/inspector-site/InspectorSessionProvider';
```

In `src/app/App.tsx`:

```diff
-export type AppProps = { host: PptbHost; starterDeps?: StarterDeps };
+export type AppProps = { host: PptbHost; starterDeps?: StarterDeps; inspectorDeps?: InspectorDeps };
+
+/**
+ * The Inspector session wraps the title bar and every page, so it keeps following connection changes while
+ * Starter or Server Objects is visible. The constant condition drops it from builds without the Inspector.
+ */
+function InspectorScope({
+  deps,
+  children,
+}: {
+  deps: InspectorDeps | undefined;
+  children: ReactNode;
+}): ReactNode {
+  return __PAGE_INSPECTOR__ ? (
+    <InspectorSessionProvider deps={deps ?? INSPECTOR_DEPS}>{children}</InspectorSessionProvider>
+  ) : (
+    children
+  );
+}
```

In `src/app/App.tsx`:

```diff
-export function App({ host, starterDeps = STARTER_DEPS }: AppProps): ReactElement {
+export function App({ host, starterDeps = STARTER_DEPS, inspectorDeps }: AppProps): ReactElement {
```

In `src/app/App.tsx`:

```diff
           <ViewContext value={[view, setView]}>
-            <div className="shell">
-              <TitleBar />
-              <main className="shell__content">
-                {/* Constant conditions: unreleased pages are dropped from the bundle (FR-1, Phase 00). */}
-                {__PAGE_STARTER__ ? (
-                  <StarterSessionProvider deps={starterDeps}>
-                    <Panel id="starter" label="Logic Starter" view={view}>
-                      <StarterPage />
-                    </Panel>
-                    {__PAGE_OBJECTS__ ? (
-                      <Panel id="objects" label="Server Objects" view={view}>
-                        <ServerObjectsPage />
-                      </Panel>
-                    ) : null}
-                  </StarterSessionProvider>
-                ) : null}
-                {__PAGE_INSPECTOR__ ? (
-                  <Panel id="inspector" label="Logic Inspector" view={view}>
-                    <InspectorPage />
-                  </Panel>
-                ) : null}
-              </main>
-            </div>
+            <InspectorScope deps={inspectorDeps}>
+              <div className="shell">
+                <TitleBar />
+                <main className="shell__content">
+                  {/* Constant conditions: unreleased pages are dropped from the bundle (FR-1, Phase 00). */}
+                  {__PAGE_STARTER__ ? (
+                    <StarterSessionProvider deps={starterDeps}>
+                      <Panel id="starter" label="Logic Starter" view={view}>
+                        <StarterPage />
+                      </Panel>
+                      {__PAGE_OBJECTS__ ? (
+                        <Panel id="objects" label="Server Objects" view={view}>
+                          <ServerObjectsPage />
+                        </Panel>
+                      ) : null}
+                    </StarterSessionProvider>
+                  ) : null}
+                  {__PAGE_INSPECTOR__ ? (
+                    <Panel id="inspector" label="Logic Inspector" view={view}>
+                      <InspectorPage />
+                    </Panel>
+                  ) : null}
+                </main>
+              </div>
+            </InspectorScope>
           </ViewContext>
```

In `src/app/shell/TitleBar.tsx`:

```diff
   const connection = useConnectionState();
+  const label = connectionStateLabel(connection);
```

In `src/app/shell/TitleBar.tsx`:

```diff
-        <span>{connectionStateLabel(connection)}</span>
+        <span className="shell__connection" title={label}>
+          {label}
+        </span>
```

In `src/app/shell/shell.css`:

```diff
   padding-right: 18px;
   font-size: 12px;
   color: var(--muted);
   white-space: nowrap;
+  min-width: 0;
+}
+
+/* A long connection name is cut with an ellipsis (its full text is the tooltip) so the site picker stays on screen. */
+.shell__connection {
+  min-width: 0;
+  overflow: hidden;
+  text-overflow: ellipsis;
 }
```

- [x] **B18. Run the slice tests again**

```powershell
npm test -- src/features/inspector/scan/scan.test.ts src/app/inspector-site src/app/shell/SiteCombobox.test.tsx src/app/shell/SitePill.test.tsx src/app/App.test.tsx
```

Expected: exit 0; `Test Files  6 passed (6)`, `Tests  129 passed (129)` (the 135 of the previous draft less 6: four D-16 B store reload tests, the D-20 provider test and one `SiteCombobox` D-19 label test; the 47 `scan.test.ts` tests are unchanged).

- [x] **B19. Type, lint and full-suite gates for this slice**

```powershell
npm run typecheck
npx --no-install eslint src/app src/test src/features/inspector/scan --max-warnings=0
npm test
```

Expected: `typecheck` and `eslint` exit 0 with no output; `npm test` exits 0 with `Test Files  110 passed (110)`, `Tests  1830 passed (1830)` (the three `buildShape` builds still pass: the placeholder is untouched and the new code is gated).

- [x] **B20. Commit**

```powershell
git add -- src/features/inspector/scan/scan.ts src/features/inspector/scan/scan.test.ts src/test/deferred.ts src/test/inspectorWorld.ts src/app/inspector-site/inspectorTestHarness.tsx src/app/inspector-site/inspectorSession.test.ts src/app/inspector-site/InspectorSessionProvider.test.tsx src/app/shell/SiteCombobox.test.tsx src/app/shell/SitePill.test.tsx src/app/inspector-site/inspectorDeps.ts src/app/inspector-site/inspectorSession.types.ts src/app/inspector-site/inspectorSession.ts src/app/inspector-site/useInspector.ts src/app/inspector-site/InspectorSessionProvider.tsx src/app/shell/SiteCombobox.tsx src/app/shell/siteCombobox.css src/app/App.test.tsx src/app/shell/SitePill.tsx src/app/App.tsx src/app/shell/TitleBar.tsx src/app/shell/shell.css
git diff --cached --check
git commit -m "feat(app): add the app-scoped Inspector session and the title-bar site picker"
```

## Sub-slice C — Inspector page: connection and site-list states, scanning, files rail, banners (CR-001, second half)

**Commit:** `feat(inspector): build the Inspector page states, files rail and site banners`

### Phase C1 — Failing tests

- [x] **C1. Create `src/test/fixedDeps.ts`**

```typescript
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import type { SiteFacts, SiteRef } from '@/types/inspector';
import { SITE_ALPHA } from './inspectorWorld';

/**
 * Inspector deps that return exactly the facts a test wants for whichever site is scanned, so a display
 * test can build any state (read failures, unscanned evidence, banners) without a fake Dataverse for it.
 */
export function fixedDeps(
  facts: SiteFacts,
  sites: readonly SiteRef[] = [SITE_ALPHA],
): InspectorDeps {
  return {
    listSites: () => Promise.resolve(sites),
    runScan: (_host, connection, site, scanId) =>
      Promise.resolve({ ...facts, site, connection, scanId }),
  };
}
```

- [x] **C2. Create `src/features/inspector/InspectorPage.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import { renderInspector } from '@/app/inspector-site/inspectorTestHarness';
import type { InspectorHarnessOptions } from '@/app/inspector-site/inspectorTestHarness';
import { SitePill } from '@/app/shell/SitePill';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import { deferred } from '@/test/deferred';
import { fixedDeps } from '@/test/fixedDeps';
import {
  CONNECTION,
  createInspectorHost,
  OTHER_CONNECTION,
  SITE_ALPHA,
  SITE_BETA,
} from '@/test/inspectorWorld';
import type { ScanProgress, SiteFacts } from '@/types/inspector';
import { file, read, role, settings, siteFacts, value } from './model/fixtures';
import { TENANT_POLICY_NOTE } from './model/copy';
import {
  CONNECTION_CHANGED_TITLE,
  connectionChangedText,
  DISCONNECTED_TEXT,
  EXPORT_REASON,
  NO_FILES_TEXT,
  NO_SITES_TEXT,
  NON_DEV_WARNING,
  NOTHING_READ_TEXT,
  REFRESH_FAILED_TEXT,
} from './pageCopy';
import { InspectorPage } from './InspectorPage';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function mount(options: InspectorHarnessOptions = {}) {
  return renderInspector(
    <>
      <SitePill />
      <InspectorPage />
    </>,
    options,
  );
}

type Mounted = ReturnType<typeof mount>;
const picker = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const heading = (name: string | RegExp) => screen.findByRole('heading', { name });
const componentReads = (host: Mounted['host']) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');

async function pick({ user }: Pick<Mounted, 'user'>, name: RegExp) {
  await user.click(picker());
  await user.click(screen.getByRole('option', { name }));
}

const exportReport = () => screen.getByRole('button', { name: 'Export report' });
const connectionEvent = (host: Mounted['host']) =>
  act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
    await Promise.resolve();
  });

/** The AC-7.4 and AC-7.8 control: present, `aria-disabled`, explains itself and ignores clicks (D-09, D-17). */
async function expectDisabledExport(user: Mounted['user']) {
  const button = exportReport();
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(button.hasAttribute('disabled')).toBe(false);
  await user.hover(button);
  expect(screen.getByText(EXPORT_REASON)).toBeTruthy();
  await user.click(button);
  expect(button.getAttribute('aria-disabled')).toBe('true');
}

/** Two files: one fully configured, one inactive with no web role (Needs review). */
function graded(patch: Partial<SiteFacts> = {}): SiteFacts {
  return siteFacts({
    roles: read([role('staff')]),
    files: [
      file({ id: 'file-1', name: 'customer-summary' }),
      file({ id: 'file-2', name: 'order-sync', active: false, roleIds: read([]) }),
    ],
    ...patch,
  });
}

describe('InspectorPage: connection and site list states', () => {
  it('asks for a connection when none is active, and shows no findings (AC-7.1)', async () => {
    mount({ host: createInspectorHost(undefined, null) });
    expect(await heading('No active connection')).toBeTruthy();
    expect(screen.getByText(DISCONNECTED_TEXT)).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().getAttribute('aria-disabled')).toBe('true');
  });

  it('tells "checking" from "unreadable" and recovers on focus (WR-005)', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    mount({ host });
    expect(await heading('Checking the active connection')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    host.rejectConnectionRead(0);
    expect(await heading("Couldn't read the active connection")).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'No active connection' })).toBeNull();
    host.setConnectionRead('ok');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(await heading('Select a site')).toBeTruthy();
  });

  it('offers Retry once a read rejected, hides it while the retry runs, and recovers (D-05)', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    const { user } = mount({ host });
    await heading('Checking the active connection');
    host.rejectConnectionRead(0);
    await heading("Couldn't read the active connection");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(host.parkedConnectionReads).toBe(2);
    host.rejectConnectionRead(1);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Couldn't read the active connection" })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    host.settleConnectionRead(2, CONNECTION);
    expect(await heading('Select a site')).toBeTruthy();
    expect(host.listenerCount()).toBe(1);
  });

  it('shows loading while the sites are read', async () => {
    const host = createInspectorHost();
    host.holdDataReads(true);
    mount({ host });
    expect(await heading('Loading sites')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Select a site')).toBeTruthy();
  });

  it('says there are no enhanced data model sites, scans nothing, and shows Export report disabled (AC-7.8)', async () => {
    const { host, user } = mount({ host: createInspectorHost({ sites: [] }) });
    expect(await heading('No sites found')).toBeTruthy();
    expect(screen.getByText(NO_SITES_TEXT)).toBeTruthy();
    expect(componentReads(host)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /retry|scan again/i })).toBeNull();
    await expectDisabledExport(user);
  });

  it('shows the reason and a Retry that reloads the list when the site list fails', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503, times: 1 }],
    });
    const { user } = mount({ host });
    expect(await heading("Couldn't load sites")).toBeTruthy();
    expect(screen.getByText('The server had a problem. Please try again later.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('never selects a site on its own, not even when there is only one', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    mount({ host });
    expect(await heading('Select a site')).toBeTruthy();
    expect(picker().textContent).toBe('No site selected');
    expect(componentReads(host)).toHaveLength(0);
  });
});

describe('InspectorPage: scanning', () => {
  function controlled() {
    const finish = deferred<SiteFacts>();
    const holder: { report: (progress: ScanProgress) => void } = { report: () => undefined };
    const deps: InspectorDeps = {
      listSites: () => Promise.resolve([SITE_ALPHA]),
      runScan: (_host, _connection, _site, _scanId, onProgress) => {
        holder.report = onProgress;
        return finish.promise;
      },
    };
    return { deps, finish, report: (progress: ScanProgress) => { act(() => { holder.report(progress); }); } };
  }

  it('shows "Scanned X of N", says when the list is incomplete, and announces only start and end', async () => {
    const run = controlled();
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    expect(await heading('Scanning Alpha portal')).toBeTruthy();
    expect(screen.getByText('Reading server logic records…')).toBeTruthy();
    const status = screen.getByRole('status', { name: 'Inspector status' });
    expect(status.textContent).toBe('Scanning Alpha portal.');
    run.report({ scanned: 3, total: 12, inventoryComplete: true });
    expect(screen.getByText('Scanned 3 of 12')).toBeTruthy();
    run.report({ scanned: 4, total: 12, inventoryComplete: false });
    expect(
      screen.getByText('Scanned 4 of 12 found so far. The record list is incomplete.'),
    ).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scanning Alpha portal.');
    await act(async () => {
      run.finish.resolve(graded());
      await Promise.resolve();
    });
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scan finished. 2 server logic files.');
  });

  it('shows a failed scan with a Scan again that can complete (D-02)', async () => {
    let fail = true;
    const view = mount({
      deps: {
        listSites: () => Promise.resolve([SITE_ALPHA]),
        runScan: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(graded())),
      },
    });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    expect(await heading("Couldn't scan Alpha portal")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export report' })).toBeNull();
    fail = false;
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(await heading('Review server logic readiness')).toBeTruthy();
  });

  it('says the connection changed while scanning, offers no Scan again, and clears for the new identity (D-14, S-08)', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    // The host switches connection; the event that would tell the provider has not arrived yet.
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    expect(await heading(CONNECTION_CHANGED_TITLE)).toBeTruthy();
    expect(screen.getByText(connectionChangedText(SITE_ALPHA))).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(`${CONNECTION_CHANGED_TITLE}.`);
    expect(screen.queryByRole('button', { name: /scan again|export report/i })).toBeNull();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().textContent).toBe('No site selected');
    expect(picker().getAttribute('aria-disabled')).toBeNull();
    await connectionEvent(host);
    expect(await heading('Select a site')).toBeTruthy();
    expect(host.dataReads.peak).toBe(4);
  });

  it('leaves "the connection changed" by choosing a site', async () => {
    const view = mount({
      deps: {
        listSites: () => Promise.resolve([SITE_ALPHA, SITE_BETA]),
        runScan: (_host, _connection, site) =>
          site.id === SITE_ALPHA.id
            ? Promise.reject(new ScanAbandonedError())
            : Promise.resolve(graded({ site })),
      },
    });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading(CONNECTION_CHANGED_TITLE);
    await pick(view, /Beta portal/);
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(picker().textContent).toBe('Beta portal');
  });

  it('discards a delayed scan when the user selects another site', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    expect(await heading('Scanning Alpha portal')).toBeTruthy();
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    await pick(view, /Beta portal/);
    expect(await heading('Scanning Beta portal')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(screen.getByText('Server logic (1)')).toBeTruthy();
    expect(screen.getByRole('button', { name: /handler-11/ })).toBeTruthy();
    expect(screen.queryByText(/handler-01/)).toBeNull();
    expect(host.dataReads.peak).toBe(4);
  });

  it('discards a delayed scan when the connection changes under it, and reloads the site list', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await heading('Loading sites')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().textContent).toBe('No site selected');
    expect(host.dataReads.peak).toBe(4);
  });
});

describe('InspectorPage: results', () => {
  async function finished(facts: SiteFacts = graded(), options: InspectorHarnessOptions = {}) {
    const view = mount({ deps: fixedDeps(facts), ...options });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    return view;
  }

  it('lists every file with its status, selects none until the user does, and shows the tenant-policy note (AC-7.3, AC-8.6, AC-8.7, D-03)', async () => {
    const { user } = await finished();
    const rail = screen.getByRole('region', { name: 'Server logic (2)' });
    const first = within(rail).getByRole('button', { name: /customer-summary/ });
    const second = within(rail).getByRole('button', { name: /order-sync/ });
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(first.tabIndex).toBe(0);
    expect(first.textContent).toContain('Active · All configured');
    expect(second.textContent).toContain('Inactive · 2/3 · 1 to review');
    expect(within(first).getByText('Ready')).toBeTruthy();
    expect(within(second).getByText('Needs review')).toBeTruthy();
    expect(within(rail).getByText(TENANT_POLICY_NOTE)).toBeTruthy();
    // D-18: the site name stands where "<file> · <status>" will go.
    const siteLine = screen.getByText('Alpha portal', { selector: '.inspector-title__file' });
    expect(siteLine.getAttribute('title')).toBe('Alpha portal'); // the line ellipsizes, so the full text is on hover
    expect(screen.queryByText(/customer-summary · Active/)).toBeNull();
    await user.click(second);
    expect(second.getAttribute('aria-current')).toBe('true');
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('order-sync · Inactive').getAttribute('title')).toBe('order-sync · Inactive');
    await user.click(first);
    expect(first.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('customer-summary · Active')).toBeTruthy();
  });

  it('shows the title, the sub-line and a Scan again that replaces the results (AC-8.1, D-02)', async () => {
    const host = createInspectorHost();
    const { user } = mount({ host });
    await heading('Select a site');
    await pick({ user }, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(
      screen.getByText('Inspect access, permissions and outbound networking before release.'),
    ).toBeTruthy();
    const reads = componentReads(host).length;
    expect(screen.queryByRole('button', { name: 'Rescan' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Scan again' }));
    await waitFor(() => {
      expect(componentReads(host).length).toBeGreaterThan(reads);
    });
    expect(await heading('Review server logic readiness')).toBeTruthy();
  });

  it('shows Export report disabled, with its reason, for a finished scan (D-09, D-17)', async () => {
    const { user } = await finished();
    await expectDisabledExport(user);
    expect(screen.getByRole('heading', { name: 'Review server logic readiness' })).toBeTruthy();
  });

  it('says there is no server logic only when the list was read completely, with Export report disabled (AC-7.4)', async () => {
    const view = mount({ host: createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] }) });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(screen.getByText('Server logic (0)')).toBeTruthy();
    expect(screen.getByText(NO_FILES_TEXT)).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(`${NO_FILES_TEXT}.`);
    await expectDisabledExport(view.user);
  });

  it('does not claim "no server logic" when nothing was read before the scan stopped', async () => {
    await finished(graded({ files: [], inventoryComplete: false, stopped: 'connection-lost' }));
    expect(screen.getByText(NOTHING_READ_TEXT)).toBeTruthy();
    expect(screen.queryByText(NO_FILES_TEXT)).toBeNull();
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByText('Inventory incomplete. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    expect(exportReport().getAttribute('aria-disabled')).toBe('true');
  });

  it('announces "nothing was read", never "no server logic", when an incomplete list is empty and no stop was recorded', async () => {
    await finished(graded({ files: [], inventoryComplete: false, stopped: null }));
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(NOTHING_READ_TEXT);
    expect(screen.getByText(NOTHING_READ_TEXT, { selector: '.inspector-rail__empty' })).toBeTruthy();
    expect(screen.queryByText(NO_FILES_TEXT)).toBeNull();
  });

  it('keeps the partial results of a scan that stopped on connection loss (AC-7.10)', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [{ n: 1 }, { n: 2 }] }],
      failures: [{ operation: 'file', entitySet: 'powerpagecomponent', status: 401 }],
    });
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    const rail = screen.getByRole('region', { name: 'Server logic (2)' });
    expect(within(rail).getAllByText('Incomplete')).toHaveLength(2);
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scan stopped. The connection was lost.');
  });

  it('shows every site banner above the files (AC-7.9, AC-7.12, FR-7)', async () => {
    await finished(
      graded({
        settings: read(
          settings({
            'ServerLogic/Enabled': value('false'),
            'ServerLogic/TimeoutInSeconds': value('0'),
          }),
        ),
        roles: read([
          role('a', { name: 'a', anonymous: true }),
          role('b', { name: 'b', anonymous: true }),
        ]),
        unreadableRows: [{ type: 11, id: 'row-1', name: 'broken-role' }],
        inventoryComplete: false,
      }),
    );
    const notices = within(screen.getByRole('list', { name: 'Site notices' }));
    expect(notices.getByText('Server logic is disabled on this site (ServerLogic/Enabled = false)')).toBeTruthy();
    expect(notices.getByText("ServerLogic/TimeoutInSeconds isn't a positive integer up to 240")).toBeTruthy();
    expect(notices.getByText(/More than one web role is marked as the Anonymous Users Role/)).toBeTruthy();
    expect(notices.getByText(/couldn't be read and was skipped: broken-role/)).toBeTruthy();
    expect(notices.getByText('Inventory incomplete. Reconnect and rescan.')).toBeTruthy();
  });
});

describe('InspectorPage: connection notices (AC-7.5, AC-7.11, WR-005)', () => {
  it('shows no warning for a Dev connection', async () => {
    mount();
    await heading('Select a site');
    expect(screen.queryByText(NON_DEV_WARNING)).toBeNull();
  });

  it.each(['Test', 'UAT', 'Production', 'Unknown'] as const)(
    'warns for a %s connection without blocking the scan',
    async (environment) => {
      const host = createInspectorHost(undefined, { ...CONNECTION, environment });
      const view = mount({ host });
      await heading('Select a site');
      expect(screen.getByText(NON_DEV_WARNING)).toBeTruthy();
      await pick(view, /Alpha portal/);
      expect(await heading('Review server logic readiness')).toBeTruthy();
      expect(screen.getByText(NON_DEV_WARNING)).toBeTruthy();
    },
  );

  it('updates the warning for a relabel of the same connection without clearing the results', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnection({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await screen.findByText(NON_DEV_WARNING)).toBeTruthy();
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    expect(picker().textContent).toBe(SITE_ALPHA.name);
  });

  it('keeps the results and says so when a refresh fails, then clears them for a different connection', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    expect(await screen.findByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    const notices = within(screen.getByRole('list', { name: 'Page notices' }));
    expect(notices.getByRole('button', { name: 'Retry' })).toBeTruthy();
    host.setConnectionRead('ok');
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
  });

  it('clears the results when the connection becomes a successful null', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnection(null);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await heading('No active connection')).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
  });
});

describe('InspectorPage: Retry in the refresh-failed notice (D-05)', () => {
  it('re-reads the connection, keeps the results, and clears the notice when the read succeeds', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    const reads = host.callsOf('getActiveConnection').length;
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(reads + 1);
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    host.setConnectionRead('ok');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    expect(picker().textContent).toBe(SITE_ALPHA.name);
  });

  it('hides Retry while the read it started is in flight', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    host.setConnectionRead('hold');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    host.settleConnectionRead(0, CONNECTION);
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
  });
});

describe('InspectorPage: focus after Retry and Scan again', () => {
  /** The first scan runs `first`; every later scan stays pending until `second` is resolved. */
  function scansThen(first: () => Promise<SiteFacts>) {
    const second = deferred<SiteFacts>();
    let scans = 0;
    const deps: InspectorDeps = {
      listSites: () => Promise.resolve([SITE_ALPHA]),
      runScan: () => {
        scans += 1;
        return scans === 1 ? first() : second.promise;
      },
    };
    return { deps, second };
  }
  const finishSecond = (second: ReturnType<typeof scansThen>['second']) =>
    act(async () => {
      second.resolve(graded());
      await Promise.resolve();
    });

  it('moves focus to the panel heading when Retry hides itself on the unreadable-connection panel', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    const { user } = mount({ host });
    await heading('Checking the active connection');
    host.rejectConnectionRead(0);
    await heading("Couldn't read the active connection");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: "Couldn't read the active connection" }),
    );
  });

  it('moves focus to the results heading when Retry hides itself in the refresh-failed notice', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    host.setConnectionRead('hold');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Review server logic readiness' }),
    );
    host.settleConnectionRead(0, CONNECTION);
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
  });

  it('moves focus to the scanning heading when Scan again leaves the results', async () => {
    const run = scansThen(() => Promise.resolve(graded()));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await finishSecond(run.second);
  });

  it('moves focus to the scanning heading when Scan again leaves a failed scan', async () => {
    const run = scansThen(() => Promise.reject(new Error('boom')));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading("Couldn't scan Alpha portal");
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await finishSecond(run.second);
  });
});
```

D-19 C is enforced by the store guard in B (`loadSites` success omitting the selected site clears the selection); no page test can reach it through the public API under D-16 A, so it is covered by the store's code only (noted in the self-review).

- [x] **C3. Create `src/app/App.inspector.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import { createInspectorHost, OTHER_CONNECTION } from '@/test/inspectorWorld';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const tab = (name: string) => screen.getByRole('tab', { name });
const picker = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const readiness = () => screen.queryByRole('heading', { name: 'Review server logic readiness' });

async function openInspectorAndScan(host = createInspectorHost()) {
  const user = userEvent.setup();
  render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
  fireEvent.click(tab('Logic Inspector'));
  await screen.findByRole('heading', { name: 'Select a site' });
  await user.click(picker());
  await user.click(screen.getByRole('option', { name: /Alpha portal/ }));
  return { host, user };
}

async function connectionChanged(host: ReturnType<typeof createInspectorHost>) {
  host.setConnection(OTHER_CONNECTION);
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('Logic Inspector in the app (CR-001, AC-7.6)', () => {
  it('runs the journey: pick a site in the title bar, scan, read the results', async () => {
    await openInspectorAndScan();
    expect(await screen.findByRole('heading', { name: 'Review server logic readiness' })).toBeTruthy();
    expect(picker().textContent).toBe('Alpha portal');
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
  });

  it('clears finished results when the connection changes while Logic Starter is visible', async () => {
    const { host } = await openInspectorAndScan();
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    fireEvent.click(tab('Logic Starter'));
    expect(readiness()).toBeNull();
    await connectionChanged(host);
    await waitFor(() => {
      expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(2);
    });
    fireEvent.click(tab('Logic Inspector'));
    expect(await screen.findByRole('heading', { name: 'Select a site' })).toBeTruthy();
    expect(readiness()).toBeNull();
    expect(picker().textContent).toBe('No site selected');
  });

  it('discards a scan that is still running when the connection changes while another tab is visible', async () => {
    const host = createInspectorHost();
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    fireEvent.click(tab('Logic Inspector'));
    await screen.findByRole('heading', { name: 'Select a site' });
    host.holdDataReads(true);
    await user.click(picker());
    await user.click(screen.getByRole('option', { name: /Alpha portal/ }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    fireEvent.click(tab('Server Objects'));
    await connectionChanged(host);
    host.holdDataReads(false);
    await waitFor(() => {
      expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(2);
    });
    fireEvent.click(tab('Logic Inspector'));
    expect(await screen.findByRole('heading', { name: 'Select a site' })).toBeTruthy();
    expect(readiness()).toBeNull();
    expect(host.dataReads.peak).toBe(4);
  });
});
```

- [x] **C4. Edit existing tests**

In `tests/buildShape.test.ts`:

```diff
-    expect(code).toContain('Logic Inspector page placeholder');
+    expect(code).toContain('Review server logic readiness'); // text only the finished Inspector page renders
+    expect(code).toContain('useInspector must be used inside the Inspector session provider');
     expect(code).toContain('No site selected');
```

In `tests/buildShape.test.ts`:

```diff
-      expect(code).not.toContain('Logic Inspector page placeholder');
+      expect(code).not.toContain('Review server logic readiness');
+      expect(code).not.toContain('useInspector must be used inside the Inspector session provider');
       expect(code).not.toContain('Browse all in Server Objects');
```

In `tests/buildShape.test.ts`:

```diff
-    'ships Starter and Server Objects but not the Inspector placeholder in --mode beta',
+    'ships Starter and Server Objects but not the Inspector in --mode beta',
```

In `tests/buildShape.test.ts`:

```diff
-      expect(code).not.toContain('Logic Inspector page placeholder');
+      expect(code).not.toContain('Review server logic readiness');
+      expect(code).not.toContain('useInspector must be used inside the Inspector session provider');
       expect(code).not.toContain('No site selected');
```

- [x] **C5. Run the new tests with the implementation still absent**

```powershell
npm test -- src/features/inspector/InspectorPage.test.tsx src/app/App.inspector.test.tsx tests/buildShape.test.ts
```

Expected: exit 1; `Test Files  3 failed (3)`, `Tests  4 failed | 12 passed (16)`. `InspectorPage.test.tsx` fails to load (`Failed to resolve import "./pageCopy"`); the three `App.inspector.test.tsx` tests fail with `Unable to find role="heading" and name "Select a site"`; `buildShape.test.ts` "includes all three pages" fails with `expected '(function(){…' to contain 'Review server logic readiness'`; the other `buildShape` tests pass (this step runs the three real builds, about a minute).

### Phase C2 — Implementation

- [x] **C6. Create `src/features/inspector/pageState.ts`**

```typescript
import type { InspectorSession } from '@/app/inspector-site/inspectorSession.types';
import type { ConnectionState } from '@/app/useActiveConnection';
import type { ScanProgress, SiteRef, SiteResult } from '@/types/inspector';

/** Everything the Inspector page can be showing, as one union so every state is handled and exhausted. */
export type PageState =
  | { kind: 'connection-unknown'; failed: boolean }
  | { kind: 'disconnected' }
  | { kind: 'sites-loading' }
  | { kind: 'sites-error'; message: string }
  | { kind: 'no-sites' }
  | { kind: 'choose-site' }
  | { kind: 'scanning'; site: SiteRef; progress: ScanProgress | null }
  | { kind: 'scan-failed'; site: SiteRef }
  | { kind: 'connection-changed'; site: SiteRef }
  | { kind: 'results'; site: SiteRef; result: SiteResult };

export function derivePageState(connection: ConnectionState, session: InspectorSession): PageState {
  if (connection.status === 'unknown') {
    return { kind: 'connection-unknown', failed: connection.refreshFailed };
  }
  if (connection.status === 'disconnected') return { kind: 'disconnected' };
  const { sites, scan, result } = session;
  switch (sites.status) {
    case 'idle':
    case 'loading':
      return { kind: 'sites-loading' };
    case 'error':
      return { kind: 'sites-error', message: sites.message };
    case 'ok':
      if (sites.sites.length === 0) return { kind: 'no-sites' };
      break;
    default: {
      const unreachable: never = sites;
      return unreachable;
    }
  }
  switch (scan.status) {
    case 'none':
      return { kind: 'choose-site' };
    case 'scanning':
      return { kind: 'scanning', site: scan.site, progress: scan.progress };
    case 'failed':
      return { kind: 'scan-failed', site: scan.site };
    case 'connection-changed':
      return { kind: 'connection-changed', site: scan.site };
    case 'done':
      // A finished scan always has its evaluated result; the fallback only satisfies the type.
      return result === null ? { kind: 'choose-site' } : { kind: 'results', site: scan.site, result };
    default: {
      const unreachable: never = scan;
      return unreachable;
    }
  }
}
```

- [x] **C7. Create `src/features/inspector/pageCopy.ts`**

```typescript
import type { ScanProgress, SiteRef } from '@/types/inspector';
import type { PageState } from './pageState';

export const DISCONNECTED_TEXT = 'Select a connection in Power Platform ToolBox to inspect a site.';
export const NON_DEV_WARNING = "This isn't a development environment. Inspector is designed for dev sites.";
export const NO_SITES_TEXT =
  "No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.";
export const NO_FILES_TEXT = 'No server logic found on this site';
export const NOTHING_READ_TEXT = 'No server logic records were read.';
export const REFRESH_FAILED_TEXT =
  "Couldn't refresh the active connection. This page keeps what it last confirmed and tries again when the window regains focus.";
export const CONNECTION_UNREADABLE_TEXT =
  'This page tries again when the window regains focus or the connection changes.';
/** D-14: the scan was abandoned because the active connection changed under it. */
export const CONNECTION_CHANGED_TITLE = 'The connection changed while scanning';
export const connectionChangedText = (site: SiteRef): string =>
  `The scan of ${site.name} was discarded. Choose a site in the title bar to scan again.`;
/** D-09, D-17: Export report is always disabled in P5.5; P5.7 replaces this with the real action. */
export const EXPORT_REASON = 'Report export arrives in a later update.';
/** D-03, D-18: shown in place of the ring, findings and detail until a file is chosen. */
export const NO_FILE_TEXT = 'Select a file to review its readiness.';

/** Banner, reason and summary texts are Markdown-flavoured for exports (`code`); the page shows them plain. */
export const plain = (text: string): string => text.replaceAll('`', '');

/** "Scanned X of N", with context when N is only the records found so far (FR-7). */
export function progressText(progress: ScanProgress | null): string {
  if (progress === null) return 'Reading server logic records…';
  const count = `Scanned ${String(progress.scanned)} of ${String(progress.total)}`;
  return progress.inventoryComplete
    ? count
    : `${count} found so far. The record list is incomplete.`;
}

/**
 * The polite live-region text. It depends on the state kind and the site only, never on the progress count,
 * so a long scan announces its start and its end and nothing in between.
 */
export function announcementFor(state: PageState): string {
  switch (state.kind) {
    case 'connection-unknown':
      return state.failed ? "Couldn't read the active connection." : 'Checking the active connection.';
    case 'disconnected':
      return 'No active connection.';
    case 'sites-loading':
      return 'Loading sites.';
    case 'sites-error':
      return "Couldn't load sites.";
    case 'no-sites':
      return 'No Power Pages sites found.';
    case 'choose-site':
      return 'Select a site to scan.';
    case 'scanning':
      return `Scanning ${state.site.name}.`;
    case 'scan-failed':
      return `Couldn't scan ${state.site.name}.`;
    case 'connection-changed':
      return `${CONNECTION_CHANGED_TITLE}.`;
    case 'results': {
      const { files, facts } = state.result;
      if (facts.stopped !== null) return 'Scan stopped. The connection was lost.';
      // An empty list says "none" only when it was read completely; otherwise nothing was read.
      if (files.length === 0) return facts.inventoryComplete ? `${NO_FILES_TEXT}.` : NOTHING_READ_TEXT;
      return `Scan finished. ${String(files.length)} server logic ${files.length === 1 ? 'file' : 'files'}.`;
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
```

- [x] **C8. Create `src/features/inspector/StatePanel.tsx`**

```tsx
import type { ReactElement, ReactNode, Ref } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Tile } from '@/components/Tile';

export type StatePanelProps = {
  icon: IconName;
  title: string;
  /** The page moves focus here after Retry or Scan again, whose button hides or unmounts (see `InspectorPage`). */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Plain text under the title. */
  text?: string;
  /** Marks a state that is still working, for assistive technology. */
  busy?: boolean;
  /** Actions that can complete; omit the prop rather than render a disabled stand-in. The one exception is the AC-7.8 Export report (D-17). */
  children?: ReactNode;
};

/** A full-page state of the Inspector: one icon, one title, one sentence and, when it helps, one action. */
export function StatePanel({
  icon,
  title,
  headingRef,
  text,
  busy = false,
  children,
}: StatePanelProps): ReactElement {
  return (
    <Tile className="inspector-state" aria-busy={busy ? true : undefined}>
      <Icon name={icon} size={28} />
      <h2 ref={headingRef} tabIndex={-1} className="inspector-state__title">
        {title}
      </h2>
      {text === undefined ? null : <p className="inspector-state__text">{text}</p>}
      {children}
    </Tile>
  );
}
```

- [x] **C9. Create `src/features/inspector/FilesRail.tsx`**

```tsx
import type { ReactElement } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeKind } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import type { FileResult } from '@/types/inspector';
import { TENANT_POLICY_NOTE } from './model/copy';
import { filePill, fileSummary } from './model/rules';
import { NO_FILES_TEXT, NOTHING_READ_TEXT } from './pageCopy';

const PILL_KIND = { Ready: 'ok', 'Needs review': 'review', Incomplete: 'unknown' } as const satisfies Record<
  ReturnType<typeof filePill>,
  BadgeKind
>;

export type FilesRailProps = {
  files: readonly FileResult[];
  selectedId: string | null;
  /** True when the record list was read completely, so an empty list really means "none". */
  complete: boolean;
  onSelect: (fileId: string) => void;
};

/** The files tile (AC-7.3, AC-8.6, AC-8.7): every record with its status, and the tenant-policy footer. */
export function FilesRail({ files, selectedId, complete, onSelect }: FilesRailProps): ReactElement {
  return (
    <Tile className="inspector-rail" heading={`Server logic (${String(files.length)})`}>
      {files.length === 0 ? (
        <p className="inspector-rail__empty">{complete ? NO_FILES_TEXT : NOTHING_READ_TEXT}</p>
      ) : (
        <ul className="inspector-files">
          {files.map((file) => {
            const pill = filePill(file);
            return (
              <li key={file.fileId}>
                <button
                  type="button"
                  className={classNames('inspector-file', file.fileId === selectedId && 'inspector-file--selected')}
                  aria-current={file.fileId === selectedId ? 'true' : undefined}
                  title={file.name}
                  onClick={() => {
                    onSelect(file.fileId);
                  }}
                >
                  <span className="inspector-file__name">{file.name}</span>
                  <span className="inspector-file__meta">
                    {file.active ? 'Active' : 'Inactive'} · {fileSummary(file)}
                  </span>
                  <StatusBadge kind={PILL_KIND[pill]} label={pill} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="inspector-rail__footer">{TENANT_POLICY_NOTE}</p>
    </Tile>
  );
}
```

- [x] **C10. Create `src/features/inspector/ResultsView.tsx`**

```tsx
import type { ReactElement, Ref } from 'react';
import { useInspector } from '@/app/inspector-site/useInspector';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Tile } from '@/components/Tile';
import type { SiteResult } from '@/types/inspector';
import { FilesRail } from './FilesRail';
import { EXPORT_REASON, plain } from './pageCopy';

export type ResultsViewProps = {
  result: SiteResult;
  /** The title heading: the page moves focus here after Retry in the refresh-failed notice hides itself. */
  headingRef: Ref<HTMLHeadingElement>;
  /** Scan again. The page wraps `session.rescan` so that focus follows to the scanning panel's heading. */
  onRescan: () => void;
};

/** A finished or stopped scan (AC-7.3, AC-7.9, AC-7.10, AC-8.1). Mounted with the scan id as its key. */
export function ResultsView({ result, headingRef, onRescan }: ResultsViewProps): ReactElement {
  const session = useInspector();
  const { files, banners, facts } = result;
  // No file is selected until the user picks one (D-03); the title tile then shows that file (AC-8.1).
  const selected = files.find((file) => file.fileId === session.fileId);
  // The site name (D-18) or `<file> · <status>` (AC-8.1). It ellipsizes, so the full text is also the tooltip.
  const titleLine =
    selected === undefined ? facts.site.name : `${selected.name} · ${selected.active ? 'Active' : 'Inactive'}`;
  const complete = facts.inventoryComplete && facts.stopped === null;

  // Export report is always disabled in P5.5 (D-09, D-17); P5.7 enables it and replaces the reason.
  const exportReport = (
    <Button disabledReason={EXPORT_REASON}>
      <Icon name="arrow-download" size={14} />
      Export report
    </Button>
  );
  const rescan = (
    <Button onClick={onRescan}>
      <Icon name="arrow-clockwise" size={14} />
      Scan again
    </Button>
  );

  return (
    <div className="inspector-results">
      {/* D-10 consequence: every site notice, including AC-7.3's "Inventory incomplete. Reconnect and rescan.",
          renders once in this list above the grid, not inside the files tile. */}
      {banners.length === 0 ? null : (
        <ul className="inspector-banners" aria-label="Site notices">
          {banners.map((banner) => (
            <li key={banner} className="inspector-notice">
              <Icon name="warning" size={16} />
              <span>{plain(banner)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="inspector-grid">
        <FilesRail
          files={files}
          selectedId={selected?.fileId ?? null}
          complete={complete}
          onSelect={session.selectFile}
        />
        <Tile className="inspector-title">
          <div className="inspector-title__text">
            <div className="inspector-title__file" title={titleLine}>
              {titleLine}
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="inspector-title__heading">
              Review server logic readiness
            </h2>
            <p className="inspector-title__sub">
              Inspect access, permissions and outbound networking before release.
            </p>
          </div>
          <div className="inspector-title__actions">
            {exportReport}
            {rescan}
          </div>
        </Tile>
      </div>
    </div>
  );
}
```

- [x] **C11. Create `src/features/inspector/inspector.css`**

```css
/* Logic Inspector, layout 10a on the Graphite tokens. Colours come only from the theme tokens. */

/* Fills the tool below the 42px title bar; below the 1024×700 minimum the window scrolls (NFR). */
.inspector {
  box-sizing: border-box;
  height: max(calc(100vh - 42px), 658px);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text);
}

.inspector-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Notices: neutral, with a glyph and words, so a warning is never colour alone. */
.inspector-banners {
  flex: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
}

.inspector-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: var(--ghost);
  border: 1px solid var(--control-border);
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
}

.inspector-notice .ui-icon {
  margin-top: 2px;
}

/* Page states */
.inspector .inspector-state {
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.inspector-state__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.inspector-state__text {
  max-width: 56ch;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

/* Results */
.inspector-results {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 230px repeat(3, minmax(0, 1fr));
  grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.inspector .ui-tile {
  padding: 18px;
  border-radius: 12px;
}

/* Files tile */
.inspector .inspector-rail {
  grid-column: 1;
  grid-row: 1 / 4;
  gap: 6px;
}

.inspector-files {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  list-style: none;
}

.inspector-file {
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
}

/* The selected file uses the primary role (FR-11), never the needs-review colour. */
.inspector-file--selected {
  background: var(--ghost);
  border-color: var(--primary);
  color: var(--text);
}

.inspector-file__name {
  max-width: 100%;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-file__meta {
  font-size: 11px;
}

.inspector-rail__empty {
  flex: 1;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.5;
}

.inspector-rail__footer {
  margin: auto 0 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.5;
}

/* Title tile */
.inspector .inspector-title {
  grid-column: 2 / 5;
  grid-row: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

/* The text column shrinks so a long site or file name ellipsizes instead of pushing the actions off the tile. */
.inspector-title__text {
  flex: 1;
  min-width: 0;
}

.inspector-title__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.inspector-title__file {
  overflow: hidden;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-title__heading {
  margin: 8px 0 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.inspector-title__sub {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
}
```

- [x] **C12. Replace the entire content of `src/features/inspector/InspectorPage.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useInspector } from '@/app/inspector-site/useInspector';
import { useConnectionState, useRefreshConnection } from '@/app/useActiveConnection';
import type { ConnectionState } from '@/app/useActiveConnection';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  announcementFor,
  CONNECTION_CHANGED_TITLE,
  CONNECTION_UNREADABLE_TEXT,
  connectionChangedText,
  DISCONNECTED_TEXT,
  EXPORT_REASON,
  NO_SITES_TEXT,
  NON_DEV_WARNING,
  progressText,
  REFRESH_FAILED_TEXT,
} from './pageCopy';
import { derivePageState } from './pageState';
import type { PageState } from './pageState';
import { ResultsView } from './ResultsView';
import { StatePanel } from './StatePanel';
import './inspector.css';

/**
 * Retry hides itself while its read runs (D-05) and Scan again unmounts the panel it sits in, so the focused
 * button would vanish and focus would fall to the page body. `request()` is called from those two handlers;
 * after the next commit the heading of the panel on screen (`ref`) takes focus, once. The heading has
 * `tabIndex={-1}`: reachable by script, not a new Tab stop. Retry stays unmounted while pending, not
 * `aria-disabled` (D-05).
 */
function useHeadingFocus(): { ref: RefObject<HTMLHeadingElement | null>; request: () => void } {
  const ref = useRef<HTMLHeadingElement>(null);
  const wanted = useRef(false);
  useEffect(() => {
    if (!wanted.current) return;
    wanted.current = false;
    ref.current?.focus();
  });
  return {
    ref,
    request: () => {
      wanted.current = true;
    },
  };
}

/** D-05: re-reads the connection on demand; offered only after a read rejected, never while one is in flight. */
function RetryConnection({ onRetry }: { onRetry: () => void }): ReactElement | null {
  const { refresh, pending } = useRefreshConnection();
  if (pending) return null;
  return (
    <Button
      onClick={() => {
        onRetry();
        refresh();
      }}
    >
      <Icon name="arrow-clockwise" size={14} />
      Retry
    </Button>
  );
}

/**
 * Persistent, non-blocking notices above every state: the AC-7.5 and AC-7.11 warning for anything but a Dev
 * environment, and a failed refresh that kept the last confirmed connection (WR-005, with Retry).
 */
function PageNotices({
  connection,
  onRetry,
}: {
  connection: ConnectionState;
  onRetry: () => void;
}): ReactElement | null {
  const warnEnvironment =
    connection.status === 'connected' && connection.connection.environment !== 'Dev';
  const refreshFailed = connection.status !== 'unknown' && connection.refreshFailed;
  if (!warnEnvironment && !refreshFailed) return null;
  return (
    <ul className="inspector-banners" aria-label="Page notices">
      {warnEnvironment ? (
        <li className="inspector-notice">
          <Icon name="warning" size={16} />
          <span>{NON_DEV_WARNING}</span>
        </li>
      ) : null}
      {refreshFailed ? (
        <li className="inspector-notice">
          <Icon name="info" size={16} />
          <span>{REFRESH_FAILED_TEXT}</span>
          <RetryConnection onRetry={onRetry} />
        </li>
      ) : null}
    </ul>
  );
}

function PageBody({
  state,
  focus,
}: {
  state: PageState;
  focus: ReturnType<typeof useHeadingFocus>;
}): ReactElement {
  const session = useInspector();
  const { ref: headingRef, request } = focus;
  // Scan again (here and in the results) and the sites Retry move focus to the next panel's heading.
  const rescan = (): void => {
    request();
    session.rescan();
  };
  switch (state.kind) {
    case 'connection-unknown':
      return state.failed ? (
        <StatePanel
          icon="error-circle"
          title="Couldn't read the active connection"
          text={CONNECTION_UNREADABLE_TEXT}
          headingRef={headingRef}
        >
          <RetryConnection onRetry={request} />
        </StatePanel>
      ) : (
        <StatePanel icon="info" title="Checking the active connection" headingRef={headingRef} busy />
      );
    case 'disconnected':
      return (
        <StatePanel
          icon="info"
          title="No active connection"
          text={DISCONNECTED_TEXT}
          headingRef={headingRef}
        />
      );
    case 'sites-loading':
      return (
        <StatePanel
          icon="info"
          title="Loading sites"
          text="Reading the Power Pages sites in this environment."
          headingRef={headingRef}
          busy
        />
      );
    case 'sites-error':
      return (
        <StatePanel
          icon="error-circle"
          title="Couldn't load sites"
          text={state.message}
          headingRef={headingRef}
        >
          <Button
            onClick={() => {
              request();
              session.retrySites();
            }}
          >
            <Icon name="arrow-clockwise" size={14} />
            Retry
          </Button>
        </StatePanel>
      );
    case 'no-sites':
      // AC-7.8 says "Export report is disabled", so the control is shown here too (D-09, D-17).
      return (
        <StatePanel icon="info" title="No sites found" text={NO_SITES_TEXT} headingRef={headingRef}>
          <Button disabledReason={EXPORT_REASON}>
            <Icon name="arrow-download" size={14} />
            Export report
          </Button>
        </StatePanel>
      );
    case 'choose-site':
      return (
        <StatePanel
          icon="target"
          title="Select a site"
          text="Choose a Power Pages site in the title bar to scan its server logic."
          headingRef={headingRef}
        />
      );
    case 'scanning':
      return (
        <StatePanel
          icon="search"
          title={`Scanning ${state.site.name}`}
          text={progressText(state.progress)}
          headingRef={headingRef}
          busy
        />
      );
    case 'scan-failed':
      return (
        <StatePanel
          icon="error-circle"
          title={`Couldn't scan ${state.site.name}`}
          text="The scan stopped because of an unexpected error. Nothing was kept."
          headingRef={headingRef}
        >
          <Button onClick={rescan}>
            <Icon name="arrow-clockwise" size={14} />
            Scan again
          </Button>
        </StatePanel>
      );
    case 'connection-changed':
      // No Scan again: the picker is the one action that can complete from here (D-14).
      return (
        <StatePanel
          icon="info"
          title={CONNECTION_CHANGED_TITLE}
          text={connectionChangedText(state.site)}
          headingRef={headingRef}
        />
      );
    case 'results':
      return (
        <ResultsView
          key={state.result.facts.scanId}
          result={state.result}
          headingRef={headingRef}
          onRescan={rescan}
        />
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

/** Logic Inspector (Story 7 and 8). Every state comes from the app-scoped session and the connection. */
export function InspectorPage(): ReactElement {
  const connection = useConnectionState();
  const session = useInspector();
  const state = derivePageState(connection, session);
  const focus = useHeadingFocus();
  return (
    <section className="inspector" aria-label="Logic Inspector">
      <div role="status" aria-label="Inspector status" className="inspector-sr-only">
        {announcementFor(state)}
      </div>
      <PageNotices connection={connection} onRetry={focus.request} />
      <PageBody state={state} focus={focus} />
    </section>
  );
}
```

- [x] **C13. Run the slice tests again**

```powershell
npm test -- src/features/inspector/InspectorPage.test.tsx src/app/App.inspector.test.tsx tests/buildShape.test.ts
```

Expected: exit 0; `Test Files  3 passed (3)`, `Tests  51 passed (51)` (`InspectorPage.test.tsx` 35, `App.inspector.test.tsx` 3, `buildShape.test.ts` 13).

- [x] **C14. Type, lint and full-suite gates for this slice**

```powershell
npm run typecheck
npx --no-install eslint src tests --max-warnings=0
npm test
```

Expected: `typecheck` and `eslint` exit 0 with no output; `npm test` exits 0 with `Test Files  112 passed (112)`, `Tests  1868 passed (1868)`.

- [x] **C15. Commit**

```powershell
git add -- src/test/fixedDeps.ts src/features/inspector/InspectorPage.test.tsx src/app/App.inspector.test.tsx src/features/inspector/pageState.ts src/features/inspector/pageCopy.ts src/features/inspector/StatePanel.tsx src/features/inspector/FilesRail.tsx src/features/inspector/ResultsView.tsx src/features/inspector/inspector.css src/features/inspector/InspectorPage.tsx tests/buildShape.test.ts
git diff --cached --check
git commit -m "feat(inspector): build the Inspector page states, files rail and site banners"
```

## Sub-slice D — Finished page: readiness ring, finding tiles, detail tile, Mark as reviewed and Undo review

**Commit:** `feat(inspector): add the readiness ring, finding tiles, detail tile and review actions`

### Phase D1 — Failing tests

- [x] **D1. Create `src/features/inspector/ResultsView.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderInspector } from '@/app/inspector-site/inspectorTestHarness';
import type { InspectorHarnessOptions } from '@/app/inspector-site/inspectorTestHarness';
import { SitePill } from '@/app/shell/SitePill';
import { fixedDeps } from '@/test/fixedDeps';
import { CONNECTION, createInspectorHost, OTHER_CONNECTION, SITE_ALPHA } from '@/test/inspectorWorld';
import type { SiteFacts } from '@/types/inspector';
import { CHECK_COPY, NOT_SCANNED_TEXT } from './model/copy';
import { file, permission, read, role, siteFacts } from './model/fixtures';
import { EXPORT_REASON, NO_FILE_TEXT, NO_FILES_TEXT, NOTHING_READ_TEXT } from './pageCopy';
import { InspectorPage } from './InspectorPage';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const GLOBAL_GRANT = permission('perm-1', { scope: 'Global', roleIds: ['staff'] });

const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';

/**
 * file-1: Web role and Outbound configured, Table permissions Needs review (a Global grant).
 * file-2: no web role and an HttpClient call with the default network settings, so two checks need review.
 */
function facts(patch: Partial<SiteFacts> = {}): SiteFacts {
  return siteFacts({
    roles: read([role('staff')]),
    permissions: read([GLOBAL_GRANT]),
    files: [
      file({ id: 'file-1', name: 'customer-summary' }),
      file({ id: 'file-2', name: 'order-sync', roleIds: read([]), code: read(HTTP_CODE) }),
    ],
    ...patch,
  });
}

const rail = () => screen.getByRole('region', { name: /^Server logic \(/ });
const fileButton = (name: RegExp) => within(rail()).getByRole('button', { name });

/** Scans Alpha portal and stops on the finished page with no file selected (D-03). */
async function scanned(data: SiteFacts = facts(), options: InspectorHarnessOptions = {}) {
  const view = renderInspector(
    <>
      <SitePill />
      <InspectorPage />
    </>,
    { deps: fixedDeps(data), ...options },
  );
  await screen.findByRole('heading', { name: 'Select a site' });
  await view.user.click(screen.getByRole('combobox', { name: 'Power Pages site' }));
  await view.user.click(screen.getByRole('option', { name: /Alpha portal/ }));
  await screen.findByRole('heading', { name: 'Review server logic readiness' });
  return view;
}

/** The finished page with the first file, customer-summary, chosen in the rail. */
async function open(data: SiteFacts = facts(), options: InspectorHarnessOptions = {}) {
  const view = await scanned(data, options);
  await view.user.click(fileButton(/customer-summary/));
  return view;
}

const tile = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) });
const detail = (title: string) => screen.getByRole('region', { name: title });
const reviewUpdates = () => screen.getByRole('status', { name: 'Review updates' });

describe('before a file is chosen (D-03, D-18)', () => {
  it('shows one prompt in place of the ring, findings and detail, and the site in the title tile', async () => {
    await scanned();
    expect(screen.getByText(NO_FILE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /addressed/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Web role assigned/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Table permissions' })).toBeNull();
    expect(screen.queryByRole('button', { name: /mark as reviewed|undo review/i })).toBeNull();
    expect(screen.getByText('Alpha portal', { selector: '.inspector-title__file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export report' })).toBeTruthy();
  });

  it('highlights nothing in the rail and keeps its files reachable from the keyboard', async () => {
    const { user } = await scanned();
    const first = fileButton(/customer-summary/);
    const second = fileButton(/order-sync/);
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(document.querySelectorAll('.inspector-file--selected')).toHaveLength(0);
    first.focus();
    await user.keyboard('{Enter}');
    expect(first.getAttribute('aria-current')).toBe('true');
    expect(screen.queryByText(NO_FILE_TEXT)).toBeNull();
  });

  it('shows the chosen file\'s ring, tiles and detail once a file is picked', async () => {
    const { user } = await scanned();
    await user.click(fileButton(/order-sync/));
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('order-sync · Active')).toBeTruthy();
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(detail('Web role assigned')).toBeTruthy();
  });

  it.each([
    ['completely', true],
    ['incompletely', false],
  ] as const)(
    'shows no prompt, ring, finding or detail when no file exists and the list was read %s (D-18 extension)',
    async (_label, inventoryComplete) => {
      await scanned(facts({ files: [], inventoryComplete }));
      expect(screen.queryByText(NO_FILE_TEXT)).toBeNull();
      expect(screen.queryByRole('img', { name: /addressed/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^(Web role assigned|Table permissions|Outbound networking)/ })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Table permissions' })).toBeNull();
      // The rail already says why there is nothing to choose.
      expect(
        screen.getByText(inventoryComplete ? NO_FILES_TEXT : NOTHING_READ_TEXT, { selector: '.inspector-rail__empty' }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    },
  );
});

describe('lines that repeat inside one finding', () => {
  const REASON = 'Global access to contact (Global) from role staff.';

  it('renders each repeated reason and snapshot row without a key warning, and leaves no stale row after switching finding', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Two Global grants on one table for the same role give the same reason text twice (checks.ts).
    const { user } = await open(
      facts({ permissions: read([GLOBAL_GRANT, permission('perm-2', { scope: 'Global', roleIds: ['staff'] })]) }),
    );
    const region = within(detail('Table permissions'));
    expect(region.getAllByText(REASON)).toHaveLength(2);
    expect(region.getAllByText('contact · Global · Read · role staff')).toHaveLength(2);
    await user.click(tile('Outbound networking'));
    expect(within(detail('Outbound networking')).queryByText(REASON)).toBeNull();
    await user.click(tile('Table permissions'));
    expect(within(detail('Table permissions')).getAllByText(REASON)).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('Export report (D-09, D-17)', () => {
  it('is present, disabled with its reason, and a click changes nothing', async () => {
    const { user } = await open();
    const button = screen.getByRole('button', { name: 'Export report' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await user.hover(button);
    expect(screen.getByText(EXPORT_REASON)).toBeTruthy();
    await user.click(button);
    expect(screen.getByRole('img', { name: '2 of 3 addressed' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export report' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('is present for a stopped scan', async () => {
    await scanned(facts({ stopped: 'connection-lost', inventoryComplete: false }));
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export report' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
  });
});

describe('readiness ring (AC-8.1)', () => {
  it('shows "K/3 addressed" and the legend for the selected file', async () => {
    await open();
    const ring = screen.getByRole('img', { name: '2 of 3 addressed' });
    expect(within(ring).getByText('2/3')).toBeTruthy();
    expect(within(ring).getByText('addressed')).toBeTruthy();
    expect(screen.getByText('2 configured · 1 review')).toBeTruthy();
  });

  it('follows the selected file', async () => {
    const { user } = await open();
    await user.click(fileButton(/order-sync/));
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('1 configured · 2 review')).toBeTruthy();
  });

  it('draws a Not scanned check grey, counts it in neither K nor M, and adds it to the legend', async () => {
    await open(
      facts({
        permissions: read([]),
        files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })],
      }),
    );
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('1 configured · 0 review · 2 not scanned')).toBeTruthy();
    expect(document.querySelectorAll('.ui-ring__arc--not-scanned')).toHaveLength(2);
  });
});

describe('finding tiles and selection (AC-8.2, AC-8.3)', () => {
  it('shows three tiles, each with an icon, a title, a summary and a status word', async () => {
    await open();
    const web = tile('Web role assigned');
    expect(within(web).getByText('Configured')).toBeTruthy();
    expect(within(web).getByText('Web role assigned.')).toBeTruthy();
    const tables = tile('Table permissions');
    expect(within(tables).getByText('Needs review')).toBeTruthy();
    expect(within(tables).getByText(/Global access to contact \(Global\) from role staff\./)).toBeTruthy();
    expect(within(tile('Outbound networking')).getByText('Configured')).toBeTruthy();
    expect(document.querySelectorAll('.inspector-finding__icon')).toHaveLength(3);
  });

  it('selects the first Needs-review finding of the selected file', async () => {
    await open();
    expect(tile('Table permissions').getAttribute('aria-current')).toBe('true');
    expect(tile('Web role assigned').getAttribute('aria-current')).toBeNull();
    expect(detail('Table permissions')).toBeTruthy();
  });

  it('falls back to the first check when nothing needs review', async () => {
    await open(facts({ permissions: read([]) }));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(detail('Web role assigned')).toBeTruthy();
  });

  it('chooses a finding by click or keyboard, and remembers the choice for that file', async () => {
    const { user } = await open();
    await user.click(tile('Outbound networking'));
    expect(detail('Outbound networking')).toBeTruthy();
    tile('Web role assigned').focus();
    await user.keyboard('{Enter}');
    expect(detail('Web role assigned')).toBeTruthy();
    await user.click(fileButton(/order-sync/));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    await user.click(fileButton(/customer-summary/));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
  });
});

describe('detail tile (AC-8.4, AC-8.12)', () => {
  it('shows category, status, original reasons, guidance, questions and the snapshot', async () => {
    await open();
    const region = within(detail('Table permissions'));
    expect(region.getByText('Table permissions', { selector: 'p' })).toBeTruthy();
    expect(region.getByText('Needs review')).toBeTruthy();
    expect(region.getByRole('heading', { name: 'Why this needs review' })).toBeTruthy();
    expect(region.getAllByText('Global access to contact (Global) from role staff.')).toHaveLength(1);
    expect(region.getByText(CHECK_COPY.tablePermissions.guidance)).toBeTruthy();
    expect(region.getByRole('heading', { name: 'Questions to consider' })).toBeTruthy();
    for (const question of CHECK_COPY.tablePermissions.questions) {
      expect(region.getByText(question)).toBeTruthy();
    }
    expect(region.getByRole('heading', { name: 'Configuration snapshot' })).toBeTruthy();
    expect(region.getByText('Web roles')).toBeTruthy();
    expect(region.getByText('contact · Global · Read · role staff')).toBeTruthy();
    expect(region.getByText('Outbound')).toBeTruthy();
  });

  it('is a focusable region so its content can be scrolled from the keyboard', async () => {
    await open();
    expect(detail('Table permissions').getAttribute('tabindex')).toBe('0');
  });
});

describe('Mark as reviewed and Undo review (AC-8.5)', () => {
  it('moves the ring, the file summary, the tile and the detail together, and undo reverts them', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(within(tile('Table permissions')).getByText('Reviewed')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('2 configured · 1 reviewed · 0 review')).toBeTruthy();
    const first = fileButton(/customer-summary/);
    expect(first.textContent).toContain('Ready · 1 reviewed');
    expect(within(first).getByText('Ready')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Undo review' })).toBeTruthy();
    expect(within(detail('Table permissions')).getByRole('heading', { name: 'Original reasons' })).toBeTruthy();
    expect(
      within(detail('Table permissions')).getByText('Global access to contact (Global) from role staff.'),
    ).toBeTruthy();
    expect(tile('Table permissions').getAttribute('aria-current')).toBe('true');
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Table permissions in customer-summary.');

    await user.click(screen.getByRole('button', { name: 'Undo review' }));
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 of 3 addressed' })).toBeTruthy();
    expect(first.textContent).toContain('2/3 · 1 to review');
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
    expect(reviewUpdates().textContent).toBe('Review undone: Table permissions in customer-summary.');
  });

  it('announces the same check again in a second file, because the text names the file', async () => {
    // Neither file has a web role, so Web role assigned is the first finding to review in both.
    const { user } = await open(
      facts({
        files: [
          file({ id: 'file-1', name: 'customer-summary', roleIds: read([]) }),
          file({ id: 'file-2', name: 'order-sync', roleIds: read([]) }),
        ],
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Web role assigned in customer-summary.');
    await user.click(fileButton(/order-sync/));
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    // Without the file name this string would equal the last one, React would bail out and the region stay silent.
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Web role assigned in order-sync.');
  });

  it('keeps the selection on the finding that was marked', async () => {
    const { user } = await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', roleIds: read([]) })] }),
    );
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(tile('Table permissions').getAttribute('aria-current')).toBeNull();
  });

  it('marks one file only', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    await user.click(fileButton(/order-sync/));
    expect(within(tile('Web role assigned')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });

  it('offers no button on a Configured finding', async () => {
    const { user } = await open();
    await user.click(tile('Web role assigned'));
    expect(screen.queryByRole('button', { name: /mark as reviewed|undo review/i })).toBeNull();
  });

  it('offers no button when a reason is a read failure', async () => {
    await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', roleIds: { ok: false, reason: 'read-failed' } })] }),
    );
    expect(within(tile('Web role assigned')).getByText('Needs review')).toBeTruthy();
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });

  it('offers no button when the evidence is partly unscanned, even if reasons exist', async () => {
    await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })] }),
    );
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });

  it('shows a Not scanned check grey with its explanation and no button (AC-8.11)', async () => {
    const { user } = await open(
      facts({
        permissions: read([]),
        files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })],
      }),
    );
    const tables = tile('Table permissions');
    expect(within(tables).getByText('Not scanned')).toBeTruthy();
    expect(within(tables).getByText(NOT_SCANNED_TEXT)).toBeTruthy();
    await user.click(tables);
    expect(within(detail('Table permissions')).getAllByText(NOT_SCANNED_TEXT).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });
});

describe('review marks are session state (AC-8.9, AC-7.6)', () => {
  it('discards marks and the file selection on Scan again', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    await user.click(screen.getByRole('button', { name: 'Scan again' }));
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    expect(await screen.findByText(NO_FILE_TEXT)).toBeTruthy();
    await user.click(fileButton(/customer-summary/));
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });

  it('keeps marks when only the connection is renamed, and drops them for a different connection', async () => {
    const host = createInspectorHost();
    const { user } = await open(facts(), { host });
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    host.setConnection({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await screen.findByRole('button', { name: 'Undo review' })).toBeTruthy();
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    await screen.findByRole('heading', { name: 'Select a site' });
    expect(screen.queryByRole('button', { name: /undo review|mark as reviewed/i })).toBeNull();
    await user.click(screen.getByRole('combobox', { name: 'Power Pages site' }));
    await user.click(screen.getByRole('option', { name: new RegExp(SITE_ALPHA.name) }));
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    await user.click(fileButton(/customer-summary/));
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });
});
```

- [x] **D2. Run the new tests with the implementation still absent**

```powershell
npm test -- src/features/inspector/ResultsView.test.tsx
```

Expected: exit 1; `Test Files  1 failed (1)`, `Tests  23 failed | 4 passed (27)`, each failure on a missing ring, tile, prompt or button (for example `Unable to find an accessible element with the role "img" and name "2 of 3 addressed"`); the four passing tests need only the slice C title tile and rail ("highlights nothing in the rail and keeps its files reachable from the keyboard", "is present for a stopped scan", and the two "shows no prompt, ring, finding or detail when no file exists…" cases, which guard what the D6 edit must not break).

### Phase D2 — Implementation

- [x] **D3. Create `src/features/inspector/ReadinessTile.tsx`**

```tsx
import type { ReactElement } from 'react';
import { Ring } from '@/components/Ring';
import { Tile } from '@/components/Tile';
import type { RingState } from '@/lib/ringGeometry';
import type { CheckStatus, FileResult } from '@/types/inspector';
import { countChecks, ringLegend } from './model/rules';

// Configured and Reviewed both count toward K (AC-8.1); Not scanned is its own grey segment.
const RING_STATE = {
  configured: 'done',
  reviewed: 'done',
  'needs-review': 'review',
  'not-scanned': 'not-scanned',
} as const satisfies Record<CheckStatus, RingState>;

/** The readiness ring: "K/3 addressed" with the legend "C configured · V reviewed · M review" (AC-8.1). */
export function ReadinessTile({ file }: { file: FileResult }): ReactElement {
  return (
    <Tile className="inspector-ring" heading="Readiness">
      <Ring
        segments={file.findings.map((finding) => RING_STATE[finding.status])}
        label="addressed"
        size={156}
      />
      <p className="inspector-ring__legend">{ringLegend(countChecks(file.findings))}</p>
    </Tile>
  );
}
```

- [x] **D4. Create `src/features/inspector/FindingTile.tsx`**

```tsx
import type { ReactElement } from 'react';
import { checkStatusBadge } from '@/components/checkStatusBadge';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import type { CheckStatus, Finding } from '@/types/inspector';
import { CHECK_COPY } from './model/copy';
import { plain } from './pageCopy';

const GLYPH = {
  configured: 'checkmark',
  reviewed: 'checkmark',
  'needs-review': 'important',
  'not-scanned': 'subtract',
} as const satisfies Record<CheckStatus, IconName>;

export type FindingTileProps = {
  finding: Finding;
  /** Which of the three grid cells the tile takes (layout 10a): 0, 1 or 2. */
  slot: number;
  selected: boolean;
  onSelect: () => void;
};

/** One finding (AC-8.2): icon, title, one-line summary and a status that always carries a glyph and a word. */
export function FindingTile({ finding, slot, selected, onSelect }: FindingTileProps): ReactElement {
  return (
    <Tile
      className={classNames(
        'inspector-finding',
        `inspector-finding--slot-${String(slot)}`,
        `inspector-finding--${finding.status}`,
      )}
      data-selected={selected}
    >
      <button
        type="button"
        className="inspector-finding__button"
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="inspector-finding__icon" aria-hidden="true">
          <Icon name={GLYPH[finding.status]} size={16} />
        </span>
        <span className="inspector-finding__title">{CHECK_COPY[finding.check].title}</span>
        <span className="inspector-finding__summary">{plain(finding.summary)}</span>
        <StatusBadge {...checkStatusBadge(finding.status)} />
      </button>
    </Tile>
  );
}
```

- [x] **D5. Create `src/features/inspector/FindingDetail.tsx`**

```tsx
import type { ReactElement } from 'react';
import { checkStatusBadge } from '@/components/checkStatusBadge';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import type { FileResult, Finding } from '@/types/inspector';
import { CHECK_COPY } from './model/copy';
import { canReviewFinding } from './model/rules';
import { plain } from './pageCopy';

export type FindingDetailProps = {
  file: FileResult;
  finding: Finding;
  /** Marks the finding reviewed, or undoes the mark. Only offered when the rules allow it. */
  onToggleReview: () => void;
};

/**
 * React keys for lines that can repeat: the text plus how many identical lines came before it. Two Global
 * grants on one table give the same reason and the same snapshot row twice, and a bare text key would collide.
 */
function keyedLines(lines: readonly string[]): readonly { key: string; text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((text) => {
    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    return { key: `${text}#${String(occurrence)}`, text };
  });
}

function SnapshotGroup({ term, items }: { term: string; items: readonly string[] }): ReactElement {
  return (
    <>
      <dt>{term}</dt>
      <dd>
        {items.length === 0 ? (
          'None'
        ) : (
          <ul>
            {keyedLines(items).map(({ key, text }) => (
              <li key={key}>{plain(text)}</li>
            ))}
          </ul>
        )}
      </dd>
    </>
  );
}

/**
 * The detail tile (AC-8.4, AC-8.5, AC-8.12): status, the reasons (kept after a review, so Reviewed is never
 * read as "was fine"), guidance, questions and the file's configuration snapshot. The review button follows
 * `canReviewFinding` exactly, so missing evidence can never be turned into Ready.
 */
export function FindingDetail({ file, finding, onToggleReview }: FindingDetailProps): ReactElement {
  const copy = CHECK_COPY[finding.check];
  const reasons = finding.reasons.map((reason) => reason.text);
  const notes = finding.detail.filter((line) => !reasons.includes(line));
  const action =
    finding.status === 'reviewed'
      ? 'Undo review'
      : canReviewFinding(finding)
        ? 'Mark as reviewed'
        : null;
  return (
    <Tile
      className="inspector-detail"
      heading={copy.title}
      aside={<StatusBadge {...checkStatusBadge(finding.status)} />}
      tabIndex={0}
    >
      <p className="inspector-detail__category">{copy.category}</p>
      {action === null ? null : (
        <div>
          <Button onClick={onToggleReview}>{action}</Button>
        </div>
      )}
      {reasons.length === 0 ? null : (
        <section>
          <h3 className="inspector-detail__heading">
            {finding.status === 'reviewed' ? 'Original reasons' : 'Why this needs review'}
          </h3>
          <ul>
            {keyedLines(reasons).map(({ key, text }) => (
              <li key={key}>{plain(text)}</li>
            ))}
          </ul>
        </section>
      )}
      {notes.length === 0 ? null : (
        <ul>
          {keyedLines(notes).map(({ key, text }) => (
            <li key={key}>{plain(text)}</li>
          ))}
        </ul>
      )}
      <p>{finding.guidance}</p>
      <section>
        <h3 className="inspector-detail__heading">Questions to consider</h3>
        <ul>
          {finding.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="inspector-detail__heading">Configuration snapshot</h3>
        <dl className="inspector-snapshot">
          <SnapshotGroup term="Web roles" items={file.snapshot.roles} />
          <SnapshotGroup term="Tables" items={file.snapshot.tables} />
          <SnapshotGroup term="Outbound" items={file.snapshot.outbound} />
        </dl>
      </section>
    </Tile>
  );
}
```

- [x] **D6. Edit existing code**

In `src/features/inspector/ResultsView.tsx`:

```diff
+import { useState } from 'react';
 import type { ReactElement } from 'react';
 import { useInspector } from '@/app/inspector-site/useInspector';
```

In `src/features/inspector/ResultsView.tsx`:

```diff
-import type { SiteResult } from '@/types/inspector';
-import { FilesRail } from './FilesRail';
-import { EXPORT_REASON, plain } from './pageCopy';
+import type { CheckId, ReviewKey, SiteResult } from '@/types/inspector';
+import { FilesRail } from './FilesRail';
+import { FindingDetail } from './FindingDetail';
+import { FindingTile } from './FindingTile';
+import { CHECK_COPY } from './model/copy';
+import { EXPORT_REASON, NO_FILE_TEXT, plain } from './pageCopy';
+import { ReadinessTile } from './ReadinessTile';
```

In `src/features/inspector/ResultsView.tsx`:

```diff
   const complete = facts.inventoryComplete && facts.stopped === null;
+  // The finding the user chose, per file. Until one is chosen the first Needs-review finding is selected (AC-8.3).
+  const [chosen, setChosen] = useState<Readonly<Record<string, CheckId>>>({});
+  const [announcement, setAnnouncement] = useState('');
+  const finding =
+    selected === undefined
+      ? undefined
+      : (selected.findings.find((candidate) => candidate.check === chosen[selected.fileId]) ??
+        selected.findings.find((candidate) => candidate.status === 'needs-review') ??
+        selected.findings[0]);
+
+  const choose = (check: CheckId): void => {
+    if (selected !== undefined) setChosen({ ...chosen, [selected.fileId]: check });
+  };
+  const toggleReview = (): void => {
+    if (selected === undefined || finding === undefined) return;
+    const key: ReviewKey = `${selected.fileId}:${finding.check}`;
+    const reviewed = finding.status !== 'reviewed';
+    session.setReviewed(key, reviewed);
+    // Pin the selection so the marked finding does not jump to the next Needs-review one.
+    choose(finding.check);
+    // The file name keeps the text different when the same check is marked in a second file; an identical
+    // string would make React skip the update and the live region would stay silent.
+    setAnnouncement(
+      `${reviewed ? 'Marked as reviewed' : 'Review undone'}: ${CHECK_COPY[finding.check].title} in ${selected.name}.`,
+    );
+  };
 
```

In `src/features/inspector/ResultsView.tsx`:

```diff
           <div className="inspector-title__actions">
             {exportReport}
             {rescan}
           </div>
         </Tile>
+        {/* D-18 extension: with no files there is nothing to choose, so these cells stay empty and the rail says why. */}
+        {files.length === 0 ? null : selected === undefined || finding === undefined ? (
+          <Tile className="inspector-prompt">
+            <Icon name="document" size={28} />
+            <p className="inspector-prompt__text">{NO_FILE_TEXT}</p>
+          </Tile>
+        ) : (
+          <>
+            <ReadinessTile file={selected} />
+            {selected.findings.map((candidate, index) => (
+              <FindingTile
+                key={candidate.check}
+                finding={candidate}
+                slot={index}
+                selected={candidate.check === finding.check}
+                onSelect={() => {
+                  choose(candidate.check);
+                }}
+              />
+            ))}
+            <FindingDetail
+              key={`${selected.fileId}:${finding.check}`}
+              file={selected}
+              finding={finding}
+              onToggleReview={toggleReview}
+            />
+          </>
+        )}
+      </div>
+      <div role="status" aria-label="Review updates" className="inspector-sr-only">
+        {announcement}
       </div>
     </div>
   );
```

In `src/features/inspector/inspector.css`:

```diff
 .inspector-title__sub {
   margin: 8px 0 0;
   color: var(--muted);
   font-size: 13px;
 }
+
+/* Readiness ring */
+.inspector .inspector-ring {
+  grid-column: 2;
+  grid-row: 2 / 4;
+  align-items: center;
+  justify-content: center;
+  gap: 18px;
+}
+
+.inspector-ring__legend {
+  margin: 0;
+  color: var(--muted);
+  font-size: 12px;
+  text-align: center;
+}
+
+/* Finding tiles: the whole tile is one button. */
+.inspector .inspector-finding {
+  padding: 0;
+}
+
+.inspector-finding--slot-0 {
+  grid-column: 3;
+  grid-row: 2;
+}
+
+.inspector-finding--slot-1 {
+  grid-column: 4;
+  grid-row: 2;
+}
+
+.inspector-finding--slot-2 {
+  grid-column: 3;
+  grid-row: 3;
+}
+
+.inspector-finding__button {
+  box-sizing: border-box;
+  width: 100%;
+  height: 100%;
+  padding: 18px;
+  display: flex;
+  flex-direction: column;
+  align-items: flex-start;
+  gap: 8px;
+  background: transparent;
+  border: 0;
+  border-radius: inherit;
+  color: inherit;
+  cursor: pointer;
+  font: inherit;
+  text-align: left;
+}
+
+/* The tile clips overflow, so the focus ring is drawn inside it. */
+.inspector-finding__button:focus-visible,
+.inspector-file:focus-visible {
+  outline-offset: -3px;
+}
+
+.inspector-finding__icon {
+  width: 30px;
+  height: 30px;
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  background: var(--ok-tint);
+  border: 1px solid var(--primary);
+  border-radius: 10px;
+  color: var(--primary-text);
+}
+
+.inspector-finding__title {
+  font-size: 15px;
+  font-weight: 700;
+}
+
+.inspector-finding__summary {
+  color: var(--muted);
+  font-size: 12.5px;
+  line-height: 1.5;
+}
+
+.inspector-finding .ui-pill {
+  margin-top: auto;
+}
+
+/* Needs review (D-21 B): every such tile takes the review tint and border and carries the tinted "!" icon and
+   the word. Deliberate FR-11 interpretation: --review-tint marks the role on tiles as well as pills. */
+.inspector .inspector-finding--needs-review {
+  background: var(--review-tint);
+  border-color: var(--review);
+}
+
+.inspector-finding--needs-review .inspector-finding__icon {
+  background: var(--review-tint);
+  border-color: var(--review);
+  color: var(--review);
+}
+
+.inspector-finding--not-scanned {
+  border-style: dashed;
+}
+
+.inspector-finding--not-scanned .inspector-finding__icon {
+  background: transparent;
+  border-style: dashed;
+  border-color: var(--control-border);
+  color: var(--muted);
+}
+
+/* Selection (D-21 B): the selected tile takes the primary inset ring, on top of its tint when it needs review;
+   the focus-visible outline above is unchanged. */
+.inspector .inspector-finding[data-selected='true'] {
+  box-shadow: inset 0 0 0 2px var(--primary);
+}
+
+/* Detail tile: one 10a cell, scrollable. */
+.inspector .inspector-detail {
+  grid-column: 4;
+  grid-row: 3;
+  gap: 10px;
+  overflow-y: auto;
+  font-size: 12px;
+  line-height: 1.5;
+}
+
+.inspector-detail p {
+  margin: 0;
+}
+
+.inspector-detail ul {
+  margin: 0;
+  padding-left: 18px;
+}
+
+.inspector-detail__category {
+  color: var(--muted);
+}
+
+.inspector-detail__heading {
+  margin: 0 0 4px;
+  color: var(--muted);
+  font-size: 11px;
+  font-weight: 600;
+  letter-spacing: 0.04em;
+  text-transform: uppercase;
+}
+
+.inspector-snapshot {
+  margin: 0;
+}
+
+.inspector-snapshot dt {
+  font-weight: 700;
+}
+
+.inspector-snapshot dd {
+  margin: 0 0 6px;
+  overflow-wrap: anywhere;
+}
+
+/* No file selected yet (D-03, D-18): one prompt where the ring, findings and detail will go. */
+.inspector .inspector-prompt {
+  grid-column: 2 / 5;
+  grid-row: 2 / 4;
+  align-items: center;
+  justify-content: center;
+  gap: 10px;
+  color: var(--muted);
+  text-align: center;
+}
+
+.inspector-prompt__text {
+  margin: 0;
+  font-size: 14px;
+}
```

- [x] **D7. Run the slice tests again**

```powershell
npm test -- src/features/inspector/ResultsView.test.tsx
```

Expected: exit 0; `Test Files  1 passed (1)`, `Tests  27 passed (27)`.

- [x] **D8. Type, lint and full-suite gates for this slice**

```powershell
npm run typecheck
npx --no-install eslint src tests --max-warnings=0
npm test
```

Expected: `typecheck` and `eslint` exit 0 with no output; `npm test` exits 0 with `Test Files  113 passed (113)`, `Tests  1895 passed (1895)`.

- [x] **D9. Commit**

```powershell
git add -- src/features/inspector/ResultsView.test.tsx src/features/inspector/ReadinessTile.tsx src/features/inspector/FindingTile.tsx src/features/inspector/FindingDetail.tsx src/features/inspector/ResultsView.tsx src/features/inspector/inspector.css
git diff --cached --check
git commit -m "feat(inspector): add the readiness ring, finding tiles, detail tile and review actions"
```

---

## Rendered check (local, not committed)

The repo has no tracked hostless preview: `@shko.online/pptb-mock` is not a dependency and `vite.config.ts` applies `fixHtmlForPPTB`, which strips `type="module"` and so cannot run as a dev server. This step uses the fake host the tests already use. The three files live in `.rm-frontend-review/p5-5/` (a git-ignored directory) and are removed afterwards; they are not part of any commit and must not exist when `npm run lint` runs (ESLint would lint `preview.ts` outside a TypeScript project).

- [x] **R1. Create the three files**

`.rm-frontend-review/p5-5/preview.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>P5.5 preview (fake host)</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./preview.ts"></script>
  </body>
</html>
```

`.rm-frontend-review/p5-5/preview.ts`:

```typescript
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { applyTheme } from '@/app/useHostTheme';
import {
  createInspectorHost,
  DEFAULT_WORLD,
  HTTP_CODE,
  PLAIN_CODE,
  ROLE_ANONYMOUS,
  ROLE_STAFF,
  SITE_ALPHA,
  SITE_BETA,
  SITE_RETIRED,
} from '@/test/inspectorWorld';
import type { World } from '@/test/inspectorWorld';
import '@/index.css';

// Local review page: the real app on the fake host, with a few worlds chosen by query string.
// ?theme=dark|light  ?world=default|long  ?env=dev|prod
const params = new URLSearchParams(location.search);
applyTheme(params.get('theme') === 'dark' ? 'dark' : 'light');

const LONG: World = {
  sites: [
    {
      ref: {
        ...SITE_ALPHA,
        name: 'Contoso customer self-service portal (production replica for the northern region)',
        domain: 'contoso-customer-self-service-portal-north.powerappsportals.com',
      },
      files: Array.from({ length: 14 }, (_, index) => ({
        n: index + 1,
        name: `customer-order-synchronisation-handler-with-a-very-long-name-${String(index + 1)}`,
        roleIds: index % 3 === 0 ? [ROLE_ANONYMOUS] : [ROLE_STAFF],
        code: index % 2 === 0 ? HTTP_CODE : PLAIN_CODE,
        statecode: index % 5 === 4 ? 1 : 0,
      })),
    },
    { ref: SITE_BETA, files: [] },
    { ref: SITE_RETIRED, files: [] },
  ],
};

const world = params.get('world') === 'long' ? LONG : DEFAULT_WORLD;
const host = createInspectorHost(world, {
  id: 'connection-1',
  name: 'Contoso with a long connection name',
  url: 'https://example.crm.dynamics.com',
  environment: params.get('env') === 'prod' ? 'Production' : 'Dev',
});
Object.defineProperty(window, '__host', { value: host });
const root = document.getElementById('root');
if (root !== null) createRoot(root).render(createElement(App, { host }));
```

`.rm-frontend-review/p5-5/vite.config.ts`:

```typescript
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Local review server for the P5.5 rendered check. The app config's PPTB HTML plugin strips type="module",
// which a dev server cannot run, so this config is the app's compile setup without it. Not committed.
const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
const EMPTY_MODULE = fromRoot('../../src/lib/emptyModule.ts');

export default defineConfig({
  root: fromRoot('../..'),
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      '@': fromRoot('../../src'),
      html2canvas: EMPTY_MODULE,
      canvg: EMPTY_MODULE,
      dompurify: EMPTY_MODULE,
    },
  },
  define: {
    __PAGE_STARTER__: 'true',
    __PAGE_OBJECTS__: 'true',
    __PAGE_INSPECTOR__: 'true',
  },
});
```

- [x] **R2. Start the review server**

```powershell
npx vite --config .rm-frontend-review/p5-5/vite.config.ts --port 5178 --host 127.0.0.1
```

Open `http://127.0.0.1:5178/.rm-frontend-review/p5-5/preview.html?theme=light` (query: `theme=dark|light`, `world=default|long`, `env=dev|prod`). In a Playwright-driven browser set the viewport, open the Logic Inspector tab, open the site picker, choose the first site, and capture screenshots (save them outside the repository):

| Check | Viewports | Themes |
|---|---|---|
| Picker open (active, inactive options), finished page for `world=default` before a file is chosen (the prompt, the site name in the title tile, Scan again and the disabled Export report with its reason on hover and focus), then with a file chosen | 1024×700 and 1100×780 | light and dark |
| Finished page for `world=long` with `env=prod` (long site, connection and file names, 14 files, non-Dev warning) | 1024×700 and 1100×780 | light and dark |
| Retry on the "Couldn't read the active connection" panel and in the refresh-failed notice (`window.__host.setConnectionRead('reject')`, then `window.__host.emit({ kind: 'connection-changed' })`); "The connection changed while scanning" (`window.__host.holdDataReads(true)`, choose a site, `window.__host.setConnection({ ...connection, id: 'other' })`, `window.__host.holdDataReads(false)`). | 1024×700 | light and dark |

For each: `document.documentElement.scrollWidth` equals the viewport width (no horizontal scroll), the picker stays on screen, the files rail and the detail tile scroll inside their cells, the selected file uses the primary border and the selected finding tile shows the primary inset ring (D-21 B), every Needs-review tile is tinted (`--review-tint` background, `--review` border) and shows the tinted `!` icon, glyph and word; the tile tint is a deliberate FR-11 interpretation (D-21 B), so compare layout, not tint, against references 05 and 06, the focus ring is visible on the tiles, files and picker (Tab through them), and nothing is clipped.

- [x] **R3. Remove the files**

```powershell
Remove-Item -Recurse -Force .rm-frontend-review/p5-5
```

Observed while drafting and again at the 2026-11-02 revision (fake host, Chromium via Playwright): the picker, the no-file view, the Export report reason, the finished page with a file chosen, the refresh-failed notice with Retry and "The connection changed while scanning" render correctly at 1024×700 and 1100×780 in both themes, and `scrollWidth` equals the viewport width in every state. The revision's long-name check found the site name in the title tile pushing Export report and Scan again off the tile; `.inspector-title__text` (`flex: 1; min-width: 0`) fixes it and the names ellipsize. The "Couldn't read the active connection" Retry panel needs the first read to reject before the app mounts, which the preview cannot stage; its tests cover it. The 1024×700 long-name check found the connection label pushing the picker off screen (horizontal scroll); that is why D-15 and G11 exist, and after the fix `scrollWidth` equals the viewport width at both sizes. The detail tile is tight in its single cell (D-12). **Still open (RG-005):** screen-reader announcements, the complete keyboard route in the PPTB Desktop host, 200% zoom, actual control contrast in the real host, and the live host contract (RG-002). None of these are claimed by this slice.

---

## Gates and commit order

After the four slice commits:

```powershell
npm run typecheck
npx --no-install eslint src tests --max-warnings=0
npm run lint
npm test
npm run build
```

Expected: `typecheck` exits 0 with no output; `eslint` and `npm run lint` exit 0 with no output; `npm test` exits 0 with `Test Files  113 passed (113)` and `Tests  1895 passed (1895)` (baseline 105 / 1727, so +8 files and +168 tests); `npm run build` exits 0 and prints `dist/assets/index-<hash>.js` at about 988.32 kB (baseline 932.90 kB; the increase is the Inspector session, picker and page, and the build tests prove the starter-only and beta bundles contain none of it). Whitespace is not re-checked here: a check after the commits could never fail, because the index is clean by then. The check that can fail is `git diff --cached --check`, run before each commit (the execution convention above; the C and D commit steps and this one list it), and it must have printed nothing each time. A diagnostic in a file listed in this plan is a P5.5 failure; an unrelated diagnostic is recorded against the baseline. The repo's stop hook can start a second Vitest run alongside `npm test`; if a run fails on a timeout, run it again once the hook has finished before judging it.

## Evidence

- [x] **E1. Record evidence**

Create `docs/phase-5/evidence/p5-5/execution.md` with the same sections as `docs/phase-5/evidence/p5-4/execution.md`: a header (plan path, execution date, branch, baseline `1e0156b`), `## Commits` (the four hashes and messages), `## Gate output` (tables of command / observed / expected for each slice's failing signal, its confirm run and its full-suite count, then the final gates above), `## Rendered check` (the R2 matrix: viewport, theme, result, and where the screenshots were saved), `## Deviations from the plan text` (anything the executor changed, including line-ending handling and the statement that `scan.test.ts` and `src/services/pptb/` were not touched), `## Observation` (the stop-hook note if it applied), and `## Still open` (RG-002 live host contract, RG-005 screen-reader, zoom and host keyboard checks, P5.7 export, the owner's pending D-xx answers).

In the same step add the plan's row to `docs/phase-5/README.md` (the README rule cited in Pre-execution item 2) and stage it with the rest. The plan and the choices file are at `docs/phase-5/plans/` by now (Pre-execution item 2), so these are the paths to stage:

```powershell
git add -- docs/phase-5/evidence/p5-5/execution.md docs/phase-5/plans/p5-5_plan.md docs/phase-5/plans/P5-5choices.md docs/phase-5/README.md
git diff --cached --check
git commit -m "docs(phase-5): P5.5 execution evidence, plan ticked"
```

---

## Exit proof for P5.5

- **Page tests exercise the real session and reader with the fake host**: `InspectorPage.test.tsx`, `ResultsView.test.tsx`, `SitePill.test.tsx` and `App.inspector.test.tsx` run `InspectorSessionProvider`, `ConnectionProvider`, `runScan` and `listSites` against `createInspectorHost` (the fake host behind `gatedHost`); only display tests that need exact facts inject `fixedDeps`.
- **Switching away during a delayed scan**: `inspectorSession.test.ts` ("aborts the old scan and never starts new reads until the old ones settled (four at most)", "shows only the newer site when a different site is selected mid-scan"), `InspectorPage.test.tsx` ("discards a delayed scan when the user selects another site", "…when the connection changes under it, and reloads the site list") and `App.inspector.test.tsx` ("discards a scan that is still running when the connection changes while another tab is visible"). The gate holds each read on a latch, counts the peak in flight (exactly 4, never 8) and rejects held reads with `AbortError` when their signal aborts, except in the `ignoreAbort` hold mode (A5), which keeps a read parked past the abort to stage an adapter call that is already in flight (`inspectorSession.test.ts` "keeps at most four reads in flight across generations when the host ignores abort").
- **Connection refresh failure and recovery**: `ConnectionProvider.test.tsx` (rejection keeps the confirmed connection and flags the failure, a rejected first read is unknown, focus and visibility recover, a superseded read and a late read after unmount are ignored, listeners are removed; Retry re-reads, is superseded by a newer read, reports `pending`, clears the failure on success and keeps the connection on failure), `InspectorSessionProvider.test.tsx` ("keeps results through a rejected refresh and recovers on focus"), `InspectorPage.test.tsx` ("tells checking from unreadable…", "offers Retry once a read rejected, hides it while the retry runs, and recovers", "keeps the results and says so when a refresh fails…", the two "Retry in the refresh-failed notice" tests) and `App.test.tsx` ("does not call an unreadable connection Not connected").
- **No site list reload on a same-identity event (D-16 A)**: `inspectorSession.test.ts` describe "site list loads (D-16 A)" ("does not reload for a same-identity adopt, however often the connection is re-read", "leaves results, marks, the selection and a running scan alone for a same-identity adopt", "reloads a failed list in the open on Retry"), and `InspectorSessionProvider.test.tsx` "no site list reload for a same-identity event (D-16 A)" (the list, results and marks stay; no reload on focus or visibility).
- **Focus after Retry and Scan again**: `InspectorPage.test.tsx` "focus after Retry and Scan again" (focus lands on the panel heading after Retry on the unreadable-connection panel, Retry in the refresh-failed notice, and Scan again from the results and from a failed scan; Retry is hidden while pending, not `aria-disabled`, so the D-05 test is unchanged).
- **The connection changed under a scan (D-14 B)**: `inspectorSession.test.ts` ("drops the facts… and says so", "after the connection changed under a scan": rescan ignored, same-identity re-read keeps the message, new identity and a chosen site leave it), `InspectorSessionProvider.test.tsx` ("shows no site in the picker…") and `InspectorPage.test.tsx` ("says the connection changed while scanning, offers no Scan again, and clears for the new identity", "leaves … by choosing a site").
- **Review invalidation**: `ResultsView.test.tsx` ("discards marks and the file selection on Scan again", "keeps marks when only the connection is renamed, and drops them for a different connection"), `inspectorSession.test.ts` (marks and file selection cleared by a rescan, a different site, a changed id, a changed URL and a successful null; kept for a rename), and the review button rules (no button for Configured, read-failure or partly unscanned findings).
- **Build marker updated**: `tests/buildShape.test.ts` no longer mentions the placeholder; the all-pages bundle must contain `Review server logic readiness` and the `useInspector` error text, and the starter-only and beta bundles must contain neither (they build with `VITE_RELEASED_PAGES=starter` and `--mode beta`).
- **One host subscription**: `App.test.tsx` "registers one host event listener for the whole app" passes unchanged (2), and `InspectorSessionProvider.test.tsx` ("adds no host subscription of its own") asserts the provider adds none.
- **Compiles independently of P5.7**: there is no export dialog or `saveFile` call in this slice. The Export report button exists but is permanently disabled (`aria-disabled`, reason "Report export arrives in a later update.", clicks ignored): `InspectorPage.test.tsx` (`expectDisabledExport` for a finished scan, an empty site and the no-sites panel) and `ResultsView.test.tsx` "Export report (D-09, D-17)" (a click changes nothing; present for a stopped scan).
- **No file selected after a scan (D-03 C)**: `ResultsView.test.tsx` "before a file is chosen" (the prompt in place of the ring, tiles and detail; nothing highlighted and the rail reachable from the keyboard; the chosen file's ring once picked; with zero files, complete or incomplete, no prompt, ring, tile or detail, per the D-18 extension) and `InspectorPage.test.tsx` "lists every file with its status, selects none until the user does…" (including the `title` tooltip on the title line). Repeated lines (two Global grants on one table) and the second-file announcement are covered by `ResultsView.test.tsx` "lines that repeat inside one finding" and "announces the same check again in a second file…"; an empty incomplete list is announced as nothing read by `InspectorPage.test.tsx` "announces "nothing was read"…".
- **Open by design**: RG-002 (real `connection:*` payload and refresh-rejection shapes in the PPTB host), RG-005 (screen-reader, 200% zoom and host keyboard checks), RG-001, RG-003 and RG-004 from P5.4, and everything in P5.7.

## Self-review

**Spec:** D-16 A keeps same-identity events within AC-7.6 (title bar and AC-7.5 warning only). The one spec delta is D-19 C: a reloaded site list that omits the selected site resets the Inspector to 'Select a site' and drops that site's results and marks; recorded as pre-execution step 1 (`sdd-spec-update`). AC-7.3 placement is a D-10 consequence. D-20 is superseded. AC-7.3's "Inventory incomplete. Reconnect and rescan." showing in the Site notices list rather than inside the files tile is a D-10 consequence, not a spec edit. D-18's empty-site rule and D-21's tile tint are page decisions the spec does not describe.

**Spec coverage** (requirement → the test that proves it):

| Requirement | Test |
|---|---|
| AC-1.2 the pill is the picker; AC-1.3 disabled with no connection | `SitePill.test.tsx` "is disabled and explains itself while no connection is active"; `App.test.tsx` "reads Not connected and keeps the site pill disabled" |
| AC-1.7 no pill, no session while unreleased | `App.test.tsx` "does not render the site pill while Logic Inspector is unreleased"; build tests |
| AC-7.1 disconnected, no findings | `InspectorPage.test.tsx` "asks for a connection when none is active…" |
| AC-7.2 active selectable, inactive disabled and labelled, no preselection, none for a single site | `SitePill.test.tsx` "offers active sites and lists inactive ones disabled…", "does not select the only site on its own"; `SiteCombobox.test.tsx` "lists inactive sites disabled and labelled Inactive…"; `inspectorSession.test.ts` "loads the sites… even for a single site"; `InspectorPage.test.tsx` "never selects a site on its own…" |
| APG select-only keys (open, move, commit, cancel, type-ahead) | `SiteCombobox.test.tsx` (opens with Enter, Space, Down, Alt+Down; arrows, Home and End; commits with Enter, Space, Alt+Up; Tab only after a move; Escape; type-ahead; click; outside press and blur; unavailable with reason) |
| AC-7.3 files tile with status, inactive listed and checked, inventory incomplete | `InspectorPage.test.tsx` "lists every file with its status…", "does not claim no server logic…", "shows every site banner above the files" |
| AC-7.4 no server logic, Export report disabled (D-09, D-17) | `InspectorPage.test.tsx` "says there is no server logic only when the list was read completely, with Export report disabled", "shows Export report disabled, with its reason, for a finished scan"; `ResultsView.test.tsx` "Export report (D-09, D-17)" |
| AC-7.5, AC-7.11 non-Dev and Unknown warning, scanning stays available | `InspectorPage.test.tsx` "shows no warning for a Dev connection", "warns for a %s connection without blocking the scan" |
| AC-7.6 id/URL change, null, other tab visible; rename keeps results; superseded results never shown | `inspectorSession.test.ts` "connection identity (AC-7.6)" (rename, id, URL, null), "drops the facts of a scan that finds the connection changed"; `InspectorSessionProvider.test.tsx` (rename, never rendered for the new connection, null, rejected refresh); `App.inspector.test.tsx` (other tab visible, scan still running) |
| AC-7.7, AC-8.5 read failure is never reviewable | `ResultsView.test.tsx` "offers no button when a reason is a read failure" |
| AC-7.8 no sites, Export report disabled | `InspectorPage.test.tsx` "says there are no enhanced data model sites, scans nothing, and shows Export report disabled" |
| AC-7.9, AC-7.12, default-role, unreadable-row, inventory banners | `InspectorPage.test.tsx` "shows every site banner above the files" |
| AC-7.10 partial results kept, Scan again replaces | `InspectorPage.test.tsx` "keeps the partial results of a scan that stopped on connection loss", "shows the title, the sub-line and a Scan again that replaces the results" |
| D-03 and D-18 no file until chosen; D-19 C reset (store guard, B); D-14 connection changed | `ResultsView.test.tsx` "before a file is chosen"; `inspectorSession.test.ts` describe "site list loads (D-16 A)" (the D-19 C guard is defensive and has no public-API test); `InspectorPage.test.tsx` "says the connection changed while scanning…" |
| Site list can't be read: "Couldn't load sites", reason, Retry | `InspectorPage.test.tsx` "shows the reason and a Retry that reloads the list…"; `inspectorSession.test.ts` "reports a failed read with its reason, and Retry reloads it" |
| FR-7 scan ID, supersede, at most four reads | `inspectorSession.test.ts` (scan id pattern, switching away tests with `peak` 4) |
| FR-7 / F49 "Scanned X of N", incomplete-inventory context, polite announcements | `InspectorPage.test.tsx` "shows Scanned X of N, says when the list is incomplete, and announces only start and end" |
| AC-8.1 ring "K/3 addressed", legend, Not scanned grey and counted apart, three tiles, detail tile | `ResultsView.test.tsx` "readiness ring (AC-8.1)" (three tests), "shows three tiles…", "shows category, status, original reasons…" |
| AC-8.2 icon, title, summary, status word | `ResultsView.test.tsx` "shows three tiles, each with an icon, a title, a summary and a status word" |
| AC-8.3 first Needs-review finding else first | `ResultsView.test.tsx` "selects the first Needs-review finding…", "falls back to the first check when nothing needs review" |
| AC-8.4 detail content | `ResultsView.test.tsx` "shows category, status, original reasons, guidance, questions and the snapshot" |
| AC-8.5 Mark, Undo, not for Configured, not for read failure or unscanned evidence | `ResultsView.test.tsx` "Mark as reviewed and Undo review" (seven tests) |
| AC-8.6 file summary; AC-8.10 file pill | `ResultsView.test.tsx` (rail summaries and pill after mark and undo); `InspectorPage.test.tsx` "lists every file with its status…" |
| AC-8.7 tenant-policy footer | `InspectorPage.test.tsx` "lists every file with its status…" |
| AC-8.9 marks are session state | `ResultsView.test.tsx` "review marks are session state"; `inspectorSession.test.ts` |
| AC-8.11 Not scanned text, no button | `ResultsView.test.tsx` "shows a Not scanned check grey with its explanation and no button" |
| AC-8.12 Reviewed keeps the original reasons | `ResultsView.test.tsx` "moves the ring, the file summary, the tile and the detail together…" ("Original reasons") |
| WR-005 keep identity, separate failure, recover on focus, visibility and Retry, cleanup | `ConnectionProvider.test.tsx` (all, including describe "Retry (D-05, S-06)"), `InspectorPage.test.tsx` "offers Retry once a read rejected…", `App.test.tsx` "does not call an unreadable connection Not connected" |
| CR-001 one session around title bar and pages, handled while another tab is visible | `App.test.tsx` "keeps following the connection while Logic Starter is visible"; `App.inspector.test.tsx` |
| StrictMode safety of the store | `InspectorSessionProvider.test.tsx` "survives StrictMode double effects…"; `inspectorSession.test.ts` "stop() aborts the scan…" |
| IN-001 build marker | `tests/buildShape.test.ts` (all-pages, starter-only, beta) |

**Placeholder scan:** none. Every new file is given in full; every edit to an existing file is a diff whose context and removed lines were generated from the checkout, or the file is replaced whole and said to be. No test is skipped or marked `.only`, no test asserts scaffolding, and the two replaced files are named. All of it was applied to a pristine export of `1e0156b` (`git archive`, node_modules junctioned, no `npm install`, committed to a throwaway repository so `git diff --cached --check` runs before each slice commit) one slice at a time, with each Phase A signal observed before the implementation existed, and `tsc`, repo-wide ESLint (`--max-warnings=0`), the full Vitest suite (113 files, 1907 tests, including the three build-shape builds) and `vite build` passed at the end of every slice and at the end, and `git diff --cached --check` printed nothing before every slice commit.

**Type consistency:** `ConnectionState`, `INITIAL_CONNECTION_STATE`, `connectionKey`, `useConnectionState` and `useActiveConnection` live in `useActiveConnection.ts`. The provider, the title bar, `connectionLabel.ts`, the session provider and the page use `ConnectionState`, `connectionKey` and `useConnectionState` (the page also `useRefreshConnection`); `useActiveConnection` stays exported but after slice A only its legacy test calls it, retained for P5.7; `ConnectionRefresh`, `ConnectionRefreshContext` and `useRefreshConnection` sit beside them (S-06) and are read by the page (`refresh`, `pending`). `ScanState` gains `connection-changed`; `PageState` gains `connection-changed`. `InspectorSnapshot`, `InspectorActions`, `InspectorSession`, `SiteListState` and `ScanState` live in `inspectorSession.types.ts`; the store returns `InspectorActions & { subscribe, getSnapshot, adopt, stop }` and the provider maps it to `InspectorSession` (actions are property functions, so they can be passed on without `this`). `InspectorDeps = { listSites: typeof listSites; runScan: typeof runScan }` copies the pinned signatures, which `skeleton.test.ts` still pins unchanged. `PageState` is a closed union exhausted with `never` in `derivePageState`, `announcementFor` and `PageBody`. `ReviewKey` is built as `` `${fileId}:${check}` `` with the declared template type. `SiteOption`, `SiteComboboxProps` and `SitePill`'s mapping agree, and `FindingTileProps.slot` is a number that picks one of three CSS cells.

**Risks and notes for the executor:**

- The tests that hold reads use `host.dataReads.inFlight` and `peak` (`gatedHost.ts`); `peak` is exactly 4 because the reader starts its four component queries together. If a later reader change starts a different number, these tests fail first, on purpose.
- The store logs only an error name (`console.error('The scan failed.', name)`); tests that expect no log spy on `console.error`.
- `useSyncExternalStore` with a plain store and an effect that adopts the connection means one render can see a new connection with the old store; the provider's `stale` check hides that render (S-03), and `InspectorSessionProvider.test.tsx` "…without ever rendering them for the new connection" pins it.
- `inspectorWorld.ts` has a `WorldFile.name` option that only the local preview uses.
- Open question for P5.7: it should capture `session.result` and compare `session.generation` before saving; `generation` also changes on a mark or undo. A file-scope export needs `session.fileId` to be set (D-03 C); a site-scope export does not.
- The D-19 C guard in `loadSites()` is unreachable through the public API under D-16 A (an identity change clears the selection and Retry exists only in the error state); it is defensive and untested by design (owner pick C).
- The replay's `git diff --cached --check` runs in a throwaway repository with `core.autocrlf=true`; the real checkout's gate is the same cached check before each commit (a check after the commits would see a clean index and prove nothing).
- Focus: `useHeadingFocus` in `InspectorPage.tsx` runs after every render and focuses the panel heading once after a Retry or Scan again handler asked for it. It does not move focus again when a scan finishes and the results replace the scanning panel; the status region announces that.
