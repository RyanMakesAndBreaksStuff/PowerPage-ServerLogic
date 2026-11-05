import { describe, expect, it, vi } from 'vitest';
import type { CheckStatus, SiteResult } from '@/types/inspector';
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
            detail: [text, `Note: ${text}`],
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
    expect(model.rows[0]?.checks[1]?.detail).toEqual([
      'Note: [environment] / [environment] / [site] / [site]',
    ]);
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

describe('snapshot ownership (WR-001)', () => {
  const sentinel = 'snapshot-only.example';

  function sentinelResult(): SiteResult {
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
    return result;
  }

  // The model keeps raw configuration rows only in FileResult.snapshot (P5.3), so this pins the boundary.
  it.each(['file', 'site'] as const)(
    'leaves a snapshot-only value out of the %s model when the snapshot is off, and keeps the reasons',
    (scope) => {
      const model = buildReportModel(
        sentinelResult(),
        { ...REPORT_OPTIONS, scope, snapshot: false },
        EXPORTED_AT,
      );
      expect(JSON.stringify(model)).not.toContain(sentinel);
      expect(model.snapshot).toBeNull();
      expect(model.rows[0]?.checks[1]?.reasons).toEqual(['Global Read on account via Members.']);
      const sections = scope === 'file' ? model.needsReview : model.reviewFirst;
      expect(sections[0]).toMatchObject({
        summary: 'Global Read on account via Members.',
        guidance: 'Review tablePermissions configuration.',
      });
    },
  );

  it.each(['file', 'site'] as const)(
    'carries it once, in the snapshot, in the %s model when the snapshot is on',
    (scope) => {
      const model = buildReportModel(
        sentinelResult(),
        { ...REPORT_OPTIONS, scope, snapshot: true },
        EXPORTED_AT,
      );
      expect(JSON.stringify(model).split(sentinel)).toHaveLength(2);
      expect(model.snapshot?.[0]?.outbound).toEqual([`ServerLogic/AllowedDomains = ${sentinel}`]);
    },
  );
});

describe('redaction aliases (WR-002)', () => {
  const unredacted =
    'Allowed dev.example.com, DEV.EXAMPLE.COM, https://dev.example.com/path, dev.example.com:8443 and x.dev.example.com, not other-dev.example.com, dev.example.com-sync or api.example.com.';
  const redacted =
    'Allowed [site], [site], [site]/path, [site]:8443 and x.[site], not other-dev.example.com, dev.example.com-sync or api.example.com.';

  // A bare domain is itself an original string, so it still redacts inside longer names.
  const redactedBare =
    'Allowed [site], [site], [site]/path, [site]:8443 and x.[site], not other-[site], [site]-sync or api.example.com.';

  function hostResult(domain: string): SiteResult {
    const result = reportResult();
    result.facts.site = { ...result.facts.site, domain };
    const file = reportFile('customer', 'dev.example.com.js', [
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
            summary: unredacted,
            reasons: [{ text: unredacted, readFailure: false }],
            guidance: unredacted,
            questions: [unredacted],
            detail: [unredacted, `Note: ${unredacted}`],
          },
          file.findings[2],
        ],
        snapshot: { roles: [unredacted], tables: [unredacted], outbound: [unredacted] },
      },
    ];
    result.banners = [unredacted];
    return result;
  }

  it.each(['file', 'site'] as const)(
    'redacts the hostname of a URL, bare or pathed site domain everywhere in the %s model',
    (scope) => {
      for (const domain of [
        'https://dev.example.com',
        'dev.example.com',
        'https://dev.example.com/portal',
      ]) {
        const model = buildReportModel(
          hostResult(domain),
          { ...REPORT_OPTIONS, scope, redact: true },
          EXPORTED_AT,
        );
        const expected = domain === 'dev.example.com' ? redactedBare : redacted;
        const section = (scope === 'file' ? model.needsReview : model.reviewFirst)[0];
        expect(model.rows[0]?.checks[1]).toMatchObject({
          finding: expected,
          reasons: [expected],
          guidance: expected,
          questions: [expected],
          detail: [`Note: ${expected}`],
        });
        expect(section).toMatchObject({
          summary: expected,
          guidance: expected,
          detail: [`Note: ${expected}`],
        });
        expect(model.banners).toEqual([expected]);
        expect(model.snapshot?.[0]).toMatchObject({
          roles: [expected],
          tables: [expected],
          outbound: [expected],
        });
      }
    },
  );

  it('keeps server logic file names, even when they contain the site host', () => {
    for (const scope of ['file', 'site'] as const) {
      const model = buildReportModel(
        hostResult('https://dev.example.com'),
        { ...REPORT_OPTIONS, scope, redact: true },
        EXPORTED_AT,
      );
      expect(model.rows[0]?.name).toBe('dev.example.com.js');
      expect(model.snapshot?.[0]?.fileName).toBe('dev.example.com.js');
      expect((scope === 'file' ? model.needsReview : model.reviewFirst)[0]?.fileName).toBe(
        'dev.example.com.js',
      );
    }
  });

  it('redacts the title and stem of a site report and leaves a file report title alone', () => {
    const site = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(site.title).toBe('Site readiness report: [site]');
    expect(site.stem).toBe('site');
    const file = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, redact: true },
      EXPORTED_AT,
    );
    expect(file.title).toBe('Server logic readiness: dev.example.com.js');
  });

  it('redacts the environment URL host and an alias with a port, ignoring case', () => {
    const result = hostResult('https://dev.example.com:8443/x');
    result.facts.connection = {
      ...result.facts.connection,
      url: 'https://contoso.crm.dynamics.com/main.aspx',
    };
    result.banners = [
      'dev.example.com:8443 dev.example.com contoso.crm.dynamics.com Contoso.CRM.dynamics.com',
    ];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual(['[site] [site] [environment] [environment]']);
  });

  it('keeps configured strings as exact substrings and bounds only the host aliases', () => {
    const result = reportResult();
    result.banners = [
      'Contoso-Prod ContosoCRM contoso other-contoso.crm.dynamics.com CONTOSO.crm.dynamics.com',
    ];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual([
      '[environment]-Prod [environment]CRM contoso other-contoso.crm.dynamics.com [environment]',
    ]);
  });

  it('skips an identifier that is not a URL and matches it exactly', () => {
    const result = reportResult();
    result.facts.site = { ...result.facts.site, name: 'Portal', domain: 'not a url' };
    result.banners = ['Portal portals my-portal not a url, Not A Url.'];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual(['[site] portals my-portal [site], Not A Url.']);
  });

  it('changes nothing when redaction is off', () => {
    const model = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, scope: 'site', redact: false },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual([unredacted]);
  });
});

