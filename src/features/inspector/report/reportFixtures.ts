import type { CheckId, CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

export const REPORT_OPTIONS: ReportOptions = {
  scope: 'file',
  format: 'markdown',
  fileId: 'customer',
  questions: true,
  snapshot: true,
  redact: false,
};
export const EXPORTED_AT = new Date('2026-10-22T11:02:00Z');

export function reportFinding(check: CheckId, status: CheckStatus): Finding {
  const text = {
    webRole: 'Members can call this handler.',
    tablePermissions: 'Global Read on account via Members.',
    outbound: 'No HttpClient calls in code.',
  }[check];
  return {
    check,
    status,
    hasUnscannedEvidence: status === 'not-scanned',
    summary: status === 'not-scanned' ? 'Not read before the connection was lost' : text,
    reasons:
      status === 'needs-review' || status === 'reviewed' ? [{ text, readFailure: false }] : [],
    guidance: `Review ${check} configuration.`,
    questions: [`Is ${check} configured for the intended users?`],
    detail: [`${check} detail.`],
  };
}

export function reportFile(
  fileId: string,
  name: string,
  states: readonly [CheckStatus, CheckStatus, CheckStatus],
): FileResult {
  return {
    fileId,
    name,
    active: true,
    findings: [
      reportFinding('webRole', states[0]),
      reportFinding('tablePermissions', states[1]),
      reportFinding('outbound', states[2]),
    ],
    snapshot: {
      roles: ['Members'],
      tables: ['account / Global / Read / Members'],
      outbound: ['ServerLogic/AllowedDomains = api.example.com'],
    },
  };
}

export function reportResult(): SiteResult {
  const files = [
    reportFile('customer', 'customer-summary.js', ['configured', 'needs-review', 'configured']),
    reportFile('reviewed', 'a-reviewed', ['configured', 'reviewed', 'configured']),
    reportFile('pending', 'z-pending', ['not-scanned', 'not-scanned', 'not-scanned']),
  ];
  return {
    facts: {
      scanId: 'scan-1',
      site: {
        id: 'site-1',
        name: 'Customer portal',
        domain: 'https://customer.powerappsportals.com',
        active: true,
      },
      connection: {
        id: 'connection-1',
        name: 'Contoso',
        url: 'https://contoso.crm.dynamics.com',
        environment: 'Dev',
      },
      startedAt: '2026-10-22T11:00:00Z',
      finishedAt: '2026-10-22T11:00:30Z',
      roles: { ok: true, value: [] },
      permissions: { ok: true, value: [] },
      settings: {
        ok: true,
        value: {
          'ServerLogic/Enabled': { kind: 'value', raw: 'true', fromEnvVar: false },
          'ServerLogic/AllowedDomains': { kind: 'absent' },
          'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
          'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
        },
      },
      inactiveSettings: [],
      files: [],
      inventoryComplete: true,
      stopped: null,
    },
    files,
    banners: [],
  };
}

export function hostileReportResult(): SiteResult {
  const result = reportResult();
  const hostile = '| * <script> [x](y)\n#name';
  const file = reportFile('hostile', `file ${hostile}.js`, [
    'configured',
    'needs-review',
    'configured',
  ]);
  return {
    ...result,
    facts: {
      ...result.facts,
      site: { ...result.facts.site, name: `site ${hostile}` },
      connection: { ...result.facts.connection, name: `environment ${hostile}` },
    },
    files: [{ ...file, snapshot: { ...file.snapshot, roles: [`role ${hostile}`] } }],
    banners: [`Site banner ${hostile}`],
  };
}
