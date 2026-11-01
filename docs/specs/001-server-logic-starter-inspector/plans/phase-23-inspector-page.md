# Logic Inspector Page Implementation Plan

> **Spec v4.0.0 (1a Graphite).** Write this phase's CSS with the variable names below; they are the 1a Graphite tokens in `src/app/theme/tokens.css` (spec FR-11). Use no glass, radius 12px on Inspector tiles, and `--review` on `--review-tint` for needs-review chips. The ◆ checks in both themes compare against the 1a Graphite pages already built (Logic Starter, Server Objects).

**Goal:** Select an enhanced-model site and review its server logic findings with session-only marks and safe scan invalidation.

**Architecture:** InspectorProvider owns site/scan/file selection and review state for the title bar and page. Phase 11 owns findings, copy, counts and banners; Phase 15 owns read operations; shared primitives own tokens, statuses, focus and modal behavior. A constant InspectorGate wraps the shell only in released Inspector builds.

**Tech stack:** React 19, strict TypeScript, existing Vite IIFE build, Vitest, Testing Library, existing PPTB adapter and token-based primitives.

**Scope:** Story 7/8 UI and Inspector release isolation.

**Out of scope:** Export implementation is Phase 24; live S2/contrast acceptance is an owner gate. No environment writes or persistence.

**Part:** plan-inspector.md, wave I3, Phase 23.

**Implements / Satisfies:**

- AC-1.2, AC-7.2: title-bar APG select-only site combobox; no automatic site choice; inactive options labelled and disabled.
- AC-1.7: provider, picker, Inspector/report/PDF code absent from unreleased bundles.
- AC-7.1, 7.4, 7.8: connection, empty-sites and empty-logic states; no scan/export without eligible data.
- AC-7.3: files/statuses and incomplete inventory message from Phase 11 banners.
- AC-7.5, 7.11: persistent non-Dev/Unknown warning without blocking scans.
- AC-7.6: compare id/URL only; retain marks after rename/relabel; clear on site/rescan/connection change; discard superseded results even while off-tab.
- AC-7.10: partial facts retained, Not scanned statuses, reconnect prompt and Rescan.
- AC-8.1–8.4: title, ring/legend, findings, first Needs review selection, detail/questions/snapshot.
- AC-8.5, 8.9, 8.12: review/undo only for eligible findings, retained original reasons, session-only state.
- AC-8.6–8.8, 8.10–8.11: consume Phase 11 summary/pill/rules, constant tenant-policy footer and grey Not scanned.
- Accessibility: keyboard preview/commit/Esc/Tab/typeahead, visible token focus, glyph/text statuses; async loading/error/retry/cancel.

**Depends on:** 11, 15 and Part A 04/06. S2 is required before live Phase 15 reads; fake-host verification is independent.

**Files and Interfaces:** Task 1 owns src/app/inspector-site/, SitePill, App integration, InspectorPage/content/CSS and their tests. Consumes useActiveConnection, useHost, evaluateSite, canReviewFinding, countChecks, fileSummary/filePill/ringLegend, CHECK_COPY, listSites/runScan, Tile/Ring/StatusBadge/Button/Pill, ExternalLink. Produces useInspector(): InspectorContextValue, InspectorProvider and InspectorPage. The context's selected file ID is consumed by Phase 24.

## Decisions

1. ConnectionProvider already re-reads active connection on every connection-changed host event. The Inspector provider compares only id and URL, avoiding another listener/query and keeping rename/relabel events from invalidating results. It synchronizes with connection context even when Inspector is hidden.
2. The reducer rejects late scan IDs. Cancel/supersede aborts future logical reads and waits for outstanding scan reads before starting the replacement or reloading sites, preserving the global pool ceiling. In-flight queryAll paging/retry cannot be physically aborted through the existing host API. Cancel hides discarded results; it never claims connection loss.
3. Site picker preview remains on the combobox via aria-activedescendant. Inactive options are navigable for discovery but cannot commit; Enter/Space/Tab commit active preview, Esc cancels. Typeahead has a 700 ms buffer.
4. Phase 11 CHECK_COPY owns names and evaluateSite owns banners. Page consumes each banner once; detail renders original reasons once and filters duplicate reason text from detail. The screen's stored file names are never given an invented .js suffix.
5. File selection lives in the shared Inspector state; finding selection is local to the content for that scan. Mark/undo keeps the selected check. The first discovered file is selected when results arrive; sites are never auto-selected.
6. Layout follows reference 05/06: 230 px files column, 14 px gaps, 34 px heading, shared tile/token styles and both host themes at the spec's 1024×700 minimum. The 320 px marketing-site gate is superseded by that explicit product viewport.
7. Phase 23 exposes the disabled/eligible Export report button; Phase 24 adds its action. The frozen dialog snapshot is not created here.

---

### Task 1: Select a site, review findings and reject stale scans

**Owns:** Story 7/8 state, page and APG site selection.

**Files:**
- Create: `src/app/inspector-site/inspectorState.ts` — reducer, actions and connection identity.
- Create: `src/app/inspector-site/useInspector.ts` — context declaration and consuming hook.
- Create: `src/app/inspector-site/InspectorProvider.tsx` — serialized host reads and session state integration.
- Create: `src/features/inspector/InspectorContent.tsx` — files, findings and detail tiles.
- Create: `src/features/inspector/inspector.css` — token-based grid, file and picker styles.
- Modify: `src/app/App.tsx` and `src/app/shell/SitePill.tsx` — gated provider/picker integration.
- Modify: `src/features/inspector/InspectorPage.tsx` — replace the Phase 00 page.
- Signal: `src/app/inspector-site/inspectorState.test.ts` — keyboard/state/partial-results behavior.
- Signal: `src/features/inspector/InspectorPage.test.tsx` — keyboard/state/partial-results behavior.

