import type { ScanProgress, SiteRef } from '@/types/inspector';
import type { PageState } from './pageState';

export const DISCONNECTED_TEXT = 'Select a connection in Power Platform ToolBox to inspect a site.';
export const NON_DEV_WARNING = "This isn't a development environment. Inspector is designed for dev sites.";
export const NO_SITES_TEXT =
  "No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.";
export const NO_FILES_TEXT = 'No server logic found on this site';
export const NOTHING_READ_TEXT = 'No server logic records were read.';
export const REFRESH_FAILED_TEXT =
  "Couldn't refresh the active connection. This page keeps what it last confirmed and tries again when the window regains focus.";
export const CONNECTION_UNREADABLE_TEXT =
  'This page tries again when the window regains focus or the connection changes.';
/** D-14: the scan was abandoned because the active connection changed under it. */
export const CONNECTION_CHANGED_TITLE = 'The connection changed while scanning';
export const connectionChangedText = (site: SiteRef): string =>
  `The scan of ${site.name} was discarded. Choose a site in the title bar to scan again.`;
/** D-09, D-17: Export report is always disabled in P5.5; P5.7 replaces this with the real action. */
export const EXPORT_REASON = 'Report export arrives in a later update.';
/** D-03, D-18: shown in place of the ring, findings and detail until a file is chosen. */
export const NO_FILE_TEXT = 'Select a file to review its readiness.';

/** Banner, reason and summary texts are Markdown-flavoured for exports (`code`); the page shows them plain. */
export const plain = (text: string): string => text.replaceAll('`', '');

/** "Scanned X of N", with context when N is only the records found so far (FR-7). */
export function progressText(progress: ScanProgress | null): string {
  if (progress === null) return 'Reading server logic records…';
  const count = `Scanned ${String(progress.scanned)} of ${String(progress.total)}`;
  return progress.inventoryComplete
    ? count
    : `${count} found so far. The record list is incomplete.`;
}

/**
 * The polite live-region text. It depends on the state kind and the site only, never on the progress count,
 * so a long scan announces its start and its end and nothing in between.
 */
export function announcementFor(state: PageState): string {
  switch (state.kind) {
    case 'connection-unknown':
      return state.failed ? "Couldn't read the active connection." : 'Checking the active connection.';
    case 'disconnected':
      return 'No active connection.';
    case 'sites-loading':
      return 'Loading sites.';
    case 'sites-error':
      return "Couldn't load sites.";
    case 'no-sites':
      return 'No Power Pages sites found.';
    case 'choose-site':
      return 'Select a site to scan.';
    case 'scanning':
      return `Scanning ${state.site.name}.`;
    case 'scan-failed':
      return `Couldn't scan ${state.site.name}.`;
    case 'connection-changed':
      return `${CONNECTION_CHANGED_TITLE}.`;
    case 'results': {
      const { files, facts } = state.result;
      if (facts.stopped !== null) return 'Scan stopped. The connection was lost.';
      // An empty list says "none" only when it was read completely; otherwise nothing was read.
      if (files.length === 0) return facts.inventoryComplete ? `${NO_FILES_TEXT}.` : NOTHING_READ_TEXT;
      return `Scan finished. ${String(files.length)} server logic ${files.length === 1 ? 'file' : 'files'}.`;
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
