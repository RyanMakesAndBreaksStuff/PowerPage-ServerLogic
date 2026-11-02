import { describe, expect, it, vi } from 'vitest';
import { REPORT_PALETTE } from './pdfDrawing';
import { createPdfDocument, wrapText } from './pdfFonts';
import {
  CELL_PADDING,
  TABLE_FONT_SIZE,
  drawPdfTable,
  maxRowLines,
  pdfCell,
  preparePdfRows,
} from './pdfTable';
import type { PdfColumn, PdfRow } from './pdfTable';

const COLUMNS: readonly PdfColumn[] = [
  { header: 'Check', width: 120 },
  { header: 'Status', width: 100 },
  { header: 'Finding', width: 300 },
];
const WORDS = Array.from({ length: 1500 }, (_, index) => `w${String(index)}`).join(' ');

function row(label: string, finding: string, extra: Partial<PdfRow> = {}): PdfRow {
  return {
    label,
    ring: null,
    cells: [
      pdfCell(label, { face: 'bodyBold' }),
      pdfCell('Configured', { tick: true, color: REPORT_PALETTE.blueChip }),
      pdfCell(finding),
    ],
    ...extra,
  };
}

describe('preparePdfRows', () => {
  it('keeps a row that fits as one printed row with its label', () => {
    const doc = createPdfDocument();
    const [only, ...rest] = preparePdfRows(
      doc,
      COLUMNS,
      [row('Web role', 'Members can call it.')],
      0,
      10,
    );
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ owner: 0, part: 0, parts: 1 });
    expect(only?.cells.map((cell) => cell.lines)).toEqual([
      ['Web role'],
      ['Configured'],
      ['Members can call it.'],
    ]);
  });

  it('splits an oversized cell into labelled continuation rows and loses no text', () => {
    const doc = createPdfDocument();
    const original = row('Table permissions', WORDS, { ring: ['done', 'review', 'done'] });
    const printed = preparePdfRows(doc, COLUMNS, [original], 0, 10);
    const expected = wrapText(doc, WORDS, 300 - 2 * CELL_PADDING, 'body', TABLE_FONT_SIZE);
    expect(expected.length).toBeGreaterThan(30);
    expect(printed).toHaveLength(Math.ceil(expected.length / 10));
    expect(printed.flatMap((part) => part.cells[2]?.lines ?? [])).toEqual(expected);
    for (const part of printed) {
      expect(part.parts).toBe(printed.length);
      for (const cell of part.cells) expect(cell.lines.length).toBeLessThanOrEqual(10);
    }
    const labels = printed.map((part) => (part.cells[0]?.lines ?? []).join(' '));
    expect(labels[0]).toBe('Table permissions');
    expect(labels[1]).toBe(`Table permissions (continued 2/${String(printed.length)})`);
    expect(labels.at(-1)).toBe(
      `Table permissions (continued ${String(printed.length)}/${String(printed.length)})`,
    );
    // Marks and the ring belong to the first printed part only.
    expect(printed.map((part) => part.cells[1]?.cell.tick)).toEqual([
      true,
      ...Array.from({ length: printed.length - 1 }, () => false),
    ]);
    expect(printed.map((part) => part.ring !== null)).toEqual([
      true,
      ...Array.from({ length: printed.length - 1 }, () => false),
    ]);
  });

  it('breaks a word wider than its column without dropping characters', () => {
    const doc = createPdfDocument();
    const word = 'y'.repeat(2000);
    const printed = preparePdfRows(doc, COLUMNS, [row('Outbound networking', word)], 0, 8);
    expect(printed.length).toBeGreaterThan(1);
    expect(printed.flatMap((part) => part.cells[2]?.lines ?? []).join('')).toBe(word);
  });

  it('rejects a row with more cells than columns', () => {
    const doc = createPdfDocument();
    const wide: PdfRow = {
      label: 'x',
      ring: null,
      cells: [pdfCell('a'), pdfCell('b'), pdfCell('c'), pdfCell('d')],
    };
    expect(() => preparePdfRows(doc, COLUMNS, [wide], 0, 10)).toThrow('more cells than columns');
  });
});

