# Phase 06: Shell

**Part:** A (foundation), `plan-starter.md`. Server Objects and Inspector consume it unchanged.
**Implements:** FR-1 (three top tabs, title-bar connection context and site pill, per-tab state kept, Starter and Server Objects usable without a connection, released pages at run time, host notifications with the in-tool fallback, external links on click only), FR-11 (host theme followed, no toggle), FR-12 (events registered once at start-up and removed on unload) | **Satisfies:** AC-1.1, AC-1.2 (the site pill as a disabled placeholder: the picker itself is AC-7.2 in `plan-inspector.md`), AC-1.3, AC-1.4, AC-1.5 (tabs; pills are Phase 04), AC-1.6, AC-1.7 (the run-time half: the tab state; the build-time half is Phase 00), and the Error Scenario "`showNotification` missing, throws or rejects"
**Depends on:** 00, 01, 04
**Files:**
- Replace the Phase 00 stubs (whole files): `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/HostContext.ts`, `src/app/useNotify.ts`, `src/app/useView.ts`, `src/main.tsx`, `src/index.css`.
- Create in `src/app/`: `NotifyProvider.tsx`, `NotifyProvider.test.tsx`, `ConnectionProvider.tsx`, `useActiveConnection.ts`, `ConnectionProvider.test.tsx`, `useHostTheme.ts`, `useHostTheme.test.tsx`, `ExternalLink.tsx`, `ExternalLink.test.tsx`, `PageErrorBoundary.tsx`, `PageErrorBoundary.test.tsx`.
- Create in `src/app/shell/`: `TitleBar.tsx`, `TopTabs.tsx`, `TopTabs.test.tsx`, `SitePill.tsx`, `connectionLabel.ts`, `connectionLabel.test.ts`, `shell.css`.
- Edits no other file. The page files stay Phase 00's placeholders.

**Interfaces:**
- **Consumes:**
  - Phase 00: `View` (`@/types/http`), `RELEASED_PAGES` (`@/app/releasedPages`), the `__PAGE_*__` constants, the three page placeholders, `Notice`, `Connection`, `EnvironmentLabel`, `PptbHost`, `ThemeName` (`@/services/pptb/host.types`).
  - Phase 01: `createPptbHost()` and `createFakeHost(init?)` with its controls (`emit`, `setTheme`, `setConnection`, `setNotify`, `setOpenExternal`, `callsOf`, `listenerCount`). Behaviour relied on: `getTheme` rejects on a host failure (changed in Phase 01 on 2026-10-17 for AC-1.6); `notify` and `openExternal` reject with a `HostCallError` after the adapter has logged the error name; `getActiveConnection` resolves `null` for "no connection"; `onEvent` makes one `toolboxAPI.events.on` registration per host.
  - Phase 04: `Icon`, `Pill`, `ToastStack` and `ToastItem`, `tokens.css`, `primitives.css`.
- **Produces** (exact names; Part B, Part C, `plan-server-objects.md` and `plan-inspector.md` rely on them):
  - `src/app/HostContext.ts`: `HostContext` (`createContext<PptbHost | null>(null)`) and `useHost(): PptbHost` (throws `Error('useHost must be used inside the App')` outside the provider).
  - `src/app/useNotify.ts`: `NotifyContext` and `useNotify(): (n: Notice) => void`. The returned function never throws and never rejects: it calls `host.notify(n)` and, if that rejects, shows the same notice as an in-tool toast.
  - `src/app/NotifyProvider.tsx`: `NotifyProvider(props: { children: ReactNode }): ReactElement` (owns the fallback toast stack).
  - `src/app/useView.ts`: `ViewContext` and `useView(): [View, (v: View) => void]`. Setting an unreleased view is ignored.
  - `src/app/useActiveConnection.ts`: `ConnectionContext` and `useActiveConnection(): Connection | null`. `null` means "not connected" or "the host could not say". It refreshes on every `connection-changed` event.
  - `src/app/ConnectionProvider.tsx`: `ConnectionProvider(props: { children: ReactNode }): ReactElement`.
  - `src/app/useHostTheme.ts`: `useHostTheme(host: PptbHost): void` and `applyTheme(theme: ThemeName): void`.
  - `src/app/ExternalLink.tsx`: `type ExternalLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick' | 'target'> & { href: string }`; `ExternalLink(props): ReactElement`. A real `href`, opened only on click through `host.openExternal` (FR-1).
  - `src/app/PageErrorBoundary.tsx`: `PageErrorBoundary(props: { label: string; children: ReactNode })`. Shows "`<label>` couldn't load. Close and reopen the tool." with `role="alert"` when a page throws during render.
  - `src/app/shell/SitePill.tsx`: `SitePill(): ReactElement`. Part A renders the disabled "No site selected" pill. **`plan-inspector.md` takes over this file** for the picker (AC-7.2); nothing else imports it but `TitleBar`.
  - `src/app/shell/connectionLabel.ts`: `connectionLabel(c: Connection | null): string`.
  - `src/app/App.tsx`: `type AppProps = { host: PptbHost }`; `App(props: AppProps): ReactElement`. Phase 18a adds an optional `starterDeps` prop and the Starter session provider here (see `phase-18a-starter-session.md`); no other phase edits this file.

This phase builds the window every page sits in: the title bar with the glyph, the name and the three APG tabs, the connection context and the site pill, the content area that keeps every released page mounted, the host theme, and the notification path with its fallback toast. Pages stay Phase 00's placeholders.

## Decisions (recorded so later phases do not re-argue them)

