// Test helper, never imported by the app: mounts Starter UI inside the providers App gives it, on a fake host.
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import type { StarterDeps } from '@/app/starter-session/starterDeps';
import type { StarterAction } from '@/app/starter-session/starterSession.types';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/app/starter-session/useStarterSession';
import type { useStarterSession } from '@/app/starter-session/useStarterSession';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';

type Session = ReturnType<typeof useStarterSession>;

export function renderStarter(
  ui: ReactElement,
  options: { deps?: StarterDeps; host?: FakeHostInit } = {},
) {
  const host = createFakeHost(options.host);
  const user = userEvent.setup();
  let latest: Session | null = null;
  render(
    <HostContext value={host}>
      <NotifyProvider>
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
  return { host, user, session, dispatch };
}
