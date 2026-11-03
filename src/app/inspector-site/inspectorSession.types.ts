import type { Connection } from '@/services/pptb/host.types';
import type { ReviewKey, ScanProgress, SiteFacts, SiteRef, SiteResult } from '@/types/inspector';

export type SiteListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; sites: readonly SiteRef[] };

/**
 * `done` also covers a scan that stopped on connection loss: `facts.stopped` says which. `connection-changed`
 * is a scan the reader abandoned because the active connection changed under it (D-14): its facts are never
 * shown, and the state lasts until the new identity is adopted or another site is chosen.
 */
export type ScanState =
  | { status: 'none' }
  | { status: 'scanning'; site: SiteRef; progress: ScanProgress | null }
  | { status: 'failed'; site: SiteRef }
  | { status: 'connection-changed'; site: SiteRef }
  | { status: 'done'; site: SiteRef; facts: SiteFacts };

/** Source state only. Evaluated results and counts are derived from `facts` and `marks` during render. */
export type InspectorSnapshot = {
  /** Identity key of the connection this state belongs to: undefined before any, null for a confirmed disconnect. */
  ownerKey: string | null | undefined;
  /** The latest confirmed connection, for display and for new scans. A rename updates it and nothing else. */
  connection: Connection | null;
  sites: SiteListState;
  scan: ScanState;
  fileId: string | null;
  marks: ReadonlySet<ReviewKey>;
  /** Changes whenever what a report would capture is replaced: a scan starts, results are discarded or a mark changes. */
  generation: number;
};

export type InspectorActions = {
  selectSite: (site: SiteRef) => void;
  rescan: () => void;
  retrySites: () => void;
  selectFile: (fileId: string) => void;
  setReviewed: (key: ReviewKey, reviewed: boolean) => void;
};

/** What the title bar and the page read: the snapshot, the results derived from it, and the actions. */
export type InspectorSession = Omit<InspectorSnapshot, 'ownerKey'> &
  InspectorActions & {
    selectedSite: SiteRef | null;
    result: SiteResult | null;
  };