1. **The host is created once, in `main.tsx`, and passed to `App` as a prop.** `App` puts it in `HostContext`. Tests render `<App host={createFakeHost()} />`, so no test touches `window.*API` and no module is mocked.
2. **First frame in the host theme.** `main.tsx` awaits `host.getTheme()` before `createRoot(...).render(...)`, falling back to light if it rejects (AC-1.6). The IIFE bundle cannot use top-level `await`, so this is a `.then` chain.
3. **Re-reads keep the current theme on failure.** `useHostTheme` re-reads on `settings-updated`, window `focus` and `visibilitychange` to visible; a rejected read changes nothing (AC-1.6). There is no theme toggle and nothing is written to tool settings.
4. **Every released page stays mounted; inactive panels get `hidden`.** That keeps each tab's state with no transition (AC-1.4) and no state lifting. Unreleased pages are not rendered at all: the `__PAGE_*__` constants drop their modules from the bundle (Phase 00), and the panel is never created (AC-1.7).
5. **Tabs follow APG tabs with automatic activation.** Arrow Left and Right (wrapping), Home and End move focus and select; Enter and Space also select. An unreleased tab takes focus in the arrow order but is never selected, has `aria-disabled="true"` and no tooltip (AC-1.7, owner-approved exception to F47). Roving `tabIndex`: the selected tab is `0`, the rest `-1`.
6. **`useNotify` does not log.** The adapter already logged the host failure by error name (Phase 01); logging again would double it. The fallback is plain React state, so a failing fallback cannot call the host again (FR-1).
7. **Environment text.** `Dev` is shown as "Development", matching AC-1.2's example "Contoso · Development"; `Test`, `UAT`, `Production` and `Unknown` are shown as they are. No connection reads "Not connected" (AC-1.3).
8. **The site pill is a placeholder here.** It is always disabled in Part A (no picker exists yet), which already satisfies AC-1.3 and the AC-1.7 rule for an unreleased Inspector. `plan-inspector.md` replaces `SitePill.tsx` with the picker and keeps those two disabled cases.
9. **`PageErrorBoundary` is the one class component.** React 19 still has no function-component error boundary, so this is the documented exception to "function components only" in `.claude/rules/react.md`. It does not log: `createRoot`'s `onCaughtError` in `main.tsx` already logs the error name.
10. **No window buttons.** The 10a references draw `— ▢ ✕` at the far right because they mock a whole window. PPTB hosts the tool inside its own tab, and the host owns those controls.
11. **External link failure toast.** The spec names no text for a failed `openInConnectionBrowser`. This phase uses the error toast "Couldn't open the link" with the body "Open it from your browser instead." (no URL in the toast).

---

- [ ] **Step 0: Preflight**

  ```bash
  git status --short
  grep -n "export function createFakeHost\|export function createPptbHost" src/services/pptb/*.ts
  grep -n "rejects.toMatchObject({ name: 'HostCallError' })" src/services/pptb/pptbHost.test.ts | head -3
  ls src/components/Icon.tsx src/components/Pill.tsx src/components/ToastStack.tsx src/app/theme/tokens.css
  grep -n "RELEASED_PAGES" src/app/releasedPages.ts
  ```

  Expect: a clean tree; both factories found (Phase 01 merged, not stubs); the `getTheme` rejection tests present; the four Phase 04 files listed; `RELEASED_PAGES` exported. If Phase 01's `getTheme` still resolves `'light'` on failure, stop: Decision 3 depends on the rejection.

- [ ] **Step 1: Write the connection label test**

  ```ts file=src/app/shell/connectionLabel.test.ts
  import { describe, expect, it } from 'vitest';
  import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';
  import { connectionLabel } from './connectionLabel';

  const at = (environment: EnvironmentLabel): Connection => ({
    id: 'c1',
    name: 'Contoso',
    url: 'https://contoso.crm.dynamics.com',
    environment,
  });

  describe('connectionLabel', () => {
    it('reads "Not connected" without a connection (AC-1.3)', () => {
      expect(connectionLabel(null)).toBe('Not connected');
    });

    it.each([
      ['Dev', 'Contoso · Development'],
      ['Test', 'Contoso · Test'],
      ['UAT', 'Contoso · UAT'],
      ['Production', 'Contoso · Production'],
      ['Unknown', 'Contoso · Unknown'],
    ] as const)('shows %s as "%s" (AC-1.2)', (environment, expected) => {
      expect(connectionLabel(at(environment))).toBe(expected);
    });
  });
  ```

  Run: `npx vitest run src/app/shell/connectionLabel.test.ts`. Expect: FAIL, `Failed to resolve import "./connectionLabel"`.

- [ ] **Step 2: Implement `connectionLabel`, run, commit**

  ```ts file=src/app/shell/connectionLabel.ts
  import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';

  const ENVIRONMENT_TEXT = {
    Dev: 'Development',
    Test: 'Test',
    UAT: 'UAT',
    Production: 'Production',
    Unknown: 'Unknown',
  } as const satisfies Record<EnvironmentLabel, string>;

  export function connectionLabel(c: Connection | null): string {
    return c === null ? 'Not connected' : `${c.name} · ${ENVIRONMENT_TEXT[c.environment]}`;
  }
  ```

  ```bash
  npx vitest run src/app/shell/connectionLabel.test.ts
  npx prettier --write src/app/shell
  git add src/app/shell/connectionLabel.ts src/app/shell/connectionLabel.test.ts
  git commit -m "feat(shell): add the title-bar connection label"
  ```

  Expect: PASS, 6 tests.

- [ ] **Step 3: Write the host-context, notify and fallback tests**

  ```tsx file=src/app/NotifyProvider.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import type { ReactElement } from 'react';
  import { HostContext, useHost } from '@/app/HostContext';
  import { NotifyProvider } from '@/app/NotifyProvider';
  import { useNotify } from '@/app/useNotify';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import type { NotifyBehaviour } from '@/services/pptb/fakeHost';
  import type { Notice } from '@/services/pptb/host.types';

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function Trigger({ notice }: { notice: Notice }): ReactElement {
    const notify = useNotify();
    return (
      <button type="button" onClick={() => { notify(notice); }}>
        Send
      </button>
    );
  }

  async function send(behaviour: NotifyBehaviour, notice: Notice) {
    const host = createFakeHost({ notify: behaviour });
    render(
      <HostContext value={host}>
        <NotifyProvider>
          <Trigger notice={notice} />
        </NotifyProvider>
      </HostContext>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
      await Promise.resolve();
    });
    return host;
  }

  const SAVED: Notice = { title: 'Code copied', body: '', type: 'success' };
  const FAILED: Notice = { title: "Couldn't copy", body: 'The clipboard is not available.', type: 'error' };

  describe('useHost', () => {
    it('throws outside the App', () => {
      function Probe(): null {
        useHost();
        return null;
      }
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<Probe />)).toThrow('useHost must be used inside the App');
    });
  });

  describe('useNotify (FR-1)', () => {
    it('sends the notice to the host and shows no in-tool toast when the host succeeds', async () => {
      const host = await send('ok', SAVED);
      expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice: SAVED }]);
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each(['reject', 'throw', 'missing'] as const)(
      'falls back to an in-tool toast when the host notify %s, and calls the host once',
      async (behaviour) => {
        const host = await send(behaviour, FAILED);
        const toast = screen.getByRole('alert');
        expect(toast.textContent).toContain("Couldn't copy");
        expect(toast.textContent).toContain('The clipboard is not available.');
        expect(host.callsOf('notify')).toHaveLength(1);
      },
    );

    it('uses role="status" for a success fallback and hides it after 5 s', async () => {
      vi.useFakeTimers();
      await send('reject', SAVED);
      expect(screen.getByRole('status').textContent).toContain('Code copied');
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('keeps an error fallback until it is closed', async () => {
      vi.useFakeTimers();
      await send('reject', FAILED);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      const toast = screen.getByRole('alert');
      fireEvent.click(within(toast).getByRole('button', { name: /close/i }));
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
  ```

  The Close button's accessible name comes from Phase 04's `ToastStack`; if Phase 04 named it differently, match its name here, not the other way round.

  Run: `npx vitest run src/app/NotifyProvider.test.tsx`. Expect: FAIL, `Failed to resolve import "@/app/NotifyProvider"` (and `useHost` throws `not implemented: phase 06`).

