import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { ViewContext } from '@/session/useView';
import { createInspectorHost } from '@/test/inspectorWorld';
import { fixedDeps } from '@/test/fixedDeps';
import type { GatedHost } from '@/test/gatedHost';
import { INSPECTOR_DEPS } from '@/features/inspector/inspectorDeps';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import { InspectorPage } from '@/features/inspector/InspectorPage';
import type { SiteFacts, SiteRef } from '@/types/inspector';
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

export type ScannedInspectorOptions = Omit<InspectorHarnessOptions, 'deps' | 'sitePill'> & {
  /** The sites the picker lists; Alpha portal alone unless set. */
  sites?: readonly SiteRef[];
  /** Deps laid over `fixedDeps(facts, sites)`. */
  deps?: Partial<InspectorDeps>;
  /** The picker option to choose; Alpha portal unless set. */
  site?: RegExp;
};

/** Renders InspectorPage, picks a site and stops on the finished page with no file selected (D-03). */
export async function renderScannedInspector(facts: SiteFacts, options: ScannedInspectorOptions = {}) {
  const { sites, deps, site = /Alpha portal/, ...harness } = options;
  const view = renderInspector(<InspectorPage />, {
    ...harness,
    deps: { ...fixedDeps(facts, sites), ...deps },
    sitePill: true,
  });
  await screen.findByRole('heading', { name: 'Select a site' });
  await view.user.click(screen.getByRole('combobox', { name: 'Power Pages site' }));
  await view.user.click(screen.getByRole('option', { name: site }));
  await screen.findByRole('heading', { name: 'Review server logic readiness' });
  return view;
}
