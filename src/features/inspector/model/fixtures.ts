import type {
  Readable,
  ServerLogicFileFacts,
  SettingName,
  SettingValue,
  SiteFacts,
  TablePermissionFact,
  WebRoleFact,
} from '@/types/inspector';

export const read = <T>(value: T): Readable<T> => ({ ok: true, value });
export const value = (raw: string, fromEnvVar = false): SettingValue => ({
  kind: 'value',
  raw,
  fromEnvVar,
});

export const role = (id: string, patch: Partial<WebRoleFact> = {}): WebRoleFact => ({
  id,
  name: id,
  anonymous: false,
  authenticated: false,
  ...patch,
});

export const permission = (
  id: string,
  patch: Partial<TablePermissionFact> = {},
): TablePermissionFact => ({
  id,
  name: id,
  table: 'contact',
  scope: 'Contact',
  privileges: ['Read'],
  roleIds: ['staff'],
  active: true,
  parentId: null,
  ...patch,
});

export const file = (patch: Partial<ServerLogicFileFacts> = {}): ServerLogicFileFacts => ({
  id: 'file-1',
  name: 'customer-summary',
  active: true,
  roleIds: read(['staff']),
  code: read('function get() { return "{}"; }'),
  ...patch,
});

export function settings(
  patch: Partial<Record<SettingName, SettingValue>> = {},
): Readonly<Record<SettingName, SettingValue>> {
  return {
    'ServerLogic/Enabled': { kind: 'absent' },
    'ServerLogic/AllowedDomains': { kind: 'absent' },
    'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
    'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
    ...patch,
  };
}

export const siteFacts = (patch: Partial<SiteFacts> = {}): SiteFacts => ({
  scanId: 'connection-1:site-1:1',
  site: { id: 'site-1', name: 'Development site', domain: 'dev.example.com', active: true },
  connection: {
    id: 'connection-1',
    name: 'Development',
    url: 'https://example.crm.dynamics.com',
    environment: 'Dev',
  },
  startedAt: '2026-10-22T12:00:00.000Z',
  finishedAt: '2026-10-22T12:00:01.000Z',
  roles: read([role('staff')]),
  permissions: read([]),
  settings: read(settings()),
  inactiveSettings: [],
  files: [file()],
  inventoryComplete: true,
  unreadableRows: [],
  stopped: null,
  ...patch,
});
