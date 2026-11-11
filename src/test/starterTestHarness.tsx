// Test helper, never imported by the app: mounts Starter UI inside the providers App gives it, on a fake host.
import { EditorView } from '@codemirror/view';
import { act, render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/session/fakeStarterDeps';
import type { StarterDeps } from '@/session/starterDeps';
import type { StarterAction } from '@/types/starter';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/session/useStarterSession';
import type { useStarterSession } from '@/session/useStarterSession';
import { ViewContext } from '@/session/useView';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';
import type { PptbHost } from '@/services/pptb/host.types';
import type { View } from '@/types/http';
import { renderWithHost } from '@/test/renderWithHost';

type Session = ReturnType<typeof useStarterSession>;

export function renderStarter(
  ui: ReactElement,
  options: { deps?: StarterDeps; host?: FakeHostInit; view?: View } = {},
) {
  const host = createFakeHost(options.host);
  const user = userEvent.setup();
  let latest: Session | null = null;
  const views: View[] = [];
  const setView = (v: View): void => {
    views.push(v);
  };
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <ViewContext value={[options.view ?? 'starter', setView]}>
          <StarterSessionProvider deps={options.deps ?? FAKE_STARTER_DEPS}>
            {ui}
            {/* A render function, not a component, so the capture stays out of the app's lint rules. */}
            <StarterSessionContext.Consumer>
              {(session) => {
                latest = session;
                return null;
              }}
            </StarterSessionContext.Consumer>
          </StarterSessionProvider>
        </ViewContext>
      </NotifyProvider>
    </HostContext>,
  );
  const session = (): Session => {
    if (latest === null) throw new Error('Starter session not captured');
    return latest;
  };
  const dispatch = (action: StarterAction): void => {
    act(() => {
      session().dispatch(action);
    });
  };
  return { host, user, views, session, dispatch };
}

/**
 * Mounts `ui` under the host and notification providers and a real Starter session (the provider's default
 * deps, the real generators), with no view context. For tests that build their own host.
 */
export function renderInStarterSession(host: PptbHost, ui: ReactElement): RenderResult {
  return renderWithHost(host, <StarterSessionProvider>{ui}</StarterSessionProvider>);
}

/** Mounts `ui` under the host and notification providers with a fixed Starter session value. */
export function renderWithStarterSession(
  host: PptbHost,
  session: Session,
  ui: ReactElement,
): RenderResult {
  return renderWithHost(host, <StarterSessionContext value={session}>{ui}</StarterSessionContext>);
}

/** The CodeMirror view behind a code pane, found by its textbox name. */
export function editorView(name: string): EditorView {
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name }));
  if (view === null) throw new Error(`No editor named ${name}`);
  return view;
}
