import type { Connection } from '@/services/pptb/host.types';
import type { ReviewKey, ScanProgress, SiteFacts, SiteRef, SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

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
  exportJob: ExportJob | null;
  /** Counts the times an open dialog was closed because its results were cleared; the page moves focus to the heading on each change (E-10). */
  exportStaleCloses: number;
};

export type ExportPhase = 'idle' | 'building' | 'saving';

/** One export, captured when the dialog opens (P5.7, E-01 C). The dialog is a view of it. */
export type ExportJob = {
  /** Deep-frozen structured clone of `evaluateSite(facts, marks)` at open. */
  readonly result: SiteResult;
  /** Null when the selected file id is not in `result.files`. */
  readonly selectedFileId: string | null;
  /** `snapshot.generation` at open (E-02). */
  readonly generation: number;
  /** `fileId` mirrors `selectedFileId`. */
  readonly options: ReportOptions;
  readonly phase: ExportPhase;
  /** False once the user closed the dialog or the results were cleared; the job may still be saving (E-07 B). */
  readonly open: boolean;
};

export type InspectorActions = {
  selectSite: (site: SiteRef) => void;
  rescan: () => void;
  retrySites: () => void;
  selectFile: (fileId: string) => void;
  setReviewed: (key: ReviewKey, reviewed: boolean) => void;
  /** Opens a job for a finished scan with files when none exists; options start from the AC-9.1 defaults (E-09). */
  openExport: () => void;
  /** Idle jobs only; `scope: 'file'` is ignored without a selected file. */
  setExportOptions: (patch: Partial<Omit<ReportOptions, 'fileId'>>) => void;
  /** Idle: removes the job. Building or saving: hides the dialog and lets the job finish (E-07 B). */
  closeExport: () => void;
  /** Builds the report from the captured state and hands it to the host's save dialog. Idle and open jobs only. */
  submitExport: () => void;
};

/** What the title bar and the page read: the snapshot, the results derived from it, and the actions. */
export type InspectorSession = Omit<InspectorSnapshot, 'ownerKey'> &
  InspectorActions & {
    selectedSite: SiteRef | null;
    result: SiteResult | null;
  };
