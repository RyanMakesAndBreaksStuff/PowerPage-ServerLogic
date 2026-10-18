export type ReportScope = 'file' | 'site';
export type ReportFormat = 'markdown' | 'pdf';
export type ReportOptions = {
  scope: ReportScope;
  format: ReportFormat;
  fileId: string | null;
  questions: boolean;
  snapshot: boolean;
  redact: boolean;
};