describe('maxRowLines', () => {
  it('leaves room for the repeated head on a landscape A4 page', () => {
    const doc = createPdfDocument();
    const lines = maxRowLines(doc);
    const height = lines * TABLE_FONT_SIZE * doc.getLineHeightFactor() + 2 * CELL_PADDING;
    expect(lines).toBeGreaterThan(30);
    expect(height).toBeLessThan(doc.internal.pageSize.getHeight() - 2 * 36 - 20);
  });
});

describe('drawPdfTable', () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, index) =>
      row(`Row ${String(index)}`, `short ${String(index)}`),
    ),
    row('Giant', WORDS),
    ...Array.from({ length: 30 }, (_, index) =>
      row(`After ${String(index)}`, `tail ${String(index)}`),
    ),
  ];

  it('repeats the head on every page and never lets a printed row span two pages', () => {
    const doc = createPdfDocument();
    const evidence = drawPdfTable(doc, { columns: COLUMNS, rows, labelColumn: 0, startY: 120 });
    const pages = [...new Set(evidence.rows.map((printed) => printed.page))];
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(evidence.logicalRows).toBe(61);
    expect(evidence.physicalRows).toBeGreaterThan(61);
    expect(evidence.rows).toHaveLength(evidence.physicalRows);
    expect(evidence.rows.filter((printed) => printed.spansMultiplePages)).toEqual([]);
    expect(evidence.headPages).toEqual(pages);
    expect(evidence.rows.map((printed) => printed.page)).toEqual(
      evidence.rows.map((printed) => printed.page).toSorted((a, b) => a - b),
    );
    expect(evidence.finalY).toBeGreaterThan(36);
  });

  it('hands every word of every cell to the document exactly once', () => {
    const doc = createPdfDocument();
    const seen: string[] = [];
    drawPdfTable(doc, { columns: COLUMNS, rows, labelColumn: 0, startY: 120 }, (text) => {
      seen.push(text);
    });
    const tokens = (value: string): string[] =>
      value.split(/\s+/).filter((token) => /^w\d+$/.test(token));
    expect(seen.flatMap(tokens).toSorted()).toEqual(tokens(WORDS).toSorted());
    expect(seen.filter((text) => text.includes('(continued ')).length).toBeGreaterThan(1);
  });

  it('draws ring, tick and pill once for a row printed in several parts', () => {
    const doc = createPdfDocument();
    const curveTo = vi.spyOn(doc, 'curveTo');
    const pill = vi.spyOn(doc, 'roundedRect');
    const lineTo = vi.spyOn(doc, 'lineTo');
    const evidence = drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [
        {
          ...row('Giant', WORDS, { ring: ['done', 'review', 'not-scanned'] }),
          cells: [
            pdfCell('Giant'),
            pdfCell('Ready', { pill: REPORT_PALETTE.blueTint, tick: true }),
            pdfCell(WORDS),
          ],
        },
      ],
      labelColumn: 0,
      startY: 100,
    });
    expect(evidence.physicalRows).toBeGreaterThan(1);
    // Three 116 degree arcs, two Beziers each, drawn once.
    expect(curveTo).toHaveBeenCalledTimes(6);
    expect(pill).toHaveBeenCalledTimes(1);
    expect(lineTo).toHaveBeenCalledTimes(2);
  });

  it('leaves the cell behind a pill unfilled so the pill shows', () => {
    const doc = createPdfDocument();
    const rect = vi.spyOn(doc, 'rect');
    drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [
        {
          label: 'Result',
          ring: null,
          cells: [
            pdfCell('Ready'),
            pdfCell('x'),
            pdfCell('Ready', { pill: REPORT_PALETTE.blueTint }),
          ],
        },
      ],
      labelColumn: 0,
      startY: 100,
    });
    // Body cells are filled white by the grid theme; the pill cell must be stroked only.
    const styles = rect.mock.calls.map(([, , , , style]) => style);
    expect(styles.slice(-3)).toEqual(['DF', 'DF', 'S']);
  });

  it('prints a one-row table on the first page below its start', () => {
    const doc = createPdfDocument();
    const evidence = drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [row('Web role', 'Members can call it.')],
      labelColumn: 0,
      startY: 100,
    });
    expect(doc.getNumberOfPages()).toBe(1);
    expect(evidence.headPages).toEqual([1]);
    expect(evidence.finalY).toBeGreaterThan(100);
  });
});
