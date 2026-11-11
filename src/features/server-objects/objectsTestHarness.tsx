// Test helper, never imported by the app: mounts Server Objects inside the providers App gives it, on a fake host.
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import type { StarterAction } from '@/types/starter';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/app/starter-session/useStarterSession';
import type { useStarterSession } from '@/app/starter-session/useStarterSession';
import { ViewContext } from '@/app/useView';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';
import type { View } from '@/types/http';

type Session = ReturnType<typeof useStarterSession>;

export function renderObjects(ui: ReactElement, options: { host?: FakeHostInit } = {}) {
  const host = createFakeHost(options.host);
  const user = userEvent.setup();
  const views: View[] = [];
  let latest: Session | null = null;
  const setView = (v: View): void => {
    views.push(v);
  };
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <ViewContext value={['objects', setView]}>
          <StarterSessionProvider deps={FAKE_STARTER_DEPS}>
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
