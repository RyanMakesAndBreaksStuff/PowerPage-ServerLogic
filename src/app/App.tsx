import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/session/HostContext';
import { INSPECTOR_DEPS } from '@/features/inspector/inspectorDeps';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import { InspectorSessionProvider } from '@/app/inspector-site/InspectorSessionProvider';
import { NotifyProvider } from '@/app/NotifyProvider';
import { PageErrorBoundary } from '@/app/PageErrorBoundary';
import { RELEASED_PAGES } from '@/app/releasedPages';
import { TitleBar } from '@/app/shell/TitleBar';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { STARTER_DEPS } from '@/session/starterDeps';
import type { StarterDeps } from '@/session/starterDeps';
import { useHostTheme } from '@/app/useHostTheme';
import { ViewContext } from '@/session/useView';
import { InspectorPage } from '@/features/inspector/InspectorPage';
import { ServerObjectsPage } from '@/features/server-objects/ServerObjectsPage';
import { StarterPage } from '@/features/starter/StarterPage';
import type { PptbHost } from '@/services/pptb/host.types';
import type { View } from '@/types/http';

export type AppProps = { host: PptbHost; starterDeps?: StarterDeps; inspectorDeps?: InspectorDeps };

/**
 * The Inspector session wraps the title bar and every page, so it keeps following connection changes while
 * Starter or Server Objects is visible. The constant condition drops it from builds without the Inspector.
 */
function InspectorScope({
  deps,
  children,
}: {
  deps: InspectorDeps | undefined;
  children: ReactNode;
}): ReactNode {
  return __PAGE_INSPECTOR__ ? (
    <InspectorSessionProvider deps={deps ?? INSPECTOR_DEPS}>{children}</InspectorSessionProvider>
  ) : (
    children
  );
}

function Panel({
  id,
  label,
  view,
  children,
}: {
  id: View;
  label: string;
  view: View;
  children: ReactNode;
}): ReactElement {
  return (
    <div id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={view !== id}>
      <PageErrorBoundary label={label}>{children}</PageErrorBoundary>
    </div>
  );
}

/** Rendered inside the app boundary so a host that throws while subscribing shows the alert, not a blank window. */
function HostThemeSync({ host }: { host: PptbHost }): null {
  useHostTheme(host);
  return null;
}

export function App({ host, starterDeps = STARTER_DEPS, inspectorDeps }: AppProps): ReactElement {
  const [view, setViewState] = useState<View>(RELEASED_PAGES[0] ?? 'starter');

  const setView = (next: View): void => {
    if (RELEASED_PAGES.includes(next)) setViewState(next);
  };

  return (
    <PageErrorBoundary label="Server Logic Tools">
      <HostThemeSync host={host} />
      <HostContext value={host}>
        <NotifyProvider>
          <ConnectionProvider>
            <ViewContext value={[view, setView]}>
              <InspectorScope deps={inspectorDeps}>
                <div className="shell">
                  <TitleBar />
                  <main className="shell__content">
                    {/* Constant conditions: unreleased pages are dropped from the bundle (FR-1, Phase 00). */}
                    {__PAGE_STARTER__ ? (
                      <StarterSessionProvider deps={starterDeps}>
                        <Panel id="starter" label="Logic Starter" view={view}>
                          <StarterPage />
                        </Panel>
                        {__PAGE_OBJECTS__ ? (
                          <Panel id="objects" label="Server Objects" view={view}>
                            <ServerObjectsPage />
                          </Panel>
                        ) : null}
                      </StarterSessionProvider>
                    ) : null}
                    {__PAGE_INSPECTOR__ ? (
                      <Panel id="inspector" label="Logic Inspector" view={view}>
                        <InspectorPage />
                      </Panel>
                    ) : null}
                  </main>
                </div>
              </InspectorScope>
            </ViewContext>
          </ConnectionProvider>
        </NotifyProvider>
      </HostContext>
    </PageErrorBoundary>
  );
}
