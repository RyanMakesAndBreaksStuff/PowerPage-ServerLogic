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
  ) {
    super(message);
    this.name = 'HostReadError';
  }
}
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
  getActiveConnection(): Promise<Connection | null>;
  onEvent(handler: (e: HostEvent) => void): () => void;
  queryAll(q: ODataQuery): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError
  downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
};
