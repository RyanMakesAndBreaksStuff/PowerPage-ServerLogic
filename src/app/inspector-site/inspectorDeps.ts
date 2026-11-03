import { listSites, runScan } from '@/features/inspector/scan/scan';

/**
 * What the session needs from the Inspector feature, supplied by the app as Starter supplies STARTER_DEPS.
 * Tests mostly use the real pair against the fake host; a test that needs exact facts passes its own.
 */
export type InspectorDeps = {
  listSites: typeof listSites;
  runScan: typeof runScan;
};

export const INSPECTOR_DEPS: InspectorDeps = { listSites, runScan };