- [ ] **Step 4: Implement `HostContext`, `useNotify` and `NotifyProvider`**

  ```ts file=src/app/HostContext.ts
  import { createContext, use } from 'react';
  import type { PptbHost } from '@/services/pptb/host.types';

  export const HostContext = createContext<PptbHost | null>(null);

  export function useHost(): PptbHost {
    const host = use(HostContext);
    if (host === null) throw new Error('useHost must be used inside the App');
    return host;
  }
  ```

  ```ts file=src/app/useNotify.ts
  import { createContext, use } from 'react';
  import type { Notice } from '@/services/pptb/host.types';

  export const NotifyContext = createContext<((n: Notice) => void) | null>(null);

  export function useNotify(): (n: Notice) => void {
    const notify = use(NotifyContext);
    if (notify === null) throw new Error('useNotify must be used inside the App');
    return notify;
  }
  ```

  ```tsx file=src/app/NotifyProvider.tsx
  import { useRef, useState } from 'react';
  import type { ReactElement, ReactNode } from 'react';
  import { useHost } from '@/app/HostContext';
  import { NotifyContext } from '@/app/useNotify';
  import { ToastStack } from '@/components/ToastStack';
  import type { ToastItem } from '@/components/ToastStack';
  import type { Notice } from '@/services/pptb/host.types';

  export function NotifyProvider({ children }: { children: ReactNode }): ReactElement {
    const host = useHost();
    const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
    const nextId = useRef(0);

    // The adapter has already logged the host failure by error name; the fallback is local state only.
    function notify(n: Notice): void {
      host.notify(n).catch(() => {
        nextId.current += 1;
        const toast: ToastItem = { id: `toast-${String(nextId.current)}`, ...n };
        setToasts((current) => [...current, toast]);
      });
    }

    function close(id: string): void {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }

    return (
      <NotifyContext value={notify}>
        {children}
        <ToastStack toasts={toasts} onClose={close} />
      </NotifyContext>
    );
  }
  ```

  Run: `npx vitest run src/app/NotifyProvider.test.tsx`. Expect: PASS, 7 tests. If ESLint later flags `no-floating-promises` on `host.notify(n).catch(...)`, it is wrong: the chain ends in `.catch`, which the rule accepts.

  ```bash
  npx prettier --write src/app
  npx eslint src/app --max-warnings=0
  git add src/app/HostContext.ts src/app/useNotify.ts src/app/NotifyProvider.tsx src/app/NotifyProvider.test.tsx
  git commit -m "feat(shell): route notices through the host with an in-tool fallback toast"
  ```

- [ ] **Step 5: Write the active-connection test**

  ```tsx file=src/app/ConnectionProvider.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import type { ReactElement } from 'react';
  import { ConnectionProvider } from '@/app/ConnectionProvider';
  import { HostContext } from '@/app/HostContext';
  import { useActiveConnection } from '@/app/useActiveConnection';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import type { Connection } from '@/services/pptb/host.types';

  afterEach(cleanup);

  const CONTOSO: Connection = { id: 'c1', name: 'Contoso', url: 'https://contoso.crm.dynamics.com', environment: 'Dev' };
  const FABRIKAM: Connection = { id: 'c2', name: 'Fabrikam', url: 'https://fabrikam.crm.dynamics.com', environment: 'Test' };

  function Show(): ReactElement {
    const connection = useActiveConnection();
    return <p>{connection === null ? 'none' : connection.name}</p>;
  }

  async function mount(connection: Connection | null) {
    const host = createFakeHost({ connection });
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    return host;
  }

  describe('useActiveConnection', () => {
    it('reads the active connection on start', async () => {
      await mount(CONTOSO);
      expect(screen.getByText('Contoso')).toBeTruthy();
    });

    it('is null without a connection', async () => {
      await mount(null);
      expect(screen.getByText('none')).toBeTruthy();
    });

    it('re-reads on connection-changed and subscribes once', async () => {
      const host = await mount(CONTOSO);
      expect(host.listenerCount()).toBe(1);
      host.setConnection(FABRIKAM);
      await act(async () => {
        host.emit({ kind: 'connection-changed' });
        await Promise.resolve();
      });
      expect(screen.getByText('Fabrikam')).toBeTruthy();
      expect(host.callsOf('getActiveConnection')).toHaveLength(2);
    });

    it('ignores other events', async () => {
      const host = await mount(CONTOSO);
      await act(async () => {
        host.emit({ kind: 'settings-updated' });
        await Promise.resolve();
      });
      expect(host.callsOf('getActiveConnection')).toHaveLength(1);
    });
  });
  ```

  Run: `npx vitest run src/app/ConnectionProvider.test.tsx`. Expect: FAIL, `Failed to resolve import "@/app/ConnectionProvider"`.

