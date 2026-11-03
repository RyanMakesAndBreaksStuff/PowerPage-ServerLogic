import { buildReportModel } from '@/features/inspector/report/buildReportModel';
import { reportFileNameBeforeBuild } from '@/features/inspector/report/reportFileName';
import { renderMarkdown } from '@/features/inspector/report/renderMarkdown';
import { renderPdf } from '@/features/inspector/report/renderPdf';
import { listSites, runScan } from '@/features/inspector/scan/scan';

/**
 * What the session needs from the Inspector feature, supplied by the app as Starter supplies STARTER_DEPS.
 * Tests mostly use the real pair against the fake host; a test that needs exact facts passes its own.
 */
export type InspectorDeps = {
  listSites: typeof listSites;
  runScan: typeof runScan;
  /** Overrides how long a new read waits for the previous generation to settle (tests). */
  settleTimeoutMs?: number;
  // P5.7: what an export needs. Tests inject fakes the way they inject listSites/runScan.
  buildReportModel: typeof buildReportModel;
  renderMarkdown: typeof renderMarkdown;
  renderPdf: typeof renderPdf;
  reportFileNameBeforeBuild: typeof reportFileNameBeforeBuild;
  now: () => Date;
  /**
   * One macrotask (`setTimeout(0)`), never rAF alone (a hidden document never paints and the job would hang).
   * Used before the build so React paints the busy state, and after it so a host answer already delivered
   * (E-04 B commits it synchronously) has invalidated the job before the handoff. Not a timeout.
   */
  yieldToHost: () => Promise<void>;
  /** E-11 B: a build still running this long after submit is reported with a warning toast. Default 5000. */
  exportWatchdogMs?: number;
};

export const INSPECTOR_DEPS: InspectorDeps = {
  listSites,
  runScan,
  buildReportModel,
  renderMarkdown,
  renderPdf,
  reportFileNameBeforeBuild,
  now: () => new Date(),
  yieldToHost: () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    }),
};
