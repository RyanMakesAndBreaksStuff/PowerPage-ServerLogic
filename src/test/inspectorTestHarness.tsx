import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { ViewContext } from '@/session/useView';
import { createInspectorHost } from '@/test/inspectorWorld';
import type { GatedHost } from '@/test/gatedHost';
import { INSPECTOR_DEPS } from '@/features/inspector/inspectorDeps';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import { InspectorSessionProvider } from '@/app/inspector-site/InspectorSessionProvider';
import { SitePill } from '@/app/shell/SitePill';

export type InspectorHarnessOptions = {
  host?: GatedHost;
  deps?: InspectorDeps;
  /** Render under StrictMode, as main.tsx does, to run every effect twice. */
  strict?: boolean;
  /** Render the title bar's SitePill before `ui`, so feature tests can pick a site without importing app/. */
  sitePill?: boolean;
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
              {options.sitePill === true ? <SitePill /> : null}
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