- [ ] **Step 1: Establish the observable pre-change signal**

```ts file=src/app/inspector-site/inspectorState.test.ts
import { describe, expect, it } from 'vitest';
import { connectionKey, initialInspectorState, inspectorReducer } from './inspectorState';
import type { Connection } from '@/services/pptb/host.types';
const connection: Connection = {
  id: 'one',
  name: 'Name',
  url: 'https://org.example',
  environment: 'Dev',
};
describe('Inspector connection identity and invalidation', () => {
  it('compares id and URL only, retaining marks after rename and label change', () => {
    const key = connectionKey(connection);
    const state = {
      ...initialInspectorState,
      connectionKey: key,
      marks: new Set(['f:webRole' as const]),
    };
    expect(connectionKey({ ...connection, name: 'Renamed', environment: 'Production' })).toBe(key);
    expect(inspectorReducer(state, { type: 'connection', key })).toBe(state);
    expect(
      inspectorReducer(state, {
        type: 'connection',
        key: connectionKey({ ...connection, url: 'https://other.example' }),
      }).marks.size,
    ).toBe(0);
    expect(inspectorReducer(state, { type: 'connection', key: null }).marks.size).toBe(0);
  });
  it('cancel invalidates scan progress and late failures', () => {
    const scanning = { ...initialInspectorState, scanId: 'old', scanning: true };
    const cancelled = inspectorReducer(scanning, { type: 'cancel' });
    expect(
      inspectorReducer(cancelled, { type: 'progress', scanId: 'old', scanned: 1, total: 5 }),
    ).toBe(cancelled);
    expect(inspectorReducer(cancelled, { type: 'scanError', scanId: 'old', error: 'old' })).toBe(
      cancelled,
    );
  });
});
```

