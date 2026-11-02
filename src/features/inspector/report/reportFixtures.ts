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

// 400 characters with no space, so a PDF cell must break inside the word.
export const LONG_FILE_NAME = `${'long-segment-'.repeat(31).slice(0, 397)}.js`;
// 3,000 characters of ordinary words: taller than a PDF page once wrapped into a narrow cell.
export const LONG_REASON = 'Global Read on account via Members. '.repeat(84).slice(0, 3000);

const LONG_CYCLE = [
  ['configured', 'configured', 'configured'],
  ['configured', 'needs-review', 'configured'],
  ['reviewed', 'configured', 'configured'],
  ['not-scanned', 'not-scanned', 'not-scanned'],
] as const;

/** Sixty files: fifty-nine ordinary ones and `long-text`: a 400-character name and a 3,000-character Reviewed table-permissions reason and Needs-review outbound reason. */
export function longReportResult(): SiteResult {
  const result = reportResult();
  const files = Array.from({ length: 59 }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    return reportFile(`file-${id}`, `handler-${id}`, LONG_CYCLE.at(index % 4) ?? LONG_CYCLE[0]);
  });
  const long = reportFile('long-text', LONG_FILE_NAME, ['configured', 'reviewed', 'configured']);
  return {
    ...result,
    files: [
      ...files,
      {
        ...long,
        findings: [
          long.findings[0],
          {
            ...reportFinding('tablePermissions', 'reviewed'),
            summary: LONG_REASON,
            reasons: [{ text: LONG_REASON, readFailure: false }],
          },
          {
            ...reportFinding('outbound', 'needs-review'),
            summary: LONG_REASON,
            reasons: [{ text: LONG_REASON, readFailure: false }],
          },
        ],
      },
    ],
  };
}

export const REPORT_FIXTURE_CASES: readonly {
  readonly name: string;
  readonly result: () => SiteResult;
  readonly fileId: string;
}[] = [
  { name: 'standard', result: reportResult, fileId: 'customer' },
  { name: 'long', result: longReportResult, fileId: 'long-text' },
  { name: 'hostile', result: hostileReportResult, fileId: 'hostile' },
];
