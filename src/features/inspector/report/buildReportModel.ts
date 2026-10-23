import { CHECK_COPY } from '@/features/inspector/model/copy';
import { countChecks, filePill, fileSummary } from '@/features/inspector/model/rules';
import type { ReportCheck, ReportModel, ReportRow, ReportSection } from './reportModel.types';
import type { CheckId, CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';
import { reportIdentity } from './reportFileName';

const CHECK_ORDER: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];
const STATUS_TEXT: Readonly<Record<CheckStatus, string>> = {
  configured: 'Configured',
  'needs-review': 'Needs review',
  reviewed: 'Reviewed',
  'not-scanned': 'Not scanned',
};
const NOT_ATOMIC = 'Read as separate queries during this interval, not as one atomic snapshot.';

function stamp(date: Date, offset = date.getTimezoneOffset()): string {
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

function utcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const magnitude = Math.abs(minutes);
  return `UTC${minutes < 0 ? '-' : '+'}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`;
}

function redactor(result: SiteResult, enabled: boolean): (text: string) => string {
  if (!enabled) return (text) => text;
  const { connection, site } = result.facts;
  const replacements = [
    { value: connection.name, replacement: '[environment]' },
    { value: connection.url, replacement: '[environment]' },
    { value: site.name, replacement: '[site]' },
    { value: site.domain, replacement: '[site]' },
  ]
    .filter(({ value }) => value.length > 0)
    .sort((a, b) => b.value.length - a.value.length);
  // Replace in one pass so a shorter identifier never alters an already-redacted placeholder.
  return (text) => {
    let output = '';
    for (let index = 0; index < text.length;) {
      const match = replacements.find(({ value }) => text.startsWith(value, index));
      if (match === undefined) {
        output += text.slice(index, index + 1);
        index++;
      } else {
        output += match.replacement;
        index += match.value.length;
      }
    }
    return output;
  };
}

function checkModel(
  finding: Finding,
  questions: boolean,
  redact: (text: string) => string,
): ReportCheck {
  const reasons = finding.reasons.map((reason) => redact(reason.text));
  return {
    check: finding.check,
    title: CHECK_COPY[finding.check].category,
    status: finding.status,
    statusText: STATUS_TEXT[finding.status],
    finding: reasons.length === 0 ? redact(finding.summary) : reasons.join('; '),
    reasons,
    guidance: redact(finding.guidance),
    questions: questions ? finding.questions.map(redact) : [],
    detail: finding.detail.map(redact),
  };
}

function rowModel(
  file: FileResult,
  options: ReportOptions,
  redact: (text: string) => string,
): ReportRow {
  return {
    fileId: file.fileId,
    name: file.name,
    active: file.active,
    counts: countChecks(file.findings),
    summary: fileSummary(file),
    result: filePill(file),
    checks: CHECK_ORDER.flatMap((check) =>
      file.findings
        .filter((finding) => finding.check === check)
        .map((finding) => checkModel(finding, options.questions, redact)),
    ),
  };
}

function sections(rows: readonly ReportRow[], status: CheckStatus): readonly ReportSection[] {
  return CHECK_ORDER.flatMap((check) =>
    rows.flatMap((row) =>
      row.checks
        .filter((finding) => finding.check === check && finding.status === status)
        .map((finding) => ({
          fileName: row.name,
          check,
          title: finding.title,
          summary: finding.finding,
          reasons: finding.reasons,
          guidance: finding.guidance,
          questions: finding.questions,
          detail: finding.detail,
        })),
    ),
  );
}

export function buildReportModel(
  result: SiteResult,
  options: ReportOptions,
  exportedAt: Date,
): ReportModel {
  const files = result.files
    .filter((file) => options.scope === 'site' || file.fileId === options.fileId)
    .toSorted(
      (a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
        a.name.localeCompare(b.name, 'en') ||
        a.fileId.localeCompare(b.fileId, 'en'),
    );
  const selected = files[0];
  if (options.scope === 'file' && selected === undefined) throw new Error('Select a file first');
  const redact = redactor(result, options.redact);
  const rows = files.map((file) => rowModel(file, options, redact));
  const counts = countChecks(files.flatMap((file) => file.findings));
  const fileCounts = {
    ready: rows.filter((row) => row.result === 'Ready').length,
    needsReview: rows.filter((row) => row.result === 'Needs review').length,
    incomplete: rows.filter((row) => row.result === 'Incomplete').length,
  };
  const startedAt = new Date(result.facts.startedAt);
  const endedAt = new Date(result.facts.finishedAt ?? exportedAt.toISOString());
  const offset = endedAt.getTimezoneOffset();
  const scanned = `${stamp(startedAt, offset)} – ${stamp(endedAt, offset)} (${utcOffset(endedAt)})`;
  const exported = `${stamp(exportedAt)} (${utcOffset(exportedAt)})`;
  const siteName = options.redact ? '[site]' : result.facts.site.name;
  const environmentName = options.redact ? '[environment]' : result.facts.connection.name;
  const summary = `${String(counts.K)}/${String(counts.T)} checks addressed (${String(counts.C)} configured, ${String(counts.V)} reviewed)`;
  const review = sections(rows, 'needs-review');
  return {
    ...reportIdentity(result, options),
    header: {
      brand: 'Logic Inspector',
      label: `${options.scope === 'site' ? 'Site' : 'File'} readiness report · ${stamp(exportedAt).slice(0, 10)}`,
      exportedAt: exported,
    },
    lines: [
      {
        label: 'Environment',
        text: `${environmentName} · ${result.facts.connection.environment} / ${siteName}`,
      },
      { label: 'Scanned', text: scanned },
      { label: '', text: NOT_ATOMIC },
      {
        label: 'Result',
        text:
          options.scope === 'file' && selected !== undefined
            ? `${filePill(selected)} · ${fileSummary(selected)}`
            : summary,
      },
    ],
    counts,
    fileCounts,
    headline: `${String(files.length)} server logic ${files.length === 1 ? 'file' : 'files'}, ${String(counts.M)} ${counts.M === 1 ? 'finding' : 'findings'} to review`,
    banners: result.banners.map(redact),
    rows,
    needsReview: options.scope === 'file' ? review : [],
    reviewFirst: options.scope === 'site' ? review : [],
    notScanned: sections(rows, 'not-scanned'),
    snapshot: options.snapshot
      ? files.map((file) => ({
          fileName: file.name,
          roles: file.snapshot.roles.map(redact),
          tables: file.snapshot.tables.map(redact),
          outbound: file.snapshot.outbound.map(redact),
        }))
      : null,
    footer:
      options.scope === 'file'
        ? ['Configuration review only. Tenant outbound policy not verified.']
        : [
            `Configuration review only. Confirm effective access with a real site user. Exported ${exported}.`,
            'Tenant outbound policy not verified.',
          ],
  };
}