```tsx file=src/features/inspector/InspectorPage.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import type { SiteFacts, SiteRef } from '@/types/inspector';
import { runScan } from './scan/scan';

vi.mock('./scan/scan', () => ({
  listSites: (host: { queryAll: (query: unknown) => Promise<unknown> }) =>
    host.queryAll({ entitySet: 'powerpagesites' }),
  runScan: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.mocked(runScan).mockReset();
});
beforeEach(() => {
  vi.mocked(runScan).mockImplementation((_host, _connection, _site, scanId) =>
    Promise.resolve(facts(scanId)),
  );
});

const CONNECTION: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://org.example',
  environment: 'Dev',
};
const SITE: SiteRef = { id: 's1', name: 'customer-portal', domain: 'site.example', active: true };
const INACTIVE: SiteRef = { ...SITE, id: 's2', name: 'old-portal', active: false };
const ok = <T,>(value: T) => ({ ok: true as const, value });
function facts(scanId: string): SiteFacts {
  return {
    scanId,
    site: SITE,
    connection: CONNECTION,
    startedAt: '2026-10-22T10:00:00Z',
    finishedAt: '2026-10-22T10:00:01Z',
    roles: ok([{ id: 'r1', name: 'Customers', anonymous: false, authenticated: false }]),
    permissions: ok([]),
    settings: ok({
      'ServerLogic/Enabled': { kind: 'absent' },
      'ServerLogic/AllowedDomains': { kind: 'absent' },
      'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
      'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
    }),
    inactiveSettings: [],
    files: [
      {
        id: 'f1',
        name: 'customer-summary',
        active: true,
        roleIds: ok(['r1']),
        code: ok('function get() { return 1; }'),
      },
    ],
    inventoryComplete: true,
    stopped: null,
  };
}
async function mount(
  connection: Connection | null = CONNECTION,
  sites: readonly SiteRef[] = [SITE, INACTIVE],
) {
  const host = createFakeHost({ connection, tables: { powerpagesites: sites } });
  render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
  return host;
}
async function selectSite() {
  const user = userEvent.setup();
  const picker = screen.getByRole('combobox', { name: 'Power Pages site' });
  await user.click(picker);
  await user.click(screen.getByRole('option', { name: 'customer-portal' }));
}

describe('Inspector page and select-only site picker', () => {
  it('does not preselect a single site', async () => {
    await mount(CONNECTION, [SITE]);
    expect(screen.getByRole('combobox', { name: 'Power Pages site' }).textContent).toBe(
      'No site selected',
    );
    expect(runScan).not.toHaveBeenCalled();
  });
  it('serializes cancel/rescan and includes connection/site/counter in scan IDs', async () => {
    let settle: ((value: SiteFacts) => void) | undefined;
    let id = '';
    vi.mocked(runScan).mockImplementationOnce((_h, _c, _s, scanId) => {
      id = scanId;
      return new Promise((resolve) => {
        settle = resolve;
      });
    });
    await mount();
    await selectSite();
    expect(id).toContain(`:${SITE.id}:`);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel scan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    expect(runScan).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runScan).mock.calls[0]?.[5]?.signal?.aborted).toBe(true);
    await act(async () => {
      settle?.(facts(id));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(runScan).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(runScan).mock.calls[1]?.[3]).not.toBe(id);
  });
  it('prompts for connection, keeps the picker disabled and shows no findings (AC-7.1)', async () => {
    await mount(null);
    expect(screen.getByText('Select a connection in ToolBox to inspect a site.')).toBeTruthy();
    expect(screen.getByText('No site selected').getAttribute('aria-disabled')).toBe('true');
    expect(runScan).not.toHaveBeenCalled();
  });
  it('does not select one site automatically and handles keyboard preview/Esc/disabled options (AC-7.2)', async () => {
    await mount();
    const user = userEvent.setup();
    const picker = screen.getByRole('combobox', { name: 'Power Pages site' });
    expect(runScan).not.toHaveBeenCalled();
    picker.focus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('option', { name: 'old-portal · Inactive' }).getAttribute('aria-disabled'),
    ).toBe('true');
    await user.keyboard('{End}{Enter}');
    expect(runScan).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(picker.textContent).toContain('No site selected');
    await user.keyboard('{ArrowDown}{Home}{Enter}');
    expect(runScan).toHaveBeenCalledTimes(1);
  });
  it('shows no-sites and sites-error as separate states with Retry (AC-7.8)', async () => {
    await mount(CONNECTION, []);
    expect(
      screen.getByText(
        "No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Export report' }).getAttribute('aria-disabled'),
    ).toBe('true');
    cleanup();
    const host = createFakeHost({
      connection: CONNECTION,
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 403, times: 1 }],
      tables: { powerpagesites: [SITE] },
    });
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(await screen.findByText("Couldn't load sites")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('combobox', { name: 'Power Pages site' })).toBeTruthy();
  });
  it('shows files, ring, detail, footer and review/undo with original reasons (AC-8.2–8.9)', async () => {
    vi.mocked(runScan).mockImplementation((_h, _c, _s, scanId) => {
      const result = facts(scanId);
      result.files = result.files.map((file) => ({ ...file, roleIds: ok([]) }));
      return Promise.resolve(result);
    });
    await mount();
    await selectSite();
    const files = await screen.findByRole('region', { name: 'Server logic (1)' });
    expect(within(files).getByText('Active')).toBeTruthy();
    expect(
      screen.getByText(
        'Tenant outbound policy: not verified. This tool doesn’t read tenant network policy.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Review server logic readiness' })).toBeTruthy();
    const detail = screen.getByRole('region', { name: 'Finding detail' });
    expect(within(detail).getByRole('heading', { name: 'Web role assigned' })).toBeTruthy();
    fireEvent.click(within(detail).getByRole('button', { name: 'Mark as reviewed' }));
    expect(within(detail).getByText('Reviewed')).toBeTruthy();
    expect(
      within(detail).getByText('No web role assigned. No site user can call it yet.'),
    ).toBeTruthy();
    fireEvent.click(within(detail).getByRole('button', { name: 'Undo review' }));
    expect(within(detail).getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });
  it('keeps marks after rename/relabel events, clears off-tab for id/URL changes and ignores stale scans (AC-7.6)', async () => {
    let finish: ((value: SiteFacts) => void) | undefined;
    let oldId = '';
    vi.mocked(runScan).mockImplementation((_h, _c, _s, id) => {
      oldId = id;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const host = await mount();
    await selectSite();
    fireEvent.click(screen.getByRole('tab', { name: 'Logic Starter' }));
    host.setConnection({ ...CONNECTION, url: 'https://other.example' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    await act(async () => {
      finish?.(facts(oldId));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Logic Inspector' }));
    expect(screen.queryByRole('region', { name: 'Server logic (1)' })).toBeNull();
    vi.mocked(runScan).mockImplementation((_h, _c, _s, id) => {
      const value = facts(id);
      value.files = value.files.map((file) => ({ ...file, roleIds: ok([]) }));
      return Promise.resolve(value);
    });
    await selectSite();
    await screen.findByRole('region', { name: 'Server logic (1)' });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    host.setConnection({
      ...CONNECTION,
      url: 'https://other.example',
      name: 'Renamed',
      environment: 'Unknown',
    });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(screen.getByRole('region', { name: 'Server logic (1)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Undo review' })).toBeTruthy();
    expect(
      screen.getByText(
        "This isn't a development environment. Inspector is read-only but is designed for dev sites.",
      ),
    ).toBeTruthy();
  });
  it('renders empty server logic, inventory incomplete and stopped scan states (AC-7.3/7.4/7.10)', async () => {
    vi.mocked(runScan).mockImplementation((_h, _c, _s, id) =>
      Promise.resolve({ ...facts(id), files: [] }),
    );
    await mount();
    await selectSite();
    expect(await screen.findByText('No server logic found on this site')).toBeTruthy();
    vi.mocked(runScan).mockImplementation((_h, _c, _s, id) =>
      Promise.resolve({ ...facts(id), inventoryComplete: false, stopped: 'connection-lost' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    expect(await screen.findByText('Inventory incomplete. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/inspector-site/inspectorState.test.ts src/features/inspector/InspectorPage.test.tsx`

Expected: exit 1. Current placeholder has no combobox or connection prompt; the six Inspector page cases fail. The new reducer module is absent before Step 3.

- [ ] **Step 3: Implement the minimum fix**

