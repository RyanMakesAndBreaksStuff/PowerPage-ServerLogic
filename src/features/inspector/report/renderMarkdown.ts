import type { ReportCheck, ReportModel, ReportSection, ReportSnapshot } from './reportModel.types';
import { escapeCell, escapeInline } from './markdownEscape';

function tableRow(values: readonly string[]): string {
  return `| ${values.map(escapeCell).join(' | ')} |`;
}

function statusCell(check: ReportCheck): string {
  return check.status === 'reviewed' ? `${check.statusText}: ${check.finding}` : check.statusText;
}

function findingSection(section: ReportSection, siteScope: boolean): string[] {
  const title = siteScope ? `${section.title}: ${section.fileName}` : section.title;
  return [
    `### ${escapeInline(title)}`,
    '',
    escapeInline(section.summary),
    '',
    escapeInline(section.guidance),
    ...section.detail.map((detail) => `\n${escapeInline(detail)}`),
    ...(section.questions.length > 0
      ? ['', ...section.questions.map((question) => `- [ ] ${escapeInline(question)}`)]
      : []),
    '',
  ];
}

function snapshotSection(snapshot: ReportSnapshot, siteScope: boolean): string[] {
  const title = siteScope
    ? `Configuration snapshot: ${snapshot.fileName}`
    : 'Configuration snapshot';
  return [
    `### ${escapeInline(title)}`,
    '',
    '**Web roles**',
    '',
    ...snapshot.roles.map((role) => `- ${escapeInline(role)}`),
    '',
    '**Tables with privileges**',
    '',
    ...snapshot.tables.map((table) => `- ${escapeInline(table)}`),
    '',
    '**Outbound**',
    '',
    ...snapshot.outbound.map((outbound) => `- ${escapeInline(outbound)}`),
    '',
  ];
}

export function renderMarkdown(model: ReportModel): string {
  const lines = [`## ${escapeInline(model.title)}`, ''];
  if (model.scope === 'site') {
    lines.push(
      escapeInline(`${model.header.brand} · ${model.header.label}`),
      '',
      escapeInline(model.headline),
      '',
    );
  }
  for (const line of model.lines) {
    lines.push(
      line.label === ''
        ? escapeInline(line.text)
        : `**${escapeInline(line.label)}:** ${escapeInline(line.text)}`,
      '',
    );
  }
  if (model.scope === 'site') {
    lines.push(
      escapeInline(
        `Ready: ${String(model.fileCounts.ready)} · Needs review: ${String(model.fileCounts.needsReview)} · Incomplete: ${String(model.fileCounts.incomplete)} · Not verified: Tenant outbound policy`,
      ),
      '',
    );
  }
  for (const banner of model.banners) lines.push(`> ${escapeInline(banner)}`, '');
  if (model.scope === 'file') {
    lines.push(tableRow(['Check', 'Status', 'Finding']), '| --- | --- | --- |');
    for (const row of model.rows) {
      for (const check of row.checks)
        lines.push(tableRow([check.title, check.statusText, check.finding]));
    }
    lines.push('', ...model.needsReview.flatMap((section) => findingSection(section, false)));
  } else {
    lines.push(
      tableRow([
        'File',
        'Addressed',
        'Web role',
        'Table permissions',
        'Outbound networking',
        'Result',
      ]),
      '| --- | --- | --- | --- | --- | --- |',
    );
    for (const row of model.rows) {
      lines.push(tableRow([row.name, row.summary, ...row.checks.map(statusCell), row.result]));
    }
    lines.push('', '### Review first', '');
    lines.push(...model.reviewFirst.flatMap((section) => findingSection(section, true)));
  }
  if (model.notScanned.length > 0) {
    lines.push('### Not scanned', '');
    for (const section of model.notScanned) {
      lines.push(`- ${escapeInline(`${section.title}: ${section.fileName} — ${section.summary}`)}`);
    }
    lines.push('');
  }
  if (model.snapshot !== null) {
    lines.push(
      ...model.snapshot.flatMap((snapshot) => snapshotSection(snapshot, model.scope === 'site')),
    );
  }
  for (const footer of model.footer) lines.push(`> ${escapeInline(footer)}`, '');
  return `${lines.join('\n').trimEnd()}\n`;
}
