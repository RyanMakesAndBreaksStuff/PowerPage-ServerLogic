export type CheckSeverity = 'blocked' | 'may-be-rejected';
export type CheckHit = { pattern: string; line: number; severity: CheckSeverity };
export type BrowserCheckResult = { hits: readonly CheckHit[]; parseFailed: boolean };
export type ConnectorUse = { dataverse: boolean; httpClient: boolean; undetermined: boolean };
export type TextChange = { from: number; to: number; insert: string };
export type InsertResult =
  | { ok: true; changes: readonly TextChange[]; text: string }
  | { ok: false; reason: 'no-target' | 'not-statement' | 'breaks-code' };