```ts file=src/app/inspector-site/inspectorState.ts
import type { Connection } from '@/services/pptb/host.types';
import type { ReviewKey, SiteFacts, SiteRef } from '@/types/inspector';

export type InspectorState = {
  connectionKey: string | null;
  sites: readonly SiteRef[];
  sitesStatus: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  selected: SiteRef | null;
  scanId: string | null;
  scanning: boolean;
  scanned: number;
  total: number;
  facts: SiteFacts | null;
  fileId: string | null;
  marks: ReadonlySet<ReviewKey>;
};

export const initialInspectorState: InspectorState = {
  connectionKey: null,
  sites: [],
  sitesStatus: 'idle',
  error: null,
  selected: null,
  scanId: null,
  scanning: false,
  scanned: 0,
  total: 0,
  facts: null,
  fileId: null,
  marks: new Set(),
};

export function connectionKey(connection: Connection | null): string | null {
  return connection === null ? null : JSON.stringify([connection.id, connection.url]);
}

export type InspectorAction =
  | { type: 'connection'; key: string | null }
  | { type: 'loadingSites' }
  | { type: 'sites'; key: string; sites: readonly SiteRef[] }
  | { type: 'sitesError'; key: string; error: string }
  | { type: 'scan'; site: SiteRef; scanId: string }
  | { type: 'progress'; scanId: string; scanned: number; total: number }
  | { type: 'result'; scanId: string; facts: SiteFacts }
  | { type: 'scanError'; scanId: string; error: string }
  | { type: 'cancel' }
  | { type: 'file'; fileId: string | null }
  | { type: 'review'; key: ReviewKey };

export function inspectorReducer(state: InspectorState, action: InspectorAction): InspectorState {
  switch (action.type) {
    case 'connection':
      return state.connectionKey === action.key
        ? state
        : {
            ...initialInspectorState,
            connectionKey: action.key,
            sitesStatus: action.key === null ? 'idle' : 'loading',
          };
    case 'loadingSites':
      return { ...state, sitesStatus: 'loading', error: null };
    case 'sites':
      return action.key !== state.connectionKey
        ? state
        : {
            ...state,
            sites: action.sites,
            sitesStatus: 'ready',
            error: null,
          };
    case 'sitesError':
      return action.key !== state.connectionKey
        ? state
        : {
            ...state,
            sitesStatus: 'error',
            error: action.error,
          };
    case 'scan':
      return {
        ...state,
        selected: action.site,
        scanId: action.scanId,
        scanning: true,
        scanned: 0,
        total: 0,
        facts: null,
        marks: new Set(),
        error: null,
      };
    case 'progress':
      return action.scanId !== state.scanId
        ? state
        : {
            ...state,
            scanned: action.scanned,
            total: action.total,
          };
    case 'result':
      return action.scanId !== state.scanId
        ? state
        : {
            ...state,
            scanning: false,
            facts: action.facts,
            fileId: action.facts.files[0]?.id ?? null,
          };
    case 'scanError':
      return action.scanId !== state.scanId
        ? state
        : {
            ...state,
            scanning: false,
            error: action.error,
          };
    case 'cancel':
      return {
        ...state,
        scanId: null,
        scanning: false,
        facts: null,
        marks: new Set(),
        error: null,
      };
    case 'review': {
      const marks = new Set(state.marks);
      if (marks.has(action.key)) marks.delete(action.key);
      else marks.add(action.key);
      return { ...state, marks };
    }
    case 'file':
      return { ...state, fileId: action.fileId };
  }
}
```

```ts file=src/app/inspector-site/useInspector.ts
import { createContext, use } from 'react';
import type { InspectorState } from './inspectorState';
import type { ReviewKey, SiteRef, SiteResult } from '@/types/inspector';

export type InspectorContextValue = {
  state: InspectorState;
  result: SiteResult | null;
  selectSite: (site: SiteRef) => void;
  rescan: () => void;
  retrySites: () => void;
  cancel: () => void;
  selectFile: (fileId: string | null) => void;
  toggleReview: (key: ReviewKey) => void;
};

export const InspectorContext = createContext<InspectorContextValue | null>(null);
export function useInspector(): InspectorContextValue {
  const value = use(InspectorContext);
  if (value === null) throw new Error('InspectorProvider is missing.');
  return value;
}
```

```tsx file=src/app/inspector-site/InspectorProvider.tsx
import { useEffect, useReducer, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import { useActiveConnection } from '@/app/useActiveConnection';
import { evaluateSite } from '@/features/inspector/model/rules';
import { listSites, runScan } from '@/features/inspector/scan/scan';
import type { SiteRef } from '@/types/inspector';
import { connectionKey, initialInspectorState, inspectorReducer } from './inspectorState';
import { InspectorContext } from './useInspector';

export function InspectorProvider({ children }: { children: ReactNode }): ReactElement {
  const host = useHost();
  const connection = useActiveConnection();
  const [state, dispatch] = useReducer(inspectorReducer, initialInspectorState);
  const [reload, reloadSites] = useReducer((value: number) => value + 1, 0);
  const counter = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const abort = useRef<AbortController | null>(null);
  const key = connectionKey(connection);

  useEffect(() => {
    abort.current?.abort();
    dispatch({ type: 'connection', key });
    if (key === null) return;
    let current = true;
    dispatch({ type: 'loadingSites' });
    const load = pending.current.then(() => (current ? listSites(host) : []));
    pending.current = load.then(
      () => undefined,
      () => undefined,
    );
    void load.then(
      (sites) => {
        if (current) dispatch({ type: 'sites', key, sites });
      },
      (error: unknown) => {
        if (current)
          dispatch({
            type: 'sitesError',
            key,
            error: error instanceof Error ? error.message : "Couldn't read sites.",
          });
      },
    );
    return () => {
      current = false;
      abort.current?.abort();
    };
  }, [host, key, reload]);

  const selectSite = (site: SiteRef): void => {
    if (connection === null || !site.active) return;
    counter.current += 1;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const scanId = `${connectionKey(connection) ?? ''}:${site.id}:${String(counter.current)}`;
    dispatch({ type: 'scan', site, scanId });
    const scan = pending.current.then(async () => {
      if (controller.signal.aborted) return null;
      return await runScan(
        host,
        connection,
        site,
        scanId,
        (scanned, total) => {
          dispatch({ type: 'progress', scanId, scanned, total });
        },
        { signal: controller.signal },
      );
    });
    pending.current = scan.then(
      () => undefined,
      () => undefined,
    );
    void scan.then(
      (facts) => {
        if (facts !== null && !controller.signal.aborted)
          dispatch({ type: 'result', scanId, facts });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          dispatch({
            type: 'scanError',
            scanId,
            error: error instanceof Error ? error.message : "Couldn't scan site.",
          });
      },
    );
  };

  // Suppress old facts immediately on the render that receives a changed connection;
  // the effect resets the reducer next. ConnectionProvider re-reads on every host event.
  const visible =
    state.connectionKey === key ? state : { ...initialInspectorState, connectionKey: key };
  const result = visible.facts === null ? null : evaluateSite(visible.facts, visible.marks);
  return (
    <InspectorContext
      value={{
        state: visible,
        result,
        selectSite,
        rescan: () => {
          if (visible.selected !== null) selectSite(visible.selected);
        },
        retrySites: reloadSites,
        selectFile: (fileId) => {
          dispatch({ type: 'file', fileId });
        },
        cancel: () => {
          abort.current?.abort();
          dispatch({ type: 'cancel' });
        },
        toggleReview: (reviewKey) => {
          dispatch({ type: 'review', key: reviewKey });
        },
      }}
    >
      {children}
    </InspectorContext>
  );
}
```