describe('detail lines that repeat a reason (inspector-ui-and-report-001)', () => {
  function detailResult(detail: readonly string[], status: CheckStatus = 'needs-review'): SiteResult {
    const result = reportResult();
    const file = reportFile('customer', 'customer-summary.js', [
      'configured',
      status,
      'configured',
    ]);
    result.files = [
      {
        ...file,
        findings: [file.findings[0], { ...file.findings[1], detail: [...detail] }, file.findings[2]],
      },
    ];
    return result;
  }

  it.each(['file', 'site'] as const)(
    'drops a detail line equal to a reason and keeps the rest in the %s model',
    (scope) => {
      const model = buildReportModel(
        detailResult(['Global Read on account via Members.', 'extra note']),
        { ...REPORT_OPTIONS, scope },
        EXPORTED_AT,
      );
      const section = (scope === 'file' ? model.needsReview : model.reviewFirst)[0];
      expect(model.rows[0]?.checks[1]?.reasons).toEqual(['Global Read on account via Members.']);
      expect(model.rows[0]?.checks[1]?.detail).toEqual(['extra note']);
      expect(section?.detail).toEqual(['extra note']);
    },
  );

  it('drops the summary line of a check that has no reasons', () => {
    const summary = 'Not read before the connection was lost';
    const model = buildReportModel(
      detailResult([summary, 'extra note'], 'not-scanned'),
      REPORT_OPTIONS,
      EXPORTED_AT,
    );
    expect(model.rows[0]?.checks[1]).toMatchObject({ reasons: [], finding: summary });
    expect(model.rows[0]?.checks[1]?.detail).toEqual(['extra note']);
    expect(model.notScanned[0]?.detail).toEqual(['extra note']);
  });
});

describe('inactive files', () => {
  function inactiveResult(): SiteResult {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', [
      'configured',
      'needs-review',
      'not-scanned',
    ]);
    result.files = [
      { ...inactive, active: false },
      reportFile('live', 'live-handler', ['configured', 'configured', 'configured']),
    ];
    return result;
  }

  it('labels an inactive file in the site table and the Review first and Not scanned entries', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, scope: 'site' },
      EXPORTED_AT,
    );
    expect(model.rows.map((row) => row.name)).toEqual(['live-handler', 'old-handler (Inactive)']);
    expect(model.reviewFirst.map((section) => section.fileName)).toEqual([
      'old-handler (Inactive)',
    ]);
    expect(model.notScanned.map((section) => section.fileName)).toEqual(['old-handler (Inactive)']);
    expect(model.snapshot?.map((snapshot) => snapshot.fileName)).toEqual([
      'live-handler',
      'old-handler',
    ]);
  });

  it('keeps the stored name in the file report title, stem and file name', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, fileId: 'old' },
      EXPORTED_AT,
    );
    expect(model.title).toBe('Server logic readiness: old-handler');
    expect(model.stem).toBe('old-handler');
    expect(reportFileName(model)).toBe('old-handler-readiness.md');
    expect(reportFileNameBeforeBuild(inactiveResult(), { ...REPORT_OPTIONS, fileId: 'old' })).toBe(
      'old-handler-readiness.md',
    );
  });

  it('leaves active files unlabelled', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, fileId: 'live' },
      EXPORTED_AT,
    );
    expect(model.title).toBe('Server logic readiness: live-handler');
  });
});
