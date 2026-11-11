// Test helper, never imported by the app: mounts Starter UI inside the providers App gives it, on a fake host.
import { EditorView } from '@codemirror/view';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import type { StarterDeps } from '@/app/starter-session/starterDeps';
import type { StarterAction } from '@/types/starter';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/session/useStarterSession';
import type { useStarterSession } from '@/session/useStarterSession';
import { ViewContext } from '@/session/useView';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';
import type { View } from '@/types/http';

type Session = ReturnType<typeof useStarterSession>;

export function renderStarter(
  ui: ReactElement,
  options: { deps?: StarterDeps; host?: FakeHostInit } = {},
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
        <ViewContext value={['starter', setView]}>
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

/** The CodeMirror view behind a code pane, found by its textbox name. */
export function editorView(name: string): EditorView {
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name }));
  if (view === null) throw new Error(`No editor named ${name}`);
  return view;
}