```tsx file=src/features/inspector/InspectorContent.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ExternalLink } from '@/app/ExternalLink';
import { useInspector } from '@/app/inspector-site/useInspector';
import { Button } from '@/components/Button';
import { Ring } from '@/components/Ring';
import { StatusBadge } from '@/components/StatusBadge';
import { checkStatusBadge } from '@/components/checkStatusBadge';
import { Tile } from '@/components/Tile';
import { CHECK_COPY } from './model/copy';
import { canReviewFinding, countChecks, filePill, fileSummary, ringLegend } from './model/rules';
import type { CheckId, FileResult, SiteResult } from '@/types/inspector';

export function InspectorContent({ result }: { result: SiteResult }): ReactElement {
  const { toggleReview, selectFile, state } = useInspector();
  const fileId = state.fileId;
  const [check, setCheck] = useState<CheckId | null>(null);
  const file: FileResult | undefined = result.files.find((item) => item.fileId === fileId);
  const finding =
    file?.findings.find((item) => item.check === check) ??
    file?.findings.find((item) => item.status === 'needs-review') ??
    file?.findings[0];
  const counts = file === undefined ? null : countChecks(file.findings);
  return (
    <div className="inspector-grid">
      <Tile heading={`Server logic (${String(result.files.length)})`} className="inspector-files">
        {result.files.map((item) => (
          <button
            type="button"
            key={item.fileId}
            className="inspector-file"
            aria-pressed={fileId === item.fileId}
            onClick={() => {
              selectFile(item.fileId);
              setCheck(null);
            }}
          >
            <strong>{item.name}</strong>
            <span>{item.active ? 'Active' : 'Inactive'}</span>
            <span>{fileSummary(item)}</span>
          </button>
        ))}
        <p className="inspector-policy">
          Tenant outbound policy: not verified. This tool doesn’t read tenant network policy.
        </p>
      </Tile>
      {file === undefined ? (
        <Tile heading="File readiness">
          <p>Select a file to review.</p>
        </Tile>
      ) : (
        <>
          <Tile className="inspector-title">
            <p className="ui-mono">
              {file.name} · {file.active ? 'Active' : 'Inactive'}
            </p>
            <h1>Review server logic readiness</h1>
            <p>Inspect access, permissions and outbound networking before release.</p>
            <p>{filePill(file)}</p>
          </Tile>
          <Tile heading="Readiness" className="inspector-ring">
            <Ring
              segments={file.findings.map((item) =>
                item.status === 'configured' || item.status === 'reviewed'
                  ? 'done'
                  : item.status === 'not-scanned'
                    ? 'not-scanned'
                    : 'review',
              )}
              label="addressed"
              size={180}
            />
            <p>{counts === null ? '' : ringLegend(counts)}</p>
          </Tile>
          <div className="inspector-findings">
            {file.findings.map((item) => (
              <Tile key={item.check}>
                <button
                  type="button"
                  className="inspector-finding"
                  aria-pressed={finding?.check === item.check}
                  onClick={() => {
                    setCheck(item.check);
                  }}
                >
                  <strong>{CHECK_COPY[item.check].title}</strong>
                  <span>{item.summary}</span>
                  <StatusBadge {...checkStatusBadge(item.status)} />
                </button>
              </Tile>
            ))}
          </div>
          {finding === undefined ? null : (
            <Tile heading="Finding detail" className="inspector-detail">
              <h2>{CHECK_COPY[finding.check].title}</h2>
              <p>Configuration review</p>
              <StatusBadge {...checkStatusBadge(finding.status)} />
              {finding.reasons.map((reason, index) => (
                <p key={index}>{reason.text}</p>
              ))}
              <p>{finding.guidance}</p>
              <h3>Questions to consider</h3>
              <ul>
                {finding.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
              <h3>Configuration snapshot</h3>
              <ul>
                {[
                  ...file.snapshot.roles,
                  ...file.snapshot.tables,
                  ...file.snapshot.outbound,
                  ...finding.detail.filter(
                    (line) => !finding.reasons.some((reason) => reason.text === line),
                  ),
                ].map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              <ExternalLink href="https://learn.microsoft.com/power-pages/configure/server-logic-overview">
                Server logic on Microsoft Learn
              </ExternalLink>
              {canReviewFinding(finding) || finding.status === 'reviewed' ? (
                <Button
                  onClick={() => {
                    toggleReview(`${file.fileId}:${finding.check}`);
                    setCheck(finding.check);
                  }}
                >
                  {finding.status === 'reviewed' ? 'Undo review' : 'Mark as reviewed'}
                </Button>
              ) : null}
            </Tile>
          )}
        </>
      )}
    </div>
  );
}
```

