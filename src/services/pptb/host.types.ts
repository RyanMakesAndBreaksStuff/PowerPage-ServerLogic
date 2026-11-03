export type ThemeName = 'light' | 'dark';
export type NoticeType = 'success' | 'info' | 'warning' | 'error';
export type Notice = { title: string; body: string; type: NoticeType };
export type EnvironmentLabel = 'Dev' | 'Test' | 'UAT' | 'Production' | 'Unknown';
export type Connection = { id: string; name: string; url: string; environment: EnvironmentLabel };
export type HostEvent =
  { kind: 'connection-changed' } | { kind: 'settings-updated' } | { kind: 'other'; name: string };
export type FileFilter = { name: string; extensions: readonly string[] };
export type SaveResult = { status: 'saved'; path: string } | { status: 'cancelled' };
export type ODataQuery = {
  entitySet: string;
  select: readonly string[];
  filter: string | null;
  orderBy: string | null;
  pageSize: number;
};
export class HostReadError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** True only for a platform-confirmed network exception (DOMException 'NetworkError'); never inferred from a null status. */
    readonly transport = false,
    /** Rows received before a later page failed; still need domain validation. */
    readonly partialRows: readonly unknown[] = [],
  ) {
    super(message);
    this.name = 'HostReadError';
  }
}
/** Explicit file-column target. Inspector uses `powerpagecomponent` / `powerpagecomponentid` / `filecontent`. */
export type FileColumnRef = {
  entityLogicalName: string;
  primaryIdAttribute: string;
  recordId: string;
  fileAttributeName: string;
};
export type PptbHost = {
  getTheme(): Promise<ThemeName>; // rejects when the host call fails; the caller picks the fallback (AC-1.6)
  notify(n: Notice): Promise<void>; // rejects when host notify is missing/throws/rejects
  copyText(text: string): Promise<void>;
  saveFile(
    defaultName: string,
    content: string | Uint8Array,
    filters: readonly FileFilter[],
  ): Promise<SaveResult>;
  openExternal(url: string): Promise<void>;
  /** Asks the host to warn before this tool instance closes (PPTB 1.2.6). Rejects as every other host call does. */
  preventClose(): Promise<void>;
  releasePreventClose(): Promise<void>;
  getActiveConnection(): Promise<Connection | null>;
  onEvent(handler: (e: HostEvent) => void): () => void;
  /** All pages; 429/5xx retried 1s/2s/4s; HostReadError keeps partialRows; DOMException 'AbortError' when `signal` aborts. */
  queryAll(q: ODataQuery, signal?: AbortSignal): Promise<readonly unknown[]>;
  /** InitializeFileBlocksDownload + DownloadBlock, decoded as UTF-8 after assembly; same retry/abort rules. */
  downloadFileColumn(ref: FileColumnRef, signal?: AbortSignal): Promise<string>;
};
