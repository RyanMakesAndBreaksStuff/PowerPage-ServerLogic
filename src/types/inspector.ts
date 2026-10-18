import type { Connection } from '@/services/pptb/host.types';
import type { AccessType, Privilege } from '@/types/recipe';

export type Readable<T> =
  { ok: true; value: T } | { ok: false; reason: 'read-failed' | 'not-scanned' };
export type WebRoleFact = { id: string; name: string; anonymous: boolean; authenticated: boolean };
export type TablePermissionFact = {
  id: string;
  name: string;
  table: string;
  scope: AccessType;
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
export type SettingValue =
  | { kind: 'absent' }
  | { kind: 'duplicate' }
  | { kind: 'value'; raw: string; fromEnvVar: boolean }
  | { kind: 'envvar-unreadable' }; // secret type, missing variable or failed read
export type ServerLogicFileFacts = {
  id: string;
  name: string;
  active: boolean;
  roleIds: Readable<readonly string[]>;
  code: Readable<string>;
};
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
  files: readonly ServerLogicFileFacts[];
  inventoryComplete: boolean;
  stopped: 'connection-lost' | null;
};
export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
export type Reason = { text: string; readFailure: boolean };
export type Finding = {
  check: CheckId;
  status: CheckStatus;
  summary: string;
  reasons: readonly Reason[];
  guidance: string;
  questions: readonly string[];
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