```css file=src/features/inspector/inspector.css
.inspector-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}
.inspector-grid {
  display: grid;
  grid-template-columns: 230px minmax(180px, 1fr) repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.inspector-files {
  grid-column: 1;
  grid-row: 1 / 4;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inspector-file,
.inspector-finding {
  border: 1px solid transparent;
  color: var(--text);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  width: 100%;
  overflow-wrap: anywhere;
}
.inspector-file[aria-pressed='true'],
.inspector-finding[aria-pressed='true'] {
  border-color: var(--primary);
  background: var(--ok-tint);
}
.inspector-file span,
.inspector-policy {
  color: var(--muted);
  font-size: 12px;
}
.inspector-policy {
  margin-top: auto;
  line-height: 1.5;
}
.inspector-title {
  grid-column: 2 / 5;
}
.inspector-title h1 {
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.inspector-ring {
  grid-column: 2;
  grid-row: 2 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}
.inspector-findings {
  grid-column: 3;
  display: grid;
  gap: 14px;
}
.inspector-detail {
  grid-column: 4;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.inspector-site {
  position: relative;
}
.inspector-site__list {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 20;
  min-width: 230px;
  max-height: 300px;
  overflow: auto;
  list-style: none;
  padding: 8px;
  background: var(--tile);
  color: var(--text);
  border: 1px solid var(--control-border);
  border-radius: 10px;
}
.inspector-site__list [role='option'] {
  padding: 8px;
  cursor: pointer;
}
.inspector-site__list [aria-selected='true'] {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
.inspector-site__list [aria-disabled='true'] {
  color: var(--muted);
  cursor: default;
}
```

```tsx file=src/features/inspector/InspectorPage.tsx
import { useEffect, useReducer } from 'react';
import type { ReactElement } from 'react';
import { useNotify } from '@/app/useNotify';
import type { SiteResult } from '@/types/inspector';
import { ExportDialog } from './ExportDialog';
import { useActiveConnection } from '@/app/useActiveConnection';
import { useInspector } from '@/app/inspector-site/useInspector';
import { Button } from '@/components/Button';
import { Tile } from '@/components/Tile';
import { InspectorContent } from './InspectorContent';
import './inspector.css';

type ExportSession = { snapshot: SiteResult; fileId: string | null; saving: boolean } | null;
export function InspectorPage(): ReactElement {
  const connection = useActiveConnection();
  const { state, result, rescan, retrySites, cancel } = useInspector();
  const notify = useNotify();
  const [exportSession, setExportSession] = useReducer(
    (_old: ExportSession, next: ExportSession) => next,
    null,
  );
  const invalidExport =
    exportSession !== null &&
    !exportSession.saving &&
    exportSession.snapshot.facts.scanId !== result?.facts.scanId;
  useEffect(() => {
    if (invalidExport) {
      setExportSession(null);
      notify({ title: 'Results changed, so the export was cancelled.', body: '', type: 'info' });
    }
  }, [invalidExport, notify]);
  const disabledReason = state.scanning
    ? 'Wait for the scan to finish'
    : result === null || result.files.length === 0
      ? 'Scan a site with server logic first'
      : null;
  return (
    <section aria-label="Logic Inspector">
      <div className="inspector-toolbar">
        <Button
          onClick={rescan}
          disabledReason={state.selected === null ? 'Select a site first' : null}
        >
          Rescan
        </Button>
        <Button
          variant="primary"
          disabledReason={disabledReason}
          onClick={() => {
            if (result !== null)
              setExportSession({
                snapshot: structuredClone(result),
                fileId: state.fileId,
                saving: false,
              });
          }}
        >
          Export report
        </Button>
      </div>
      {connection === null ? (
        <Tile>
          <p>Select a connection in ToolBox to inspect a site.</p>
        </Tile>
      ) : (
        <>
          {connection.environment !== 'Dev' ? (
            <p role="status">
              This isn't a development environment. Inspector is read-only but is designed for dev
              sites.
            </p>
          ) : null}
          {state.sitesStatus === 'loading' ? <p role="status">Loading sites…</p> : null}
          {state.sitesStatus === 'error' ? (
            <Tile>
              <h2>Couldn't load sites</h2>
              <p>{state.error}</p>
              <Button onClick={retrySites}>Retry</Button>
            </Tile>
          ) : null}
          {state.sitesStatus === 'ready' && state.sites.length === 0 ? (
            <p>
              No enhanced data model Power Pages sites found in this environment. Standard data
              model sites aren't supported.
            </p>
          ) : null}
          {state.sitesStatus === 'ready' && state.sites.length > 0 && state.selected === null ? (
            <p>Select a Power Pages site in the title bar.</p>
          ) : null}
          {state.scanning ? (
            <Tile>
              <p role="status">
                Scanned {state.scanned} of {state.total}
              </p>
              <Button onClick={cancel}>Cancel scan</Button>
            </Tile>
          ) : null}
          {state.error !== null && state.selected !== null ? (
            <Tile>
              <h2>Couldn't scan site</h2>
              <p>{state.error}</p>
              <Button onClick={rescan}>Retry</Button>
            </Tile>
          ) : null}
          {result === null ? null : (
            <>
              {result.banners.map((banner) => (
                <p role="status" key={banner}>
                  {banner}
                </p>
              ))}
              {result.files.length === 0 ? (
                <p>No server logic found on this site</p>
              ) : (
                <InspectorContent key={result.facts.scanId} result={result} />
              )}
            </>
          )}
        </>
      )}
      {exportSession !== null && !invalidExport ? (
        <ExportDialog
          snapshot={exportSession.snapshot}
          fileId={exportSession.fileId}
          onClose={() => {
            setExportSession(null);
          }}
          onSaving={() => {
            setExportSession({ ...exportSession, saving: true });
          }}
          onSaveFailed={() => {
            setExportSession({ ...exportSession, saving: false });
          }}
        />
      ) : null}
    </section>
  );
}
```