- [ ] **Step 6: Implement the connection provider, run, commit**

  ```ts file=src/app/useActiveConnection.ts
  import { createContext, use } from 'react';
  import type { Connection } from '@/services/pptb/host.types';

  export const ConnectionContext = createContext<Connection | null>(null);

  export function useActiveConnection(): Connection | null {
    return use(ConnectionContext);
  }
  ```

  ```tsx file=src/app/ConnectionProvider.tsx
  import { useEffect, useState } from 'react';
  import type { ReactElement, ReactNode } from 'react';
  import { useHost } from '@/app/HostContext';
  import { ConnectionContext } from '@/app/useActiveConnection';
  import type { Connection } from '@/services/pptb/host.types';

  export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
    const host = useHost();
    const [connection, setConnection] = useState<Connection | null>(null);

    useEffect(() => {
      let latest = 0;
      const load = (): void => {
        latest += 1;
        const request = latest;
        // A rejected read means the host could not say; the adapter has logged it. Show "Not connected".
        host.getActiveConnection().then(
          (value) => {
            if (request === latest) setConnection(value);
          },
          () => {
            if (request === latest) setConnection(null);
          },
        );
      };
      load();
      const unsubscribe = host.onEvent((event) => {
        if (event.kind === 'connection-changed') load();
      });
      return () => {
        latest += 1;
        unsubscribe();
      };
    }, [host]);

    return <ConnectionContext value={connection}>{children}</ConnectionContext>;
  }
  ```

  ```bash
  npx vitest run src/app/ConnectionProvider.test.tsx
  npx prettier --write src/app
  npx eslint src/app --max-warnings=0
  git add src/app/useActiveConnection.ts src/app/ConnectionProvider.tsx src/app/ConnectionProvider.test.tsx
  git commit -m "feat(shell): track the active PPTB connection"
  ```

  Expect: PASS, 4 tests. The request counter discards a slow answer that a newer read has superseded.

- [ ] **Step 7: Write the host-theme test**

  ```tsx file=src/app/useHostTheme.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, render } from '@testing-library/react';
  import { afterEach, beforeEach, describe, expect, it } from 'vitest';
  import type { ReactElement } from 'react';
  import { applyTheme, useHostTheme } from '@/app/useHostTheme';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import type { PptbHost } from '@/services/pptb/host.types';

  function Themed({ host }: { host: PptbHost }): ReactElement | null {
    useHostTheme(host);
    return null;
  }

  const flush = () =>
    act(async () => {
      await Promise.resolve();
    });

  beforeEach(() => {
    applyTheme('light');
  });
  afterEach(cleanup);

  describe('useHostTheme (AC-1.6)', () => {
    it('re-reads the theme on settings-updated', async () => {
      const host = createFakeHost({ theme: 'light' });
      render(<Themed host={host} />);
      host.setTheme('dark');
      host.emit({ kind: 'settings-updated' });
      await flush();
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('re-reads the theme on window focus and when the document becomes visible', async () => {
      const host = createFakeHost({ theme: 'light' });
      render(<Themed host={host} />);
      host.setTheme('dark');
      window.dispatchEvent(new Event('focus'));
      await flush();
      expect(document.documentElement.dataset.theme).toBe('dark');
      host.setTheme('light');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('keeps the current theme when the host cannot answer', async () => {
      applyTheme('dark');
      const failing: PptbHost = { ...createFakeHost(), getTheme: () => Promise.reject(new Error('x')) };
      render(<Themed host={failing} />);
      window.dispatchEvent(new Event('focus'));
      await flush();
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('removes its listeners on unmount', async () => {
      const host = createFakeHost({ theme: 'light' });
      const { unmount } = render(<Themed host={host} />);
      unmount();
      expect(host.listenerCount()).toBe(0);
      host.setTheme('dark');
      window.dispatchEvent(new Event('focus'));
      await flush();
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });
  ```

  jsdom reports `document.visibilityState` as `'visible'`, so the visibility event counts. Run: `npx vitest run src/app/useHostTheme.test.tsx`. Expect: FAIL, `Failed to resolve import "@/app/useHostTheme"`.

- [ ] **Step 8: Implement `useHostTheme`, run, commit**

  ```ts file=src/app/useHostTheme.ts
  import { useEffect } from 'react';
  import type { PptbHost, ThemeName } from '@/services/pptb/host.types';

  export function applyTheme(theme: ThemeName): void {
    document.documentElement.dataset.theme = theme;
  }

  // PPTB has no theme event, so re-read on settings:updated, focus and visibility (AC-1.6).
  export function useHostTheme(host: PptbHost): void {
    useEffect(() => {
      let active = true;
      const reread = (): void => {
        host.getTheme().then(
          (theme) => {
            if (active) applyTheme(theme);
          },
          () => undefined, // keep the current theme; the adapter has logged the failure
        );
      };
      const onVisibility = (): void => {
        if (document.visibilityState === 'visible') reread();
      };
      const unsubscribe = host.onEvent((event) => {
        if (event.kind === 'settings-updated') reread();
      });
      window.addEventListener('focus', reread);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        active = false;
        unsubscribe();
        window.removeEventListener('focus', reread);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }, [host]);
  }
  ```

  ```bash
  npx vitest run src/app/useHostTheme.test.tsx
  npx prettier --write src/app
  npx eslint src/app --max-warnings=0
  git add src/app/useHostTheme.ts src/app/useHostTheme.test.tsx
  git commit -m "feat(shell): follow the host theme on settings, focus and visibility"
  ```

  Expect: PASS, 4 tests.

