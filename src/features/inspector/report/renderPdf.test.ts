import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';
import { buildReportModel } from './buildReportModel';
import { createPdfDocument } from './pdfFonts';
import type { PdfFace } from './pdfFonts';
import {
  EXPORTED_AT,
  LONG_FILE_NAME,
  LONG_REASON,
  REPORT_FIXTURE_CASES,
  REPORT_OPTIONS,
  hostileReportResult,
  longReportResult,
  reportFile,
  reportResult,
} from './reportFixtures';
import { HERO_RING, drawReport, renderPdf } from './renderPdf';

const SCOPES = ['file', 'site'] as const;

function pdfOptions(scope: 'file' | 'site', fileId: string, patch: Partial<ReportOptions> = {}) {
  return { ...REPORT_OPTIONS, format: 'pdf', scope, fileId, ...patch } satisfies ReportOptions;
}

function draw(result: SiteResult, options: ReportOptions) {
  const model = buildReportModel(result, options, EXPORTED_AT);
  const doc = createPdfDocument();
  const writes: { text: string; face: PdfFace }[] = [];
  const table = drawReport(doc, model, (text, face) => {
    writes.push({ text, face });
  });
  return { model, doc, table, writes };
}

const squash = (text: string): string => text.replace(/\s+/g, '');
const latin1 = (bytes: Uint8Array): string => new TextDecoder('latin1').decode(bytes);