```diff file=src/app/shell/SitePill.tsx
diff --git a/src/app/shell/SitePill.tsx b/src/app/shell/SitePill.tsx
index 070f0be..e88b2f7 100644
--- a/src/app/shell/SitePill.tsx
+++ b/src/app/shell/SitePill.tsx
@@ -1,11 +1,154 @@
-import type { ReactElement } from 'react';
+import { useId, useRef, useState } from 'react';
+import type { KeyboardEvent, ReactElement } from 'react';
+import { useInspector } from '@/app/inspector-site/useInspector';
+import { useActiveConnection } from '@/app/useActiveConnection';
 import { Pill } from '@/components/Pill';
 
 // Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).
-export function SitePill(): ReactElement {
+function DisabledSitePill(): ReactElement {
   return (
     <Pill compact aria-disabled="true" className="shell__site">
       No site selected
     </Pill>
   );
 }
+
+function SitePicker(): ReactElement {
+  const { state, selectSite } = useInspector();
+  const connection = useActiveConnection();
+  const [open, setOpen] = useState(false);
+  const [preview, setPreview] = useState(0);
+  const listId = useId();
+  const search = useRef({ text: '', time: 0 });
+  const disabled = connection === null || state.sitesStatus !== 'ready' || state.sites.length === 0;
+  const selectedIndex = state.sites.findIndex((site) => site.id === state.selected?.id);
+  const show = (): void => {
+    if (disabled) return;
+    setPreview(Math.max(0, selectedIndex));
+    setOpen(true);
+  };
+  const commit = (): void => {
+    const site = state.sites[preview];
+    if (site?.active === true) {
+      selectSite(site);
+      setOpen(false);
+    }
+  };
+  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
+    if (disabled) return;
+    if (event.key === 'Escape') {
+      event.preventDefault();
+      setOpen(false);
+      return;
+    }
+    if (event.key === 'Tab') {
+      if (open) commit();
+      setOpen(false);
+      return;
+    }
+    if (event.key === 'Enter' || event.key === ' ') {
+      event.preventDefault();
+      if (open) commit();
+      else show();
+      return;
+    }
+    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
+      event.preventDefault();
+      if (!open) {
+        show();
+        return;
+      }
+      const last = state.sites.length - 1;
+      setPreview(
+        event.key === 'Home'
+          ? 0
+          : event.key === 'End'
+            ? last
+            : Math.max(0, Math.min(last, preview + (event.key === 'ArrowDown' ? 1 : -1))),
+      );
+      return;
+    }
+    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
+      const now = Date.now();
+      const text =
+        (now - search.current.time < 700 ? search.current.text : '') + event.key.toLowerCase();
+      search.current = { text, time: now };
+      const index = state.sites.findIndex((site) => site.name.toLowerCase().startsWith(text));
+      if (index >= 0) {
+        event.preventDefault();
+        setPreview(index);
+        setOpen(true);
+      }
+    }
+  };
+  return (
+    <span
+      className="inspector-site"
+      onBlur={(event) => {
+        if (!(
+          event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
+        ))
+          setOpen(false);
+      }}
+    >
+      <button
+        type="button"
+        role="combobox"
+        aria-label="Power Pages site"
+        aria-expanded={open}
+        aria-haspopup="listbox"
+        aria-controls={listId}
+        aria-activedescendant={open ? `${listId}-${String(preview)}` : undefined}
+        aria-disabled={disabled ? true : undefined}
+        className="ui-button shell__site"
+        onKeyDown={onKeyDown}
+        onClick={() => {
+          if (open) setOpen(false);
+          else show();
+        }}
+      >
+        {state.selected?.name ?? 'No site selected'}
+      </button>
+      {open ? (
+        <ul
+          id={listId}
+          role="listbox"
+          aria-label="Power Pages sites"
+          className="inspector-site__list"
+        >
+          {state.sites.map((site, index) => (
+            <li
+              id={`${listId}-${String(index)}`}
+              key={site.id}
+              role="option"
+              aria-selected={index === preview}
+              aria-disabled={!site.active ? true : undefined}
+              onKeyDown={(event) => {
+                if (event.key === 'Enter' && site.active) {
+                  selectSite(site);
+                  setOpen(false);
+                }
+              }}
+              onMouseDown={(event) => {
+                event.preventDefault();
+              }}
+              onClick={() => {
+                if (site.active) {
+                  selectSite(site);
+                  setOpen(false);
+                }
+              }}
+            >
+              {site.name}
+              {site.active ? '' : ' · Inactive'}
+            </li>
+          ))}
+        </ul>
+      ) : null}
+    </span>
+  );
+}
+
+export function SitePill(): ReactElement {
+  return __PAGE_INSPECTOR__ ? <SitePicker /> : <DisabledSitePill />;
+}
```

```diff file=src/app/App.tsx
diff --git a/src/app/App.tsx b/src/app/App.tsx
index 93e97f8..c46cab8 100644
--- a/src/app/App.tsx
+++ b/src/app/App.tsx
@@ -12,6 +12,7 @@ import type { StarterDeps } from '@/app/starter-session/starterDeps';
 import { useHostTheme } from '@/app/useHostTheme';
 import { ViewContext } from '@/app/useView';
 import { InspectorPage } from '@/features/inspector/InspectorPage';
+import { InspectorProvider } from '@/app/inspector-site/InspectorProvider';
 import { ServerObjectsPage } from '@/features/server-objects/ServerObjectsPage';
 import { StarterPage } from '@/features/starter/StarterPage';
 import type { PptbHost } from '@/services/pptb/host.types';
@@ -19,6 +20,10 @@ import type { View } from '@/types/http';
 
 export type AppProps = { host: PptbHost; starterDeps?: StarterDeps };
 
+function InspectorGate({ children }: { children: ReactNode }): ReactElement {
+  return __PAGE_INSPECTOR__ ? <InspectorProvider>{children}</InspectorProvider> : <>{children}</>;
+}
+
 function Panel({
   id,
   label,
@@ -50,29 +55,31 @@ export function App({ host, starterDeps = STARTER_DEPS }: AppProps): ReactElemen
       <NotifyProvider>
         <ConnectionProvider>
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
+            <InspectorGate>
+              <div className="shell">
+                <TitleBar />
+                <main className="shell__content">
+                  {/* Constant conditions: unreleased pages are dropped from the bundle (FR-1, Phase 00). */}
+                  {__PAGE_STARTER__ ? (
+                    <StarterSessionProvider deps={starterDeps}>
+                      <Panel id="starter" label="Logic Starter" view={view}>
+                        <StarterPage />
                       </Panel>
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
+            </InspectorGate>
           </ViewContext>
         </ConnectionProvider>
       </NotifyProvider>
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app/inspector-site/inspectorState.test.ts src/features/inspector/InspectorPage.test.tsx`