- [ ] **Step 9: Write the external-link and error-boundary tests**

  ```tsx file=src/app/ExternalLink.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { ExternalLink } from '@/app/ExternalLink';
  import { HostContext } from '@/app/HostContext';
  import { NotifyProvider } from '@/app/NotifyProvider';
  import { createFakeHost } from '@/services/pptb/fakeHost';

  afterEach(cleanup);

  const LEARN = 'https://learn.microsoft.com/power-pages/configure/server-logic-overview';

  function mount(openExternal: 'ok' | 'reject', notify: 'ok' | 'reject' = 'ok') {
    const host = createFakeHost({ openExternal, notify });
    render(
      <HostContext value={host}>
        <NotifyProvider>
          <ExternalLink href={LEARN}>Server logic overview</ExternalLink>
        </NotifyProvider>
      </HostContext>,
    );
    return host;
  }

  describe('ExternalLink (FR-1)', () => {
    it('keeps a real href and opens nothing on render', () => {
      const host = mount('ok');
      expect(screen.getByRole('link', { name: 'Server logic overview' }).getAttribute('href')).toBe(LEARN);
      expect(host.callsOf('openExternal')).toHaveLength(0);
    });

    it('opens the link through the host on click, without target="_blank"', async () => {
      const host = mount('ok');
      const link = screen.getByRole('link');
      expect(link.getAttribute('target')).toBeNull();
      await act(async () => {
        fireEvent.click(link);
        await Promise.resolve();
      });
      expect(host.callsOf('openExternal')).toEqual([{ method: 'openExternal', url: LEARN }]);
    });

    it('shows an error notice when the host cannot open it', async () => {
      const host = mount('reject');
      await act(async () => {
        fireEvent.click(screen.getByRole('link'));
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(host.callsOf('notify')).toEqual([
        {
          method: 'notify',
          notice: { title: "Couldn't open the link", body: 'Open it from your browser instead.', type: 'error' },
        },
      ]);
    });
  });
  ```

  ```tsx file=src/app/PageErrorBoundary.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { PageErrorBoundary } from '@/app/PageErrorBoundary';

  afterEach(cleanup);

  function Broken(): never {
    throw new Error('not implemented: phase 07');
  }

  describe('PageErrorBoundary', () => {
    it('renders its children when nothing throws', () => {
      render(
        <PageErrorBoundary label="Logic Starter">
          <p>fine</p>
        </PageErrorBoundary>,
      );
      expect(screen.getByText('fine')).toBeTruthy();
    });

    it('shows a plain fallback, with no error text, when a page throws', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      render(
        <PageErrorBoundary label="Logic Starter">
          <Broken />
        </PageErrorBoundary>,
      );
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe("Logic Starter couldn't load. Close and reopen the tool.");
      expect(alert.textContent).not.toContain('phase 07');
    });
  });
  ```

  Run: `npx vitest run src/app/ExternalLink.test.tsx src/app/PageErrorBoundary.test.tsx`. Expect: FAIL, both imports unresolved.