describe('renderPdf', () => {
  it.each(SCOPES)('returns real PDF bytes for the %s scope', (scope) => {
    const model = buildReportModel(reportResult(), pdfOptions(scope, 'customer'), EXPORTED_AT);
    const bytes = renderPdf(model);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(latin1(bytes.slice(0, 5))).toBe('%PDF-');
    expect(latin1(bytes.slice(-8))).toContain('%%EOF');
    expect(bytes.length).toBeGreaterThan(20_000);
    // RG-005, partly: text operators and a ToUnicode map per font make the text selectable; no raster.
    const pdf = latin1(bytes);
    expect(pdf).toContain(' Tj');
    expect(pdf.match(/\/ToUnicode/g)?.length).toBeGreaterThanOrEqual(1);
    expect(pdf).not.toContain('/Subtype /Image');
    expect(
      draw(reportResult(), pdfOptions(scope, 'customer')).doc.getNumberOfPages(),
    ).toBeGreaterThanOrEqual(1);
  });

  it('paginates the long fixture in both scopes without splitting a printed row', () => {
    for (const scope of SCOPES) {
      const { doc, table } = draw(longReportResult(), pdfOptions(scope, 'long-text'));
      expect(doc.getNumberOfPages()).toBeGreaterThan(1);
      expect(table.rows.length).toBe(table.physicalRows);
      expect(table.rows.filter((row) => row.spansMultiplePages)).toEqual([]);
      const pages = new Set(table.rows.map((row) => row.page));
      for (const page of pages) expect(table.headPages).toContain(page);
    }
  });

  it('repeats the site table head on every page and labels continuation rows', () => {
    const { table, writes } = draw(longReportResult(), pdfOptions('site', 'long-text'));
    expect(table.logicalRows).toBe(60);
    expect(table.physicalRows).toBeGreaterThan(60);
    expect(new Set(table.rows.map((row) => row.page)).size).toBeGreaterThan(1);
    expect(table.headPages).toEqual([...new Set(table.rows.map((row) => row.page))]);
    const labels = writes.filter((write) => write.text.includes('(continued '));
    expect(labels.map((write) => /\(continued \d\/\d\)$/.exec(write.text)?.[0])).toEqual([
      '(continued 2/3)',
      '(continued 3/3)',
    ]);
  });

  it('builds the 60-file site report far inside the 5 s build budget (AC-9.9)', () => {
    const model = buildReportModel(
      longReportResult(),
      pdfOptions('site', 'long-text'),
      EXPORTED_AT,
    );
    const started = performance.now();
    renderPdf(model);
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('writes the whole long reason and the whole long file name', () => {
    expect(LONG_FILE_NAME).toHaveLength(400);
    expect(LONG_REASON).toHaveLength(3000);
    const { writes } = draw(longReportResult(), pdfOptions('file', 'long-text'));
    const text = squash(writes.map((write) => write.text).join(''));
    expect(text).toContain(squash(LONG_REASON));
    // Reviewed table cell, Needs-review outbound cell and the outbound finding block.
    expect(text.split(squash(LONG_REASON)).length - 1).toBe(3);
    expect(text).toContain(LONG_FILE_NAME);
  });

  it('writes what the model holds for the standard fixture in both scopes', () => {
    for (const scope of SCOPES) {
      const result = reportResult();
      result.banners = ['Server logic is disabled on this site (ServerLogic/Enabled = false)'];
      const { model, writes } = draw(result, pdfOptions(scope, 'customer'));
      const text = writes.map((write) => write.text).join('\n');
      for (const line of [model.header.brand, model.header.label, ...model.footer]) {
        expect(text).toContain(line);
      }
      for (const banner of model.banners) expect(text).toContain(banner);
      for (const row of model.rows) {
        expect(text).toContain(row.name);
        for (const check of row.checks) expect(text).toContain(check.statusText);
        if (scope === 'site') expect(text).toContain(row.result);
      }
      for (const line of model.lines) expect(text).toContain(line.text);
    }
  });

  it('keeps Reviewed distinct and shows its original reason in both scopes', () => {
    const site = draw(reportResult(), pdfOptions('site', 'customer'));
    // The cell wraps in its column, so compare without whitespace.
    expect(squash(site.writes.map((write) => write.text).join(''))).toContain(
      squash('Reviewed: Global Read on account via Members.'),
    );
    const file = draw(reportResult(), pdfOptions('file', 'reviewed', { questions: false }));
    const texts = file.writes.map((write) => write.text);
    expect(texts).toContain('Reviewed');
    expect(texts).toContain('Global Read on account via Members.');
  });

  it('numbers every page of the long site report and leaves no placeholder', () => {
    const { doc, writes } = draw(longReportResult(), pdfOptions('site', 'long-text'));
    const total = doc.getNumberOfPages();
    expect(total).toBeGreaterThan(20);
    const numbers = writes.map((write) => write.text).filter((text) => text.startsWith('Page '));
    expect(numbers).toEqual(
      Array.from({ length: total }, (_, index) => `Page ${String(index + 1)} of ${String(total)}`),
    );
    expect(latin1(new Uint8Array(doc.output('arraybuffer')))).not.toContain('total_pages_count');
  });

  it('labels an inactive file in the site PDF only, not in the file report title', () => {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', ['configured', 'needs-review', 'configured']);
    result.files = [{ ...inactive, active: false }];
    const site = draw(result, pdfOptions('site', 'old'));
    expect(site.writes.map((write) => write.text)).toContain('old-handler (Inactive)');
    const file = draw(result, pdfOptions('file', 'old'));
    const texts = file.writes.map((write) => write.text);
    expect(texts).toContain('Server logic readiness: old-handler');
    expect(
      texts.some((text) => text.startsWith('Server logic readiness') && text.includes('Inactive')),
    ).toBe(false);
    expect(draw(result, pdfOptions('file', 'old')).model.stem).toBe('old-handler');
  });

  it('lists Review first and Not scanned in the model order', () => {
    const result = reportResult();
    result.files = [
      reportFile('z', 'Z', ['needs-review', 'needs-review', 'configured']),
      reportFile('a', 'A', ['needs-review', 'configured', 'needs-review']),
      reportFile('p', 'P', ['not-scanned', 'configured', 'not-scanned']),
    ];
    const { model, writes } = draw(result, pdfOptions('site', 'a'));
    const texts = writes.map((write) => write.text);
    const review = model.reviewFirst.map((section) => `${section.title}: ${section.fileName}`);
    const pending = model.notScanned.map(
      (section) => `${section.title}: ${section.fileName} — ${section.summary}`,
    );
    expect(review).toEqual([
      'Web role: A',
      'Web role: Z',
      'Table permissions: Z',
      'Outbound networking: A',
    ]);
    expect(pending).toHaveLength(2);
    for (const order of [review, pending]) {
      const positions = order.map((entry) => texts.indexOf(entry));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual(positions.toSorted((x, y) => x - y));
    }
    expect(texts.indexOf(review[0] ?? '')).toBeLessThan(texts.indexOf(pending[0] ?? ''));
  });

  it('fits the ring count and caption inside the ring hole (P5.6 C5 reader check)', () => {
    const hole = 2 * (HERO_RING.radius - HERO_RING.thickness) - 2 * HERO_RING.textPadding;
    for (const result of [reportResult, longReportResult]) {
      const model = buildReportModel(result(), pdfOptions('site', 'customer'), EXPORTED_AT);
      const doc = createPdfDocument();
      const fonts = vi.spyOn(doc, 'setFont');
      const sizes = vi.spyOn(doc, 'setFontSize');
      const text = vi.spyOn(doc, 'text');
      drawReport(doc, model);
      // The font state in force at a call is the last setFont/setFontSize issued before it.
      const before = <T extends unknown[]>(
        spy: { mock: { calls: T[]; invocationCallOrder: number[] } },
        order: number,
      ): T | undefined =>
        spy.mock.calls.filter((_, index) => (spy.mock.invocationCallOrder[index] ?? 0) < order).at(-1);
      const width = (index: number): number => {
        const order = text.mock.invocationCallOrder[index] ?? 0;
        const [family, style] = before(fonts, order) ?? [];
        const [size] = before(sizes, order) ?? [];
        const [value] = text.mock.calls[index] ?? [];
        if (typeof family !== 'string' || typeof size !== 'number' || typeof value !== 'string') {
          throw new Error('Missing font state for a ring label');
        }
        doc.setFont(family, style).setFontSize(size);
        return doc.getTextWidth(value);
      };
      const count = `${String(model.counts.K)}/${String(model.counts.T)}`;
      const labels = text.mock.calls.flatMap(([value], index) =>
        value === count || value === 'checks' || value === 'addressed' || value === 'checks addressed'
          ? [{ value, width: width(index) }]
          : [],
      );
      expect(labels.map((label) => label.value)).toEqual([count, 'checks', 'addressed']);
      for (const label of labels) expect(label.width).toBeLessThanOrEqual(hole);
    }
  });

  it('draws text as text and never rasterises, fetches or embeds an image', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const model = buildReportModel(
        hostileReportResult(),
        pdfOptions('file', 'hostile'),
        EXPORTED_AT,
      );
      const doc = createPdfDocument();
      const text = vi.spyOn(doc, 'text');
      const html = vi.spyOn(doc, 'html');
      const image = vi.spyOn(doc, 'addImage');
      drawReport(doc, model);
      expect(text.mock.calls.length).toBeGreaterThan(10);
      expect(text.mock.calls.some(([value]) => value === model.header.brand)).toBe(true);
      expect(html).not.toHaveBeenCalled();
      expect(image).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it('keeps the hostile fixture literal in both scopes', () => {
    for (const scope of SCOPES) {
      const { doc, writes } = draw(hostileReportResult(), pdfOptions(scope, 'hostile'));
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
      expect(writes.map((write) => write.text).join('\n')).toContain('| * <script> [x](y)');
    }
  });

  it('redacts the title metadata and every written string for a redacted site report', () => {
    const result = reportResult();
    const options = pdfOptions('site', 'customer', { redact: true });
    const { doc, writes } = draw(result, options);
    const bytes = latin1(new Uint8Array(doc.output('arraybuffer')));
    expect(bytes).toContain('/Title (Site readiness report: [site])');
    const text = writes.map((write) => write.text).join('\n');
    for (const identifier of [
      'Contoso',
      'Customer portal',
      'contoso.crm.dynamics.com',
      'customer.powerappsportals.com',
    ]) {
      expect(text).not.toContain(identifier);
      expect(bytes).not.toContain(identifier);
    }
    expect(text).toContain('[environment]');
    expect(text).toContain('[site]');
  });

  it('sets the file report title from the model and keeps the file name unredacted', () => {
    const { doc, model } = draw(reportResult(), pdfOptions('file', 'customer', { redact: true }));
    const bytes = latin1(new Uint8Array(doc.output('arraybuffer')));
    expect(model.title).toBe('Server logic readiness: customer-summary.js');
    expect(bytes).toContain('/Title (Server logic readiness: customer-summary.js)');
  });

  it.each(SCOPES)(
    'writes snapshot-only configuration only when the snapshot is on (%s)',
    (scope) => {
      const result = reportResult();
      const file = reportFile('customer', 'customer-summary.js', [
        'configured',
        'needs-review',
        'configured',
      ]);
      result.files = [
        { ...file, snapshot: { ...file.snapshot, outbound: ['Allowed: snapshot-only.example'] } },
      ];
      const off = draw(result, pdfOptions(scope, 'customer', { snapshot: false }));
      expect(off.writes.some((write) => write.text.includes('snapshot-only.example'))).toBe(false);
      expect(off.writes.some((write) => write.text.includes('Configuration snapshot'))).toBe(false);
      const on = draw(result, pdfOptions(scope, 'customer', { snapshot: true }));
      expect(
        on.writes.filter((write) => write.text.includes('snapshot-only.example')),
      ).toHaveLength(1);
      expect(on.writes.some((write) => write.text.startsWith('Configuration snapshot'))).toBe(true);
      // Reasons and guidance stay with the snapshot off.
      expect(off.writes.some((write) => write.text.includes('Global Read on account'))).toBe(true);
      expect(off.writes.some((write) => write.text.includes('Review tablePermissions'))).toBe(true);
    },
  );

  it('writes the questions only when they are on', () => {
    const on = draw(reportResult(), pdfOptions('file', 'customer', { questions: true }));
    const off = draw(reportResult(), pdfOptions('file', 'customer', { questions: false }));
    const question = 'Is tablePermissions configured for the intended users?';
    expect(on.writes.some((write) => write.text === question)).toBe(true);
    expect(off.writes.some((write) => write.text.includes('Is tablePermissions'))).toBe(false);
    expect(off.writes.some((write) => write.text.includes('Global Read on account'))).toBe(true);
  });

  it('replaces characters outside the font set with ? and says so in the footer', () => {
    const result = reportResult();
    result.files = [
      reportFile('customer', '日本語-handler😀.js', ['configured', 'needs-review', 'configured']),
    ];
    for (const scope of SCOPES) {
      const { model, writes } = draw(result, pdfOptions(scope, 'customer'));
      const text = squash(writes.map((write) => write.text).join(''));
      expect(text).toContain('???-handler?.js');
      expect(text).not.toMatch(/[日本語😀]/u);
      const notes = writes.filter((write) => write.text.endsWith('replaced with ?'));
      expect(notes).toHaveLength(1);
      expect(notes[0]?.text).toMatch(
        /^[1-9]\d* characters outside the PDF font set were replaced with \?$/,
      );
      expect(latin1(renderPdf(model).slice(0, 5))).toBe('%PDF-');
    }
  });

  it('adds no replacement note when every character is in the font set', () => {
    for (const { result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of SCOPES) {
        const { writes } = draw(result(), pdfOptions(scope, fileId));
        expect(writes.some((write) => write.text.includes('replaced with ?'))).toBe(false);
      }
    }
  });

  it('observes exactly the strings the document receives', () => {
    for (const { result, fileId } of REPORT_FIXTURE_CASES.filter(
      (item) => item.name !== 'hostile',
    )) {
      for (const scope of SCOPES) {
        const model = buildReportModel(result(), pdfOptions(scope, fileId), EXPORTED_AT);
        const doc = createPdfDocument();
        const text = vi.spyOn(doc, 'text');
        const seen: string[] = [];
        drawReport(doc, model, (value) => {
          seen.push(...value.split('\n'));
        });
        const drawn = text.mock.calls.flatMap(([value]) =>
          Array.isArray(value) ? value : [value],
        );
        const lines = (values: readonly string[]) =>
          [
            ...new Set(
              values.flatMap((value) => value.split('\n')).filter((value) => value !== ''),
            ),
          ].toSorted();
        expect(lines(drawn)).toEqual(lines(seen));
      }
    }
  });

  it('writes the evidence PDFs when INSPECTOR_PDF_OUT is set', () => {
    if (process.env.INSPECTOR_PDF_OUT === undefined) return;
    for (const { name, result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of SCOPES) {
        const model = buildReportModel(result(), pdfOptions(scope, fileId), EXPORTED_AT);
        const path = join(tmpdir(), `inspector-report-${name}-${scope}.pdf`);
        writeFileSync(path, renderPdf(model));
        process.stdout.write(`${path}\n`);
      }
    }
  });
});