Expected: exit 0; all tests in the named files pass.

Run: `npx vitest run src/app/App.test.tsx src/app/ConnectionProvider.test.tsx src/components/Ring.test.tsx src/components/StatusBadge.test.tsx`

Expected: exit 0.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/app/inspector-site src/app/shell/SitePill.tsx src/app/App.tsx src/features/inspector/InspectorPage.tsx src/features/inspector/InspectorContent.tsx src/features/inspector/InspectorPage.test.tsx src/features/inspector/inspector.css
git commit -m "feat(inspector): add site selection and readiness review"
```

### Task 2: Exclude Inspector and PDF from unreleased builds

**Owns:** AC-1.7 and single classic-script output.

**Files:**
- Modify/Signal: `tests/buildShape.test.ts` — replace placeholder markers and inspect Starter-only absence.

- [ ] **Step 1: Establish the observable pre-change signal**

```diff file=tests/buildShape.test.ts
diff --git a/tests/buildShape.test.ts b/tests/buildShape.test.ts
index f53865c..ed175db 100644
--- a/tests/buildShape.test.ts
+++ b/tests/buildShape.test.ts
@@ -98,7 +98,7 @@ describe('built tool: PPTB loading shape (all pages released)', () => {
     const code = read(dist, file);
     expect(code).toContain('Discard your edits?'); // text only the Starter page renders
     expect(code).toContain('Search objects and methods');
-    expect(code).toContain('Logic Inspector page placeholder');
+    expect(code).toContain('Review server logic readiness');
   });
 });
 
@@ -112,7 +112,10 @@ describe('released pages (FR-1): unreleased page code is left out of the bundle'
       const code = read(dist, file);
       expect(code).toContain('Discard your edits?'); // text only the Starter page renders
       expect(code).not.toContain('Search objects and methods');
-      expect(code).not.toContain('Logic Inspector page placeholder');
+      expect(code).not.toContain('Review server logic readiness');
+      expect(code).not.toContain('Scanned ');
+      expect(code).not.toContain('Server logic readiness:');
+      expect(code).not.toContain('jsPDF PubSub');
       expect(code).not.toContain('Browse all in Server Objects');
     },
     BUILD_TIMEOUT,
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run tests/buildShape.test.ts`

Expected: Before Task 1, the new real-page marker assertion fails because only Logic Inspector page placeholder is emitted. After Task 1 the marker is expected to pass; the negative PDF/report assertions are regression guards.

- [ ] **Step 3: Implement the minimum fix**
Apply the test hunks from Step 1 after Task 1. No additional product edit is required: InspectorGate and SitePill constant branch own release isolation.
- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run tests/buildShape.test.ts`

Expected: exit 0; all tests in the named files pass.

Run: `npx vite build`

Expected: exit 0.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- tests/buildShape.test.ts
git commit -m "test(inspector): verify unreleased bundle isolation"
```

## Integration verification

Run from repository root: `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx vitest run`, `npx vite build`. Expect exit 0; tests/buildShape retains one IIFE and no type=module/crossorigin. Run `npx prettier --check src/app/inspector-site src/app/App.tsx src/app/shell/SitePill.tsx src/features/inspector/InspectorPage.tsx src/features/inspector/InspectorContent.tsx src/features/inspector/InspectorPage.test.tsx src/features/inspector/inspector.css tests/buildShape.test.ts`; expect all selected files formatted.

◆ In PPTB at 1024×700 and 1100×780, light and dark: choose a site via mouse and keyboard; inspect every loading/empty/error/retry state, long names and scroll; review/undo, switch tabs, rename another/active connection, change id/URL, rescan/cancel. Measure dark glass contrast over actual rendered backgrounds; normal text ≥4.5:1, large text and control boundaries ≥3:1. Capture viewport/theme screenshots and host version. These checks remain owner-run, not inferred from jsdom.

## Verified while planning

2026-10-22, detached scratch worktree at base 42c2809 on branch 001-logic-inspector. Page RED: six cases failed against the placeholder; source compiled and scoped ESLint passed after implementation. Assembled page/reducer/export/host-app focused run: 5 files, 22 tests passed. Build-shape: 12 tests passed including Starter-only removal. Vite build passed with existing large-bundle warning and jsPDF import.meta IIFE warning; classic-script build test passed. Whole-repository Prettier baseline fails on 176 existing files; changed files are scoped and checked. Full assembled final outcomes are recorded in plan-inspector.md. Rendered browser and live PPTB evidence are pending.

## Done when

- [ ] Source: context/reducer and gated imports match interfaces; no persistence or environment write.
- [ ] Tests/build: focused and integrated commands above exit 0.
- [ ] Rendered browser: both themes/viewport/keyboard and contrast evidence captured.
- [ ] Live PPTB: S2 accepted and site lifecycle/partial-loss smoke recorded.
