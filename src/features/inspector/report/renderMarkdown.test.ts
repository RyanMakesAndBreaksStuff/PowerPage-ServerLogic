// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import { escapeInline } from './markdownEscape';
import { EXPORTED_AT, REPORT_OPTIONS, hostileReportResult, reportResult } from './reportFixtures';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it.each(['file', 'site'] as const)('matches the complete %s golden', (scope) => {
    const offset = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
    try {
      const result = reportResult();
      result.banners = ['Server logic is disabled on this site (ServerLogic/Enabled = false)'];
      const model = buildReportModel(result, { ...REPORT_OPTIONS, scope }, EXPORTED_AT);
      const golden = readFileSync(new URL(`./__golden__/${scope}.md`, import.meta.url), 'utf8');
      expect(renderMarkdown(model)).toBe(golden);
    } finally {
      offset.mockRestore();
    }
  });

  it('escapes hostile names in headings, lines, blockquotes, lists and table cells', () => {
    const result = hostileReportResult();
    const model = buildReportModel(result, { ...REPORT_OPTIONS, fileId: 'hostile' }, EXPORTED_AT);
    const report = renderMarkdown(model);
    expect(report).toContain(`## ${escapeInline(model.title)}`);
    expect(report).toContain('file \\| \\* \\<script\\> \\[x\\](y) \\#name.js');
    expect(report).toContain('role \\| \\* \\<script\\> \\[x\\](y) \\#name');
    expect(report).not.toContain('<script>');
    expect(report).not.toContain('[x](y)');
    expect(report).not.toContain('\n#name');
    for (const line of report.split('\n').filter((value) => value.startsWith('| '))) {
      expect(line.match(/(?<!\\)\|/g)).toHaveLength(4);
    }
  });

  it('leaves questions and snapshots out, but keeps reviewed reasons and provenance', () => {
    const model = buildReportModel(
      reportResult(),
      { ...REPORT_OPTIONS, fileId: 'reviewed', questions: false, snapshot: false },
      EXPORTED_AT,
    );
    const report = renderMarkdown(model);
    expect(report).not.toContain('- [ ]');
    expect(report).not.toContain('Configuration snapshot');
    expect(report).toContain(
      '| Table permissions | Reviewed | Global Read on account via Members. |',
    );
    expect(report).toContain(
      'Read as separate queries during this interval, not as one atomic snapshot.',
    );
    expect(report).toContain('Configuration review only. Tenant outbound policy not verified.');
  });

  it('exports stopped notices and the not-scanned list for both scopes', () => {
    const result = reportResult();
    result.facts.stopped = 'connection-lost';
    result.banners = ['Connection lost. Reconnect and rescan.'];
    for (const scope of ['file', 'site'] as const) {
      const model = buildReportModel(
        result,
        { ...REPORT_OPTIONS, scope, fileId: 'pending' },
        EXPORTED_AT,
      );
      const report = renderMarkdown(model);
      expect(report).toContain('> Connection lost. Reconnect and rescan.');
      expect(report).toContain('### Not scanned');
      expect(report).toContain('Not read before the connection was lost');
    }
  });
});
