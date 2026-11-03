import { INSPECTOR_DEPS } from '@/app/inspector-site/inspectorDeps';
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
    ...INSPECTOR_DEPS,
    listSites: () => Promise.resolve(sites),
    runScan: (_host, connection, site, scanId) =>
      Promise.resolve({ ...facts, site, connection, scanId }),
  };
}
