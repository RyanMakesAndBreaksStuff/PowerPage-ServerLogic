// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import { escapeInline } from './markdownEscape';
import {
  EXPORTED_AT,
  REPORT_OPTIONS,
  hostileReportResult,
  reportFile,
  reportResult,
} from './reportFixtures';
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

  it.each(['file', 'site'] as const)(
    'exports a snapshot-only value only under the snapshot, and keeps the reasons (%s)',
    (scope) => {
      const sentinel = 'snapshot-only.example';
      const result = reportResult();
      const file = reportFile('customer', 'customer-summary.js', [
        'configured',
        'needs-review',
        'configured',
      ]);
      result.files = [
        {
          ...file,
          snapshot: { ...file.snapshot, outbound: [`ServerLogic/AllowedDomains = ${sentinel}`] },
        },
      ];
      const off = renderMarkdown(
        buildReportModel(result, { ...REPORT_OPTIONS, scope, snapshot: false }, EXPORTED_AT),
      );
      expect(off).not.toContain(sentinel);
      expect(off).not.toContain('Configuration snapshot');
      expect(off).toContain('Global Read on account via Members.');
      expect(off).toContain('Review tablePermissions configuration.');
      const on = renderMarkdown(
        buildReportModel(result, { ...REPORT_OPTIONS, scope, snapshot: true }, EXPORTED_AT),
      );
      expect(on.split(sentinel)).toHaveLength(2);
      expect(on.indexOf(sentinel)).toBeGreaterThan(on.indexOf('### Configuration snapshot'));
      expect(on).toContain('Global Read on account via Members.');
    },
  );

  it('labels an inactive file in the site table and lists, but not the H2 or snapshot heading', () => {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', [
      'configured',
      'needs-review',
      'not-scanned',
    ]);
    result.files = [{ ...inactive, active: false }];
    const file = renderMarkdown(
      buildReportModel(result, { ...REPORT_OPTIONS, fileId: 'old' }, EXPORTED_AT),
    );
    expect(file).toContain('## Server logic readiness: old-handler\n');
    expect(file).toContain('- Outbound networking: old-handler (Inactive) — ');
    const site = renderMarkdown(
      buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT),
    );
    expect(site).toContain('| old-handler (Inactive) |');
    expect(site).toContain('### Table permissions: old-handler (Inactive)');
    expect(site).toContain('Outbound networking: old-handler (Inactive) — ');
    expect(site).toContain('### Configuration snapshot: old-handler\n');
  });
});
