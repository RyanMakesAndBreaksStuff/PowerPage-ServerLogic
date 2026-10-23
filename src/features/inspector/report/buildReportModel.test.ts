import { describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import { EXPORTED_AT, REPORT_OPTIONS, reportFile, reportResult } from './reportFixtures';
import { reportFileName, reportFileNameBeforeBuild } from './reportFileName';

describe('buildReportModel', () => {
  it('retains the stored file name and creates the sanitised filename with its format', () => {
    const model = buildReportModel(reportResult(), REPORT_OPTIONS, EXPORTED_AT);
    expect(model.title).toBe('Server logic readiness: customer-summary.js');
    expect(model.stem).toBe('customer-summary');
    expect(reportFileName(model)).toBe('customer-summary-readiness.md');
    expect(reportFileNameBeforeBuild(reportResult(), REPORT_OPTIONS)).toBe(reportFileName(model));
    expect(reportFileName({ ...model, format: 'pdf' })).toBe('customer-summary-readiness.pdf');
    expect(model.counts).toEqual({ C: 2, V: 0, M: 1, U: 0, T: 3, K: 2 });
    expect(model.rows).toHaveLength(1);
  });

  it('orders site rows by name and sections by check, then name', () => {
    const result = reportResult();
    result.files = [
      reportFile('z', 'Z', ['needs-review', 'needs-review', 'configured']),
      reportFile('a', 'A', ['needs-review', 'configured', 'needs-review']),
    ];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT);
    expect(model.rows.map((row) => row.name)).toEqual(['A', 'Z']);
    expect(model.reviewFirst.map((section) => [section.check, section.fileName])).toEqual([
      ['webRole', 'A'],
      ['webRole', 'Z'],
      ['tablePermissions', 'Z'],
      ['outbound', 'A'],
    ]);
    expect(model.counts).toEqual({ C: 2, V: 0, M: 4, U: 0, T: 6, K: 2 });
  });

  it('keeps reviewed original reasons even when both includes are off', () => {
    const model = buildReportModel(
      reportResult(),
      { ...REPORT_OPTIONS, fileId: 'reviewed', questions: false, snapshot: false },
      EXPORTED_AT,
    );
    expect(model.rows[0]?.checks[1]).toMatchObject({
      status: 'reviewed',
      statusText: 'Reviewed',
      finding: 'Global Read on account via Members.',
      reasons: ['Global Read on account via Members.'],
      questions: [],
    });
    expect(model.snapshot).toBeNull();
    expect(model.counts).toEqual({ C: 2, V: 1, M: 0, U: 0, T: 3, K: 3 });
  });

  it('redacts names and URLs across banners, detail, snapshot and site filename', () => {
    const result = reportResult();
    const identifiers = [
      result.facts.connection.name,
      result.facts.connection.url,
      result.facts.site.name,
      result.facts.site.domain,
    ];
    const text = identifiers.join(' / ');
    const file = reportFile('customer', 'customer-summary.js', [
      'configured',
      'needs-review',
      'configured',
    ]);
    result.files = [
      {
        ...file,
        findings: [
          file.findings[0],
          {
            ...file.findings[1],
            summary: text,
            reasons: [{ text, readFailure: false }],
            guidance: text,
            questions: [text],
            detail: [text],
          },
          file.findings[2],
        ],
        snapshot: { roles: [text], tables: [text], outbound: [text] },
      },
    ];
    result.banners = [text];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    const serialised = JSON.stringify(model);
    for (const identifier of identifiers) expect(serialised).not.toContain(identifier);
    expect(serialised).toContain('[environment]');
    expect(serialised).toContain('[site]');
    expect(serialised).toContain('customer-summary.js');
    expect(reportFileName(model)).toBe('site-site-readiness.md');
    expect(
      reportFileNameBeforeBuild(result, { ...REPORT_OPTIONS, scope: 'site', redact: true }),
    ).toBe(reportFileName(model));
    expect(result.banners).toEqual([text]);
  });

  it('keeps stopped and inventory-incomplete notices plus all not-scanned checks', () => {
    const result = reportResult();
    result.facts.stopped = 'connection-lost';
    result.facts.inventoryComplete = false;
    result.banners = [
      'Connection lost. Reconnect and rescan.',
      'Inventory incomplete. Some server logic files may be missing.',
    ];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT);
    expect(model.banners).toContain('Connection lost. Reconnect and rescan.');
    expect(model.banners).toContain(
      'Inventory incomplete. Some server logic files may be missing.',
    );
    expect(model.notScanned.map((section) => section.check)).toEqual([
      'webRole',
      'tablePermissions',
      'outbound',
    ]);
    expect(model.fileCounts).toEqual({ ready: 1, needsReview: 1, incomplete: 1 });
    expect(model.counts).toEqual({ C: 4, V: 1, M: 1, U: 3, T: 9, K: 5 });
  });

  it.each([
    ['  name | * <script>.js', 'name-script'],
    ['report.JS', 'report'],
    ['!!!', 'site'],
    ['a___b...c', 'a___b...c'],
  ])('sanitises %s after trimming a trailing .js', (name, stem) => {
    const result = reportResult();
    result.files = [reportFile('customer', name, ['configured', 'configured', 'configured'])];
    expect(buildReportModel(result, REPORT_OPTIONS, EXPORTED_AT).stem).toBe(stem);
  });

  it('uses Date offset without mutating the worker timezone', () => {
    const timezone = process.env.TZ;
    const spy = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330);
    try {
      const model = buildReportModel(reportResult(), REPORT_OPTIONS, EXPORTED_AT);
      expect(model.lines.find((line) => line.label === 'Scanned')?.text).toBe(
        '2026-10-22 16:30:00 – 2026-10-22 16:30:30 (UTC+05:30)',
      );
      expect(model.header.exportedAt).toBe('2026-10-22 16:32:00 (UTC+05:30)');
      expect(process.env.TZ).toBe(timezone);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects a missing selected file rather than exporting a different file', () => {
    expect(() =>
      buildReportModel(reportResult(), { ...REPORT_OPTIONS, fileId: 'missing' }, EXPORTED_AT),
    ).toThrow('Select a file first');
  });
});
