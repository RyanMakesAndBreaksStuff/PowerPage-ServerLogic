import type { Connection } from '@/services/pptb/host.types';
import type { AccessType, Privilege } from '@/types/recipe';

export type Readable<T> =
  { ok: true; value: T } | { ok: false; reason: 'read-failed' | 'not-scanned' };
export type WebRoleFact = { id: string; name: string; anonymous: boolean; authenticated: boolean };
export type TablePermissionFact = {
  id: string;
  name: string;
  table: string;
  scope: AccessType | null;
  privileges: readonly Privilege[];
  roleIds: readonly string[];
  active: boolean;
  parentId: string | null;
};
export type SettingName =
  | 'ServerLogic/Enabled'
  | 'ServerLogic/AllowedDomains'
  | 'ServerLogic/AllowNetworkingToAllDomains'
  | 'ServerLogic/TimeoutInSeconds';
/** Why an environment variable could not be read; each cause has its own finding text (FR-7). */
export type EnvVarCause = 'secret' | 'missing' | 'denied' | 'failed';
export type SettingValue =
  | { kind: 'absent' }
  | { kind: 'duplicate' }
  | { kind: 'value'; raw: string; fromEnvVar: boolean }
  | { kind: 'envvar-unreadable'; cause: EnvVarCause }
  | { kind: 'unparseable' } // active row whose content has no readable string value
  | { kind: 'not-scanned' }; // environment-variable read not started before interruption
export type ServerLogicFileFacts = {
  id: string;
  name: string;
  active: boolean;
  roleIds: Readable<readonly string[]>;
  code: Readable<string>;
};
/** A web role (11) or table permission (18) row the reader skipped because it could not be read. */
export type UnreadableRow = { type: 11 | 18; id: string; name: string };
export type SiteRef = { id: string; name: string; domain: string; active: boolean };
export type SiteFacts = {
  scanId: string;
  site: SiteRef;
  connection: Connection;
  startedAt: string;
  finishedAt: string | null;
  roles: Readable<readonly WebRoleFact[]>;
  permissions: Readable<readonly TablePermissionFact[]>;
  settings: Readable<Readonly<Record<SettingName, SettingValue>>>;
  inactiveSettings: readonly SettingName[];
  files: readonly ServerLogicFileFacts[];
  inventoryComplete: boolean;
  /** Role and permission rows skipped as unreadable; the site banner names them and findings are graded without them. */
  unreadableRows: readonly UnreadableRow[];
  stopped: 'connection-lost' | null;
};
/** `Scanned X of N`; `total` is only the discovered files while `inventoryComplete` is false. */
export type ScanProgress = { scanned: number; total: number; inventoryComplete: boolean };
export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
export type Reason = { text: string; readFailure: boolean };
export type Finding = {
  check: CheckId;
  status: CheckStatus;
  /** True when evidence this check needs was not read before the scan was interrupted (FR-8 precedence table). */
  hasUnscannedEvidence: boolean;
  summary: string;
  reasons: readonly Reason[];
  guidance: string;
  questions: readonly string[];
  /** Explanation only (reasons, notes, limits). Raw configuration rows live in `FileResult.snapshot`. */
  detail: readonly string[];
};
export type Snapshot = {
  roles: readonly string[];
  tables: readonly string[];
  outbound: readonly string[];
};
export type FileResult = {
  fileId: string;
  name: string;
  active: boolean;
  findings: readonly [Finding, Finding, Finding];
  snapshot: Snapshot;
};
export type ReviewKey = `${string}:${CheckId}`; // `${fileId}:${check}`
export type Counts = { C: number; V: number; M: number; U: number; T: number; K: number };
export type SiteResult = {
  facts: SiteFacts;
  files: readonly FileResult[];
  banners: readonly string[];
};
