import type { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CellDef, CellHookData } from 'jspdf-autotable';
import type { RingState } from '@/lib/ringGeometry';
import { PAGE_MARGIN, REPORT_PALETTE, drawCheckmark, drawRing } from './pdfDrawing';
import { createTextGuard, faceStyle, setFace, wrapText } from './pdfFonts';
import type { PdfFace, TextGuard, WriteObserver } from './pdfFonts';

export const TABLE_FONT_SIZE = 9;
export const CELL_PADDING = 6;
const TICK_SIZE = 8;
const TICK_INDENT = 16;
const PILL_INDENT = 6;
const RING_RADIUS = 8;

export type PdfColumn = { readonly header: string; readonly width: number };
export type PdfCell = {
  readonly text: string;
  readonly face: PdfFace;
  readonly color: string;
  /** Draw the vector `✓` before the text. */
  readonly tick: boolean;
  /** Draw a rounded tint of this colour behind the text. */
  readonly pill: string | null;
};
export type PdfRow = {
  /** Names the row in a continuation label: `<label> (continued 2/3)`. */
  readonly label: string;
  readonly cells: readonly PdfCell[];
  /** Mini status ring drawn in the first column of the row's first printed part. */
  readonly ring: readonly RingState[] | null;
};
export type PdfTableSpec = {
  readonly columns: readonly PdfColumn[];
  readonly rows: readonly PdfRow[];
  /** The column whose cell carries the continuation label. */
  readonly labelColumn: number;
  readonly startY: number;
};
export type PreparedCell = { readonly lines: readonly string[]; readonly cell: PdfCell };
export type PreparedRow = {
  readonly owner: number;
  readonly part: number;
  readonly parts: number;
  readonly ring: readonly RingState[] | null;
  readonly cells: readonly PreparedCell[];
};
export type PdfTableEvidence = {
  readonly finalY: number;
  readonly logicalRows: number;
  readonly physicalRows: number;
  readonly rows: readonly {
    readonly index: number;
    readonly page: number;
    readonly spansMultiplePages: boolean;
  }[];
  readonly headPages: readonly number[];
};

export function pdfCell(
  text: string,
  options: {
    readonly face?: PdfFace;
    readonly color?: string;
    readonly tick?: boolean;
    readonly pill?: string;
  } = {},
): PdfCell {
  return {
    text,
    face: options.face ?? 'body',
    color: options.color ?? REPORT_PALETTE.ink,
    tick: options.tick ?? false,
    pill: options.pill ?? null,
  };
}

function leftPadding(cell: PdfCell): number {
  return CELL_PADDING + (cell.tick ? TICK_INDENT : cell.pill === null ? 0 : PILL_INDENT);
}

function lineHeight(doc: jsPDF): number {
  return TABLE_FONT_SIZE * doc.getLineHeightFactor();
}

/** The most text lines one printed row can hold under a repeated head row on an empty page. */
export function maxRowLines(doc: jsPDF): number {
  const usable = doc.internal.pageSize.getHeight() - 2 * PAGE_MARGIN;
  const head = lineHeight(doc) + 2 * CELL_PADDING;
  // One line of slack covers rounding between this measure and AutoTable's.
  return Math.max(1, Math.floor((usable - head - 2 * CELL_PADDING) / lineHeight(doc)) - 1);
}

/**
 * Wraps every cell at its column width and splits a logical row taller than `maxLines` into
 * continuation rows, so AutoTable never has to break a printed row across pages. Nothing is
 * shortened: the lines of all parts, in order, are the wrapped text of the cell.
 */
export function preparePdfRows(
  doc: jsPDF,
  columns: readonly PdfColumn[],
  rows: readonly PdfRow[],
  labelColumn: number,
  maxLines: number,
  guard: TextGuard = createTextGuard(),
): readonly PreparedRow[] {
  function wrap(cell: PdfCell, column: number, text: string): string[] {
    const width = columns[column]?.width;
    if (width === undefined) throw new Error('Report table row has more cells than columns');
    return wrapText(
      doc,
      guard.clean(text),
      width - leftPadding(cell) - CELL_PADDING,
      cell.face,
      TABLE_FONT_SIZE,
    );
  }

  return rows.flatMap((row, owner) => {
    const wrapped = row.cells.map((cell, column) => wrap(cell, column, cell.text));
    const parts = Math.max(1, ...wrapped.map((lines) => Math.ceil(lines.length / maxLines)));
    return Array.from({ length: parts }, (_, part) => ({
      owner,
      part,
      parts,
      ring: part === 0 ? row.ring : null,
      cells: row.cells.map((cell, column): PreparedCell => {
        if (part > 0 && column === labelColumn) {
          const label = `${row.label} (continued ${String(part + 1)}/${String(parts)})`;
          return { lines: wrap(cell, column, label), cell: { ...cell, tick: false, pill: null } };
        }
        const lines = (wrapped[column] ?? []).slice(part * maxLines, (part + 1) * maxLines);
        return { lines, cell: part === 0 ? cell : { ...cell, tick: false, pill: null } };
      }),
    }));
  });
}