- [ ] **Step 10: Implement `ExternalLink` and `PageErrorBoundary`, run, commit**

  ```tsx file=src/app/ExternalLink.tsx
  import type { ComponentProps, MouseEvent, ReactElement } from 'react';
  import { useHost } from '@/app/HostContext';
  import { useNotify } from '@/app/useNotify';

  export type ExternalLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick' | 'target'> & {
    href: string;
  };

  // The host blocks target="_blank"; links open only on click through openInConnectionBrowser (FR-1).
  export function ExternalLink({ href, children, ...rest }: ExternalLinkProps): ReactElement {
    const host = useHost();
    const notify = useNotify();

    function open(event: MouseEvent<HTMLAnchorElement>): void {
      event.preventDefault();
      host.openExternal(href).catch(() => {
        notify({ title: "Couldn't open the link", body: 'Open it from your browser instead.', type: 'error' });
      });
    }

    return (
      <a {...rest} href={href} onClick={open}>
        {children}
      </a>
    );
  }
  ```

  ```tsx file=src/app/PageErrorBoundary.tsx
  import { Component } from 'react';
  import type { ReactNode } from 'react';

  type Props = { label: string; children: ReactNode };
  type State = { failed: boolean };

  // React 19 has no function-component error boundary; createRoot's onCaughtError logs the error name.
  export class PageErrorBoundary extends Component<Props, State> {
    override state: State = { failed: false };

    static getDerivedStateFromError(): State {
      return { failed: true };
    }

    override render(): ReactNode {
      if (!this.state.failed) return this.props.children;
      return (
        <p role="alert" className="shell__page-error">
          {`${this.props.label} couldn't load. Close and reopen the tool.`}
        </p>
      );
    }
  }
  ```

  ```bash
  npx vitest run src/app/ExternalLink.test.tsx src/app/PageErrorBoundary.test.tsx
  npx prettier --write src/app
  npx eslint src/app --max-warnings=0
  git add src/app/ExternalLink.tsx src/app/ExternalLink.test.tsx src/app/PageErrorBoundary.tsx src/app/PageErrorBoundary.test.tsx
  git commit -m "feat(shell): add click-only external links and a page error boundary"
  ```

  Expect: PASS, 5 tests. `react-refresh/only-export-components` accepts a class component export.

- [ ] **Step 11: Write the top-tabs test (APG tabs, AC-1.1, AC-1.5, AC-1.7)**

  `TopTabs` takes the released list as a prop, so AC-1.7 is tested with any subset and no build constant or module mock.

  ```tsx file=src/app/shell/TopTabs.test.tsx
  // @vitest-environment jsdom
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import type { View } from '@/types/http';
  import { TopTabs } from './TopTabs';

  afterEach(cleanup);

  function mount(view: View, released: readonly View[] = ['starter', 'objects', 'inspector']) {
    const onSelect = vi.fn<(v: View) => void>();
    render(<TopTabs view={view} released={released} onSelect={onSelect} />);
    return onSelect;
  }

  const tab = (name: string) => screen.getByRole('tab', { name });

  describe('TopTabs', () => {
    it('shows the three tabs in order with Logic Starter selected (AC-1.1)', () => {
      mount('starter');
      expect(screen.getByRole('tablist', { name: 'Pages' })).toBeTruthy();
      expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
        'Logic Starter',
        'Server Objects',
        'Logic Inspector',
      ]);
      expect(tab('Logic Starter').getAttribute('aria-selected')).toBe('true');
      expect(tab('Logic Starter').getAttribute('aria-controls')).toBe('panel-starter');
      expect(tab('Logic Starter').tabIndex).toBe(0);
      expect(tab('Server Objects').tabIndex).toBe(-1);
    });

    it('draws an icon in each tab: code, cube (server colour) and target (review colour)', () => {
      mount('starter');
      expect(tab('Logic Starter').querySelector('.shell__tab-icon--starter svg')).not.toBeNull();
      expect(tab('Server Objects').querySelector('.shell__tab-icon--objects svg')).not.toBeNull();
      expect(tab('Logic Inspector').querySelector('.shell__tab-icon--inspector svg')).not.toBeNull();
    });

    it('selects on click, and on Enter or Space', () => {
      const onSelect = mount('starter');
      fireEvent.click(tab('Logic Inspector'));
      fireEvent.keyDown(tab('Server Objects'), { key: 'Enter' });
      fireEvent.keyDown(tab('Server Objects'), { key: ' ' });
      expect(onSelect.mock.calls).toEqual([['inspector'], ['objects'], ['objects']]);
    });

    it('moves focus and selects with the arrows (wrapping), Home and End', () => {
      const onSelect = mount('starter');
      fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(tab('Server Objects'));
      fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(tab('Logic Inspector'));
      fireEvent.keyDown(tab('Logic Starter'), { key: 'End' });
      fireEvent.keyDown(tab('Logic Inspector'), { key: 'Home' });
      expect(document.activeElement).toBe(tab('Logic Starter'));
      expect(onSelect.mock.calls).toEqual([['objects'], ['inspector'], ['inspector'], ['starter']]);
    });

    describe('an unreleased page (AC-1.7)', () => {
      it('keeps its tab, disabled, in the arrow order, never selectable and with no tooltip', () => {
        const onSelect = mount('starter', ['starter', 'objects']);
        const inspector = tab('Logic Inspector');
        expect(inspector.getAttribute('aria-disabled')).toBe('true');
        expect(inspector.getAttribute('aria-describedby')).toBeNull();
        expect(inspector.getAttribute('title')).toBeNull();
        fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowLeft' });
        expect(document.activeElement).toBe(inspector);
        fireEvent.click(inspector);
        fireEvent.keyDown(inspector, { key: 'Enter' });
        expect(onSelect).not.toHaveBeenCalled();
      });

      it('has no aria-controls, because its panel never renders', () => {
        mount('objects', ['objects']);
        expect(tab('Logic Starter').getAttribute('aria-controls')).toBeNull();
        expect(tab('Server Objects').getAttribute('aria-selected')).toBe('true');
      });
    });
  });
  ```

  Run: `npx vitest run src/app/shell/TopTabs.test.tsx`. Expect: FAIL, `Failed to resolve import "./TopTabs"`.

- [ ] **Step 12: Implement `TopTabs`, `SitePill`, `TitleBar` and `shell.css`**

  ```tsx file=src/app/shell/TopTabs.tsx
  import type { KeyboardEvent, ReactElement } from 'react';
  import { Icon } from '@/components/Icon';
  import type { IconName } from '@/components/icons';
  import { classNames } from '@/lib/classNames';
  import type { View } from '@/types/http';

  const TABS = [
    { view: 'starter', label: 'Logic Starter', icon: 'code' },
    { view: 'objects', label: 'Server Objects', icon: 'cube' },
    { view: 'inspector', label: 'Logic Inspector', icon: 'target' },
  ] as const satisfies readonly { view: View; label: string; icon: IconName }[];

  export type TopTabsProps = {
    view: View;
    released: readonly View[];
    onSelect: (view: View) => void;
  };

  // APG tabs with automatic activation; an unreleased tab takes focus but is never selected (AC-1.7).
  export function TopTabs({ view, released, onSelect }: TopTabsProps): ReactElement {
    const select = (target: View): void => {
      if (released.includes(target)) onSelect(target);
    };

    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
      const last = TABS.length - 1;
      const moves: Record<string, number> = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      };
      const next = moves[event.key];
      if (next !== undefined) {
        event.preventDefault();
        const target = TABS[next];
        if (target === undefined) return;
        document.getElementById(`tab-${target.view}`)?.focus();
        select(target.view);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const current = TABS[index];
        if (current !== undefined) select(current.view);
      }
    }

    return (
      <div role="tablist" aria-label="Pages" className="shell__tabs">
        {TABS.map((tab, index) => {
          const isReleased = released.includes(tab.view);
          const selected = tab.view === view;
          return (
            <button
              key={tab.view}
              id={`tab-${tab.view}`}
              type="button"
              role="tab"
              className={classNames('shell__tab', selected && 'shell__tab--selected')}
              aria-selected={selected}
              aria-controls={isReleased ? `panel-${tab.view}` : undefined}
              aria-disabled={isReleased ? undefined : true}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                select(tab.view);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
            >
              <span className={`shell__tab-icon shell__tab-icon--${tab.view}`}>
                <Icon name={tab.icon} size={14} />
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }
  ```

  ```tsx file=src/app/shell/SitePill.tsx
  import type { ReactElement } from 'react';
  import { Pill } from '@/components/Pill';

  // Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).
  export function SitePill(): ReactElement {
    return (
      <Pill compact aria-disabled="true" className="shell__site">
        No site selected
      </Pill>
    );
  }
  ```

  ```tsx file=src/app/shell/TitleBar.tsx
  import type { ReactElement } from 'react';
  import { RELEASED_PAGES } from '@/app/releasedPages';
  import { useActiveConnection } from '@/app/useActiveConnection';
  import { useView } from '@/app/useView';
  import { connectionLabel } from './connectionLabel';
  import { SitePill } from './SitePill';
  import { TopTabs } from './TopTabs';
  import './shell.css';

  export function TitleBar(): ReactElement {
    const [view, setView] = useView();
    const connection = useActiveConnection();
    return (
      <header className="shell__titlebar">
        <span className="shell__glyph" aria-hidden="true" />
        <span className="shell__name">Server Logic Tools</span>
        <TopTabs view={view} released={RELEASED_PAGES} onSelect={setView} />
        <span className="shell__context">
          <span>{connectionLabel(connection)}</span>
          <SitePill />
        </span>
      </header>
    );
  }
  ```

  `src/app/shell/shell.css` (layout 10a §1, reference `01-logic-starter-light.html` title bar; colours only through Phase 04 tokens):

  ```css file=src/app/shell/shell.css
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .shell__titlebar {
    height: 42px;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    padding-left: 14px;
    flex: none;
  }

  /* The app glyph: a small primary/review ring (10a title bar). */
  .shell__glyph {
    align-self: center;
    margin-right: 10px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex: none;
    background: conic-gradient(var(--primary) 0 200deg, var(--review) 200deg);
    mask: radial-gradient(circle, transparent 4px, #000 4.5px);
  }

  .shell__name {
    align-self: center;
    font-size: 12px;
    margin-right: 14px;
    white-space: nowrap;
  }

  .shell__tabs {
    display: flex;
    gap: 2px;
  }

  .shell__tab {
    height: 32px;
    padding: 0 16px;
    border: 0;
    border-radius: 8px 8px 0 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 10px;
    font: inherit;
    font-size: 12.5px;
    color: var(--muted);
    white-space: nowrap;
    cursor: pointer;
  }

  .shell__tab--selected {
    background: var(--surface);
    color: var(--text);
  }

  .shell__tab[aria-disabled="true"] {
    cursor: default;
    opacity: 0.55;
  }

  .shell__tab:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .shell__tab-icon {
    display: inline-flex;
  }

  .shell__tab-icon--starter {
    color: var(--text);
  }

  .shell__tab-icon--objects {
    color: var(--server);
  }

  .shell__tab-icon--inspector {
    color: var(--review);
  }

  .shell__context {
    margin-left: auto;
    align-self: center;
    display: flex;
    gap: 8px;
    align-items: center;
    padding-right: 18px;
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }

  .shell__content {
    flex: 1;
    min-height: 0;
    background: var(--surface);
  }

  .shell__page-error {
    margin: 16px;
    color: var(--text);
  }
  ```

  Dark-theme note: `--surface` is transparent in dark (FR-11), so the selected tab shows the aurora through it, as in reference `02-logic-starter-dark.html`.

  ```bash
  npx vitest run src/app/shell
  npx prettier --write src/app/shell
  npx eslint src/app/shell --max-warnings=0
  git add src/app/shell
  git commit -m "feat(shell): add the title bar with APG top tabs, connection context and site pill"
  ```

  Expect: PASS, 13 tests (6 label, 7 tabs). `useView` is still a stub here; `TitleBar` is exercised in Step 13.

- [ ] **Step 13: Write the App test**

  Replaces Phase 00's skeleton test. `RELEASED_PAGES` is all three pages under Vitest (no `VITE_RELEASED_PAGES`), so the AC-1.7 cases live in `TopTabs.test.tsx`.

  ```tsx file=src/app/App.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { App } from '@/app/App';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import type { Connection } from '@/services/pptb/host.types';

  afterEach(cleanup);

  const CONTOSO: Connection = { id: 'c1', name: 'Contoso', url: 'https://contoso.crm.dynamics.com', environment: 'Dev' };

  async function mount(connection: Connection | null = null) {
    const host = createFakeHost({ connection });
    render(<App host={host} />);
    await act(async () => {
      await Promise.resolve();
    });
    return host;
  }

  const panel = (id: string) => document.getElementById(`panel-${id}`);

  describe('App shell', () => {
    it('renders with no PPTB host globals', async () => {
      expect('toolboxAPI' in window).toBe(false);
      await mount();
      expect(screen.getByText('Server Logic Tools')).toBeTruthy();
    });

    it('shows Logic Starter first, with the other released pages mounted but hidden (AC-1.1, AC-1.4)', async () => {
      await mount();
      expect(panel('starter')?.hidden).toBe(false);
      expect(panel('objects')?.hidden).toBe(true);
      expect(panel('inspector')?.hidden).toBe(true);
      expect(panel('starter')?.getAttribute('role')).toBe('tabpanel');
      expect(panel('starter')?.getAttribute('aria-labelledby')).toBe('tab-starter');
    });

    it('swaps the visible page immediately and keeps the others mounted (AC-1.4)', async () => {
      await mount();
      fireEvent.click(screen.getByRole('tab', { name: 'Server Objects' }));
      expect(panel('objects')?.hidden).toBe(false);
      expect(panel('starter')?.hidden).toBe(true);
      expect(screen.getByText('Logic Starter page placeholder')).toBeTruthy();
    });

    it('reads "Not connected" and keeps the site pill disabled without a connection (AC-1.3)', async () => {
      await mount(null);
      expect(screen.getByText('Not connected')).toBeTruthy();
      expect(screen.getByText('No site selected').getAttribute('aria-disabled')).toBe('true');
      expect(screen.getByText('Logic Starter page placeholder')).toBeTruthy();
    });

    it('shows the connection and its environment (AC-1.2), and follows connection changes', async () => {
      const host = await mount(CONTOSO);
      expect(screen.getByText('Contoso · Development')).toBeTruthy();
      host.setConnection(null);
      await act(async () => {
        host.emit({ kind: 'connection-changed' });
        await Promise.resolve();
      });
      expect(screen.getByText('Not connected')).toBeTruthy();
    });

    it('registers one host event listener for the whole app and removes it on unload (FR-12)', async () => {
      const host = createFakeHost();
      const { unmount } = render(<App host={host} />);
      await act(async () => {
        await Promise.resolve();
      });
      // One adapter-level registration is Phase 01's job; the app adds two handlers (theme, connection) to it.
      expect(host.listenerCount()).toBe(2);
      unmount();
      expect(host.listenerCount()).toBe(0);
    });
  });
  ```

  Run: `npx vitest run src/app/App.test.tsx`. Expect: FAIL: `App` is still Phase 00's skeleton (no `host` prop, no `panel-*` ids, `useView` throws).

- [ ] **Step 14: Implement `useView`, `App`, `main.tsx` and `index.css`**

  ```ts file=src/app/useView.ts
  import { createContext, use } from 'react';
  import type { View } from '@/types/http';

  export const ViewContext = createContext<[View, (v: View) => void] | null>(null);

  export function useView(): [View, (v: View) => void] {
    const value = use(ViewContext);
    if (value === null) throw new Error('useView must be used inside the App');
    return value;
  }
  ```

  ```tsx file=src/app/App.tsx
  import { useState } from 'react';
  import type { ReactElement, ReactNode } from 'react';
  import { ConnectionProvider } from '@/app/ConnectionProvider';
  import { HostContext } from '@/app/HostContext';
  import { NotifyProvider } from '@/app/NotifyProvider';
  import { PageErrorBoundary } from '@/app/PageErrorBoundary';
  import { RELEASED_PAGES } from '@/app/releasedPages';
  import { TitleBar } from '@/app/shell/TitleBar';
  import { useHostTheme } from '@/app/useHostTheme';
  import { ViewContext } from '@/app/useView';
  import { InspectorPage } from '@/features/inspector/InspectorPage';
  import { ServerObjectsPage } from '@/features/server-objects/ServerObjectsPage';
  import { StarterPage } from '@/features/starter/StarterPage';
  import type { PptbHost } from '@/services/pptb/host.types';
  import type { View } from '@/types/http';

  export type AppProps = { host: PptbHost };

  function Panel({ id, label, view, children }: { id: View; label: string; view: View; children: ReactNode }): ReactElement {
    return (
      <div id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={view !== id}>
        <PageErrorBoundary label={label}>{children}</PageErrorBoundary>
      </div>
    );
  }

  export function App({ host }: AppProps): ReactElement {
    const [view, setViewState] = useState<View>(RELEASED_PAGES[0] ?? 'starter');
    useHostTheme(host);

    const setView = (next: View): void => {
      if (RELEASED_PAGES.includes(next)) setViewState(next);
    };

    return (
      <HostContext value={host}>
        <NotifyProvider>
          <ConnectionProvider>
            <ViewContext value={[view, setView]}>
              <div className="shell">
                <TitleBar />
                <main className="shell__content">
                  {/* Constant conditions: unreleased pages are dropped from the bundle (FR-1, Phase 00). */}
                  {__PAGE_STARTER__ ? (
                    <Panel id="starter" label="Logic Starter" view={view}>
                      <StarterPage />
                    </Panel>
                  ) : null}
                  {__PAGE_OBJECTS__ ? (
                    <Panel id="objects" label="Server Objects" view={view}>
                      <ServerObjectsPage />
                    </Panel>
                  ) : null}
                  {__PAGE_INSPECTOR__ ? (
                    <Panel id="inspector" label="Logic Inspector" view={view}>
                      <InspectorPage />
                    </Panel>
                  ) : null}
                </main>
              </div>
            </ViewContext>
          </ConnectionProvider>
        </NotifyProvider>
      </HostContext>
    );
  }
  ```

  `Panel` is defined at module level, not inside `App` (`.claude/rules/react.md`).

  ```tsx file=src/main.tsx
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from '@/app/App';
  import { applyTheme } from '@/app/useHostTheme';
  import { createPptbHost } from '@/services/pptb/pptbHost';
  import type { ThemeName } from '@/services/pptb/host.types';
  import './index.css';

  function logRenderError(error: unknown): void {
    console.error('Render error', error instanceof Error ? error.name : 'unknown');
  }

  const rootElement = document.getElementById('root');
  if (rootElement === null) {
    throw new Error('Root element #root not found');
  }
  const root = rootElement;
  const host = createPptbHost();

  // First frame in the host theme; light when the host cannot answer (AC-1.6). No top-level await in an IIFE.
  void host
    .getTheme()
    .catch((): ThemeName => 'light')
    .then((theme) => {
      applyTheme(theme);
      createRoot(root, {
        onCaughtError: (error) => {
          logRenderError(error);
        },
        onUncaughtError: (error) => {
          logRenderError(error);
        },
      }).render(
        <StrictMode>
          <App host={host} />
        </StrictMode>,
      );
    });
  ```

  ```css file=src/index.css
  @import './assets/fonts/fonts.css';
  @import './app/theme/tokens.css';
  ```

  The body font, background and 1024×700 floor come from `tokens.css` (Phase 04); `fonts.css` stays first so the JetBrains Mono faces are declared before anything names them.

  Run: `npx vitest run src/app`. Expect: PASS, every file in `src/app` (connection label 6, notify 7, connection 4, theme 4, external link 3, error boundary 2, tabs 7, App 6, and Phase 00's `releasedPages.test.ts` 1).

  If the listener test counts differently, check Phase 01's fake: `listenerCount()` counts app handlers. Two handlers (theme and connection) on one host is FR-12's "one registration" because the adapter forwards one `toolboxAPI.events.on` to all handlers (Phase 01 test "subscribes once").

- [ ] **Step 15: Run the gate and commit**

  ```bash
  npx prettier --write src
  npx tsc -b
  npx eslint . --max-warnings=0
  npx vitest run
  npm run build
  git add -A
  git commit -m "feat(shell): wire the app shell, host theme, notices and released pages"
  ```

  Expect: all green. `npm run build` still emits one IIFE bundle (Phase 00's build-shape test runs inside `vitest run`). The skeleton test's `useView` and `useHost` signatures are unchanged.

## Phase verification

```bash
npx tsc -b
npx eslint . --max-warnings=0
npx prettier --check .
npx vitest run
npm run build
grep -rn "window\.\(toolboxAPI\|dataverseAPI\|powerplatformAPI\)" src --include=*.ts --include=*.tsx | grep -v "src/services/pptb/"
grep -rn "target=\"_blank\"\|alert(" src --include=*.tsx
git status --short
```

Expect: the first five pass; both `grep` commands print nothing (host globals only in the adapter; no `_blank`, no `alert()`); a clean tree.

◆ **Owner check at the Starter release gate, not an agent task:** load the build in PPTB (Debug, Load Local Tool, the project root), switch the PPTB theme while the tool is open and refocus it (AC-1.6), switch connections (AC-1.2, AC-1.3), and make a host notification fail to see the fallback toast if the host offers a way to.

## Done when

- The title bar shows the glyph, "Server Logic Tools", the three APG tabs with their Fluent icons, the connection label and the disabled site pill; Logic Starter (or the first released page) is selected (AC-1.1, AC-1.2, AC-1.3).
- Switching tabs swaps the visible panel at once and keeps every released page mounted (AC-1.4); tabs show the 2px primary focus ring (AC-1.5).
- The first frame uses the host theme, re-reads follow settings, focus and visibility, and a failed read keeps the current theme (AC-1.6).
- An unreleased tab is disabled, focusable in the arrow order, never selected and has no tooltip; its panel never renders (AC-1.7, with Phase 00's build-time half).
- `useNotify` shows host notifications, falling back to the in-tool toast when the host call is missing, throws or rejects, without calling the host again (FR-1).
- `ExternalLink` opens links only on click through the host (FR-1). The app adds its event handlers once and removes them on unload (FR-12).
- Every name under **Interfaces: Produces** exists exactly as listed.