function cellDef(prepared: PreparedCell): CellDef {
  const { cell } = prepared;
  return {
    content: prepared.lines.join('\n'),
    styles: {
      ...faceStyle(cell.face),
      textColor: cell.color,
      cellPadding: {
        top: CELL_PADDING,
        right: CELL_PADDING,
        bottom: CELL_PADDING,
        left: leftPadding(cell),
      },
    },
  };
}

/**
 * Draws a table with AutoTable: the head repeats on every page and no printed row spans two pages.
 * The returned evidence lets tests prove both without parsing the PDF.
 */
export function drawPdfTable(
  doc: jsPDF,
  spec: PdfTableSpec,
  observe?: WriteObserver,
  guard: TextGuard = createTextGuard(),
): PdfTableEvidence {
  const prepared = preparePdfRows(
    doc,
    spec.columns,
    spec.rows,
    spec.labelColumn,
    maxRowLines(doc),
    guard,
  );
  for (const column of spec.columns) observe?.(column.header, 'bodyBold');
  for (const row of prepared) {
    for (const { lines, cell } of row.cells) observe?.(lines.join('\n'), cell.face);
  }
  const rows: { index: number; page: number; spansMultiplePages: boolean }[] = [];
  const headPages = new Set<number>();
  let finalY = spec.startY;
  const pageNumber = (): number => doc.getCurrentPageInfo().pageNumber;

  function willDrawCell(data: CellHookData): void {
    if (data.section !== 'body') return;
    const cell = prepared[data.row.index]?.cells[data.column.index]?.cell;
    if (cell?.pill == null) return;
    const text = prepared[data.row.index]?.cells[data.column.index]?.lines[0] ?? '';
    setFace(doc, cell.face);
    doc.setFontSize(TABLE_FONT_SIZE);
    const width = doc.getTextWidth(text);
    doc
      .setFillColor(cell.pill)
      .roundedRect(
        data.cell.x + CELL_PADDING,
        data.cell.y + CELL_PADDING - 2,
        width + 2 * PILL_INDENT,
        lineHeight(doc) + 4,
        (lineHeight(doc) + 4) / 2,
        (lineHeight(doc) + 4) / 2,
        'F',
      );
    // AutoTable fills the cell rectangle after this hook; without this the tint covers the whole cell.
    data.cell.styles.fillColor = false;
  }

  function didDrawCell(data: CellHookData): void {
    if (data.section === 'head') {
      headPages.add(pageNumber());
      return;
    }
    if (data.section !== 'body') return;
    const row = prepared[data.row.index];
    const cell = row?.cells[data.column.index]?.cell;
    if (data.column.index === 0) {
      rows.push({
        index: data.row.index,
        page: pageNumber(),
        spansMultiplePages: data.row.spansMultiplePages,
      });
      if (row?.ring != null) {
        drawRing(
          doc,
          data.cell.x + data.cell.width / 2,
          data.cell.y + CELL_PADDING + RING_RADIUS,
          RING_RADIUS - 2,
          4,
          row.ring,
        );
      }
    }
    if (cell?.tick === true) {
      drawCheckmark(
        doc,
        data.cell.x + CELL_PADDING,
        data.cell.y + CELL_PADDING + (lineHeight(doc) - TICK_SIZE) / 2,
        TICK_SIZE,
        cell.color,
      );
    }
  }

  autoTable(doc, {
    startY: spec.startY,
    margin: PAGE_MARGIN,
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    tableWidth: spec.columns.reduce((sum, column) => sum + column.width, 0),
    styles: {
      ...faceStyle('body'),
      fontSize: TABLE_FONT_SIZE,
      overflow: 'linebreak',
      cellPadding: CELL_PADDING,
      lineColor: REPORT_PALETTE.rules,
      lineWidth: 0.5,
      textColor: REPORT_PALETTE.ink,
      valign: 'top',
      minCellHeight: spec.rows.some((row) => row.ring !== null)
        ? 2 * (RING_RADIUS + CELL_PADDING)
        : 0,
    },
    headStyles: {
      ...faceStyle('bodyBold'),
      fillColor: REPORT_PALETTE.head,
      textColor: REPORT_PALETTE.muted,
      minCellHeight: 0,
    },
    columnStyles: Object.fromEntries(
      spec.columns.map((column, index) => [index, { cellWidth: column.width }]),
    ),
    head: [spec.columns.map((column) => column.header)],
    body: prepared.map((row) => row.cells.map(cellDef)),
    willDrawCell,
    didDrawCell,
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? finalY;
    },
  });

  return {
    finalY,
    logicalRows: spec.rows.length,
    physicalRows: prepared.length,
    rows,
    headPages: [...headPages].toSorted((a, b) => a - b),
  };
}
