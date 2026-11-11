import type { jsPDF } from 'jspdf';
import { RING_STATE } from '@/features/inspector/model/rules';
import {
  PAGE_MARGIN,
  REPORT_PALETTE as PALETTE,
  drawCheckbox,
  drawCheckmark,
  drawDot,
  drawRing,
} from './pdfDrawing';
import { createPdfDocument, createTextGuard, setFace, wrapText } from './pdfFonts';
import type { PdfFace, TextGuard, WriteObserver } from './pdfFonts';
import { drawPdfTable, pdfCell } from './pdfTable';
import type { PdfCell, PdfRow, PdfTableEvidence } from './pdfTable';
import type {
  ReportCheck,
  ReportModel,
  ReportRow,
  ReportSection,
  ReportSnapshot,
} from './reportModel.types';

type TextStyle = { readonly face: PdfFace; readonly size: number; readonly color: string };

// Mutable page cursor: every drawing helper below advances `y` and starts a page when a line won't fit.
type Ctx = {
  readonly doc: jsPDF;
  readonly observe: WriteObserver | undefined;
  readonly guard: TextGuard;
  readonly width: number;
  readonly bottom: number;
  y: number;
  indent: number;
  bar: string | null;
};

const LEADING = 1.4;
const LABEL_WIDTH = 78;
const BULLET_INDENT = 14;
/** The site ring in the hero: outer radius, stroke thickness, and the clear space kept inside the hole. */
export const HERO_RING = { radius: 50, thickness: 12, textPadding: 6 } as const;

const TEXT: TextStyle = { face: 'body', size: 10, color: PALETTE.ink };
const MUTED: TextStyle = { face: 'body', size: 10, color: PALETTE.muted };
const SMALL: TextStyle = { face: 'body', size: 9, color: PALETTE.muted };
const LABEL: TextStyle = { face: 'bodyBold', size: 10, color: PALETTE.muted };
const PATH: TextStyle = { face: 'mono', size: 9, color: PALETTE.ink };
const BRAND: TextStyle = { face: 'heading', size: 12, color: PALETTE.ink };
const TITLE: TextStyle = { face: 'heading', size: 20, color: PALETTE.ink };
const HEADLINE: TextStyle = { face: 'heading', size: 16, color: PALETTE.ink };
const SECTION: TextStyle = { face: 'heading', size: 13, color: PALETTE.ink };
const ITEM: TextStyle = { face: 'heading', size: 11, color: PALETTE.ink };

// jsPDF drops a character its embedded font can't map without a trace, so every string goes through
// the guard first: characters outside the repertoire become `?` and are counted for the footer.
function pdfText(ctx: Ctx, text: string): string {
  return ctx.guard.clean(text);
}

// The only place text reaches the document, so the observer sees everything the renderer writes.
function write(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  const clean = pdfText(ctx, text);
  ctx.observe?.(clean, style.face);
  setFace(ctx.doc, style.face);
  ctx.doc.setFontSize(style.size).setTextColor(style.color);
  ctx.doc.text(clean, x, y, { baseline: 'top', align });
}

function ensure(ctx: Ctx, height: number): void {
  if (ctx.y + height > ctx.bottom && ctx.y > PAGE_MARGIN) {
    ctx.doc.addPage();
    ctx.y = PAGE_MARGIN;
  }
}

function drawBar(ctx: Ctx, height: number): void {
  if (ctx.bar !== null) ctx.doc.setFillColor(ctx.bar).rect(PAGE_MARGIN, ctx.y, 3, height, 'F');
}

function space(ctx: Ctx, height: number): void {
  ensure(ctx, height);
  drawBar(ctx, height);
  ctx.y += height;
}

function rule(ctx: Ctx): void {
  ctx.doc
    .setDrawColor(PALETTE.rules)
    .setLineWidth(0.8)
    .line(PAGE_MARGIN, ctx.y, PAGE_MARGIN + ctx.width, ctx.y);
}

// Wraps to the page width; a long line continues on the next page rather than being cut off.
function paragraph(ctx: Ctx, text: string, style: TextStyle, inset = 0): void {
  if (text === '') return;
  const step = style.size * LEADING;
  const width = ctx.width - ctx.indent - inset;
  for (const line of wrapText(ctx.doc, pdfText(ctx, text), width, style.face, style.size)) {
    ensure(ctx, step);
    drawBar(ctx, step);
    write(ctx, line, PAGE_MARGIN + ctx.indent + inset, ctx.y, style);
    ctx.y += step;
  }
}

function heading(ctx: Ctx, text: string, style: TextStyle): void {
  ensure(ctx, style.size * LEADING * 3);
  paragraph(ctx, text, style);
  space(ctx, 4);
}

function bullet(ctx: Ctx, text: string, style: TextStyle, marker: 'dot' | 'box'): void {
  ensure(ctx, style.size * LEADING);
  const x = PAGE_MARGIN + ctx.indent;
  if (marker === 'dot') drawDot(ctx.doc, x + 3, ctx.y + style.size * 0.55, 1.6, PALETTE.muted);
  else drawCheckbox(ctx.doc, x, ctx.y + style.size * 0.1, style.size * 0.8, PALETTE.muted);
  paragraph(ctx, text, style, BULLET_INDENT);
}

// A label column beside wrapped text: Environment, Scanned and Result.
function drawLines(ctx: Ctx, lines: ReportModel['lines']): void {
  for (const line of lines) {
    const style = line.label === '' ? MUTED : line.label === 'Environment' ? PATH : TEXT;
    const step = style.size * LEADING;
    const width = ctx.width - ctx.indent - LABEL_WIDTH;
    for (const [index, part] of wrapText(
      ctx.doc,
      pdfText(ctx, line.text),
      width,
      style.face,
      style.size,
    ).entries()) {
      ensure(ctx, step);
      const x = PAGE_MARGIN + ctx.indent;
      if (index === 0 && line.label !== '') write(ctx, line.label, x, ctx.y, LABEL);
      write(ctx, part, x + LABEL_WIDTH, ctx.y, style);
      ctx.y += step;
    }
    ctx.y += 2;
  }
}

// Items on one line, wrapping to the next when the right edge is reached.
function drawRun(
  ctx: Ctx,
  items: readonly { readonly text: string; readonly style: TextStyle }[],
): void {
  const left = PAGE_MARGIN + ctx.indent;
  let x = left;
  ensure(ctx, 10 * LEADING);
  for (const { text, style } of items) {
    setFace(ctx.doc, style.face);
    ctx.doc.setFontSize(style.size);
    const width = ctx.doc.getTextWidth(pdfText(ctx, text));
    if (x > left && x + width > PAGE_MARGIN + ctx.width) {
      x = left;
      ctx.y += style.size * LEADING;
      ensure(ctx, style.size * LEADING);
    }
    write(ctx, text, x, ctx.y, style);
    x += width + 16;
  }
  ctx.y += 10 * LEADING;
}

function drawHeader(ctx: Ctx, model: ReportModel): void {
  ctx.doc.setFillColor(PALETTE.blueChip).roundedRect(PAGE_MARGIN, ctx.y, 16, 16, 3, 3, 'F');
  drawCheckmark(ctx.doc, PAGE_MARGIN + 3.5, ctx.y + 3.5, 9, PALETTE.white);
  write(ctx, model.header.brand, PAGE_MARGIN + 24, ctx.y + 1, BRAND);
  write(ctx, model.header.label, PAGE_MARGIN + ctx.width, ctx.y + 2, MUTED, 'right');
  ctx.y += 24;
  rule(ctx);
  ctx.y += 14;
}

function drawBanners(ctx: Ctx, banners: readonly string[]): void {
  const step = TEXT.size * LEADING + 4;
  for (const banner of banners) {
    for (const line of wrapText(
      ctx.doc,
      pdfText(ctx, banner),
      ctx.width - 20,
      TEXT.face,
      TEXT.size,
    )) {
      ensure(ctx, step);
      ctx.doc.setFillColor(PALETTE.orangeTint).rect(PAGE_MARGIN, ctx.y, ctx.width, step, 'F');
      ctx.doc.setFillColor(PALETTE.orange).rect(PAGE_MARGIN, ctx.y, 3, step, 'F');
      write(ctx, line, PAGE_MARGIN + 12, ctx.y + 2, TEXT);
      ctx.y += step;
    }
    ctx.y += 6;
  }
}

// The count and caption stay inside the ring hole: the count shrinks to fit (three-digit totals) and
// the caption wraps, and the block is centred vertically on the ring.
function drawRingLabel(ctx: Ctx, cx: number, cy: number, count: string): void {
  const width = 2 * (HERO_RING.radius - HERO_RING.thickness) - 2 * HERO_RING.textPadding;
  const base: TextStyle = { face: 'heading', size: 20, color: PALETTE.ink };
  setFace(ctx.doc, base.face);
  const measured = ctx.doc.setFontSize(base.size).getTextWidth(pdfText(ctx, count));
  const countStyle: TextStyle =
    measured > width
      ? { ...base, size: Math.floor((base.size * width * 10) / measured) / 10 }
      : base;
  const caption = wrapText(ctx.doc, 'checks addressed', width, SMALL.face, SMALL.size);
  const step = SMALL.size * 1.2;
  const gap = 3;
  let y = cy - (countStyle.size + gap + caption.length * step) / 2;
  write(ctx, count, cx, y, countStyle, 'center');
  y += countStyle.size + gap;
  for (const line of caption) {
    write(ctx, line, cx, y, SMALL, 'center');
    y += step;
  }
}

// AC-9.3 hero: the site ring over every check, the path, headline, interval and the file counts.
function drawHero(ctx: Ctx, model: ReportModel): void {
  paragraph(ctx, model.title, TITLE);
  space(ctx, 10);
  ensure(ctx, 2 * HERO_RING.radius + 8);
  const top = ctx.y;
  const cx = PAGE_MARGIN + HERO_RING.radius + 4;
  const cy = top + HERO_RING.radius + 4;
  const segments = model.rows.flatMap((row) => row.checks.map((check) => RING_STATE[check.status]));
  drawRing(ctx.doc, cx, cy, HERO_RING.radius - HERO_RING.thickness / 2, HERO_RING.thickness, segments);
  drawRingLabel(ctx, cx, cy, `${String(model.counts.K)}/${String(model.counts.T)}`);
  ctx.indent = 2 * HERO_RING.radius + 28;
  paragraph(ctx, model.headline, HEADLINE);
  space(ctx, 4);
  drawLines(ctx, model.lines);
  const bold = (color: string): TextStyle => ({ face: 'bodyBold', size: 10, color });
  drawRun(ctx, [
    { text: `Ready: ${String(model.fileCounts.ready)}`, style: bold(PALETTE.blueChip) },
    { text: `Needs review: ${String(model.fileCounts.needsReview)}`, style: bold(PALETTE.orange) },
    { text: `Incomplete: ${String(model.fileCounts.incomplete)}`, style: bold(PALETTE.muted) },
    { text: 'Not verified: Tenant outbound policy', style: MUTED },
  ]);
  ctx.indent = 0;
  ctx.y = Math.max(ctx.y, top + 2 * HERO_RING.radius + 8) + 8;
}

function statusCell(check: ReportCheck, withReason: boolean): PdfCell {
  switch (check.status) {
    case 'configured':
      return pdfCell(check.statusText, { color: PALETTE.blueChip, tick: true });
    case 'reviewed':
      return pdfCell(withReason ? `${check.statusText}: ${check.finding}` : check.statusText, {
        color: PALETTE.blueChip,
        tick: true,
      });
    case 'needs-review':
      return pdfCell(`! ${check.statusText}`, { face: 'bodyBold', color: PALETTE.orange });
    case 'not-scanned':
      return pdfCell(check.statusText, { color: PALETTE.muted });
  }
}

function resultCell(result: ReportRow['result']): PdfCell {
  switch (result) {
    case 'Ready':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.blueChip, pill: PALETTE.blueTint });
    case 'Needs review':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.orange, pill: PALETTE.orangeTint });
    case 'Incomplete':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.muted, pill: PALETTE.greyTint });
  }
}

function drawFileTable(ctx: Ctx, model: ReportModel): PdfTableEvidence {
  const checks = model.rows.flatMap((row) => row.checks);
  const rows = checks.map((check): PdfRow => ({
    label: check.title,
    ring: null,
    cells: [
      pdfCell(check.title, { face: 'bodyBold' }),
      statusCell(check, false),
      pdfCell(check.finding),
    ],
  }));
  ensure(ctx, 80);
  return drawPdfTable(
    ctx.doc,
    {
      columns: [
        { header: 'Check', width: ctx.width * 0.2 },
        { header: 'Status', width: ctx.width * 0.15 },
        { header: 'Finding', width: ctx.width * 0.65 },
      ],
      rows,
      labelColumn: 0,
      startY: ctx.y,
    },
    ctx.observe,
    ctx.guard,
  );
}

function drawSiteTable(ctx: Ctx, model: ReportModel): PdfTableEvidence {
  const rows = model.rows.map((row): PdfRow => ({
    label: row.name,
    ring: row.checks.map((check) => RING_STATE[check.status]),
    cells: [
      pdfCell(''),
      pdfCell(row.name, { face: 'mono' }),
      ...row.checks.map((check) => statusCell(check, true)),
      resultCell(row.result),
    ],
  }));
  ensure(ctx, 80);
  return drawPdfTable(
    ctx.doc,
    {
      columns: [
        { header: '', width: ctx.width * 0.05 },
        { header: 'File', width: ctx.width * 0.25 },
        { header: 'Web role', width: ctx.width * 0.17 },
        { header: 'Table permissions', width: ctx.width * 0.2 },
        { header: 'Outbound networking', width: ctx.width * 0.17 },
        { header: 'Result', width: ctx.width * 0.16 },
      ],
      rows,
      labelColumn: 1,
      startY: ctx.y,
    },
    ctx.observe,
    ctx.guard,
  );
}

function drawFinding(ctx: Ctx, section: ReportSection, siteScope: boolean): void {
  ensure(ctx, 60);
  ctx.bar = PALETTE.orange;
  ctx.indent = 12;
  paragraph(ctx, siteScope ? `${section.title}: ${section.fileName}` : section.title, ITEM);
  space(ctx, 2);
  paragraph(ctx, section.summary, TEXT);
  space(ctx, 3);
  paragraph(ctx, section.guidance, MUTED);
  for (const detail of section.detail) {
    space(ctx, 3);
    paragraph(ctx, detail, MUTED);
  }
  if (section.questions.length > 0) space(ctx, 4);
  for (const question of section.questions) bullet(ctx, question, TEXT, 'box');
  ctx.bar = null;
  ctx.indent = 0;
  ctx.y += 10;
}

function drawNotScanned(ctx: Ctx, sections: readonly ReportSection[]): void {
  if (sections.length === 0) return;
  heading(ctx, 'Not scanned', SECTION);
  for (const section of sections) {
    bullet(ctx, `${section.title}: ${section.fileName} — ${section.summary}`, TEXT, 'dot');
  }
  ctx.y += 10;
}

function drawSnapshot(ctx: Ctx, snapshot: ReportSnapshot, siteScope: boolean): void {
  heading(
    ctx,
    siteScope ? `Configuration snapshot: ${snapshot.fileName}` : 'Configuration snapshot',
    SECTION,
  );
  const groups = [
    ['Web roles', snapshot.roles],
    ['Tables with privileges', snapshot.tables],
    ['Outbound', snapshot.outbound],
  ] as const;
  for (const [label, items] of groups) {
    ensure(ctx, 3 * TEXT.size * LEADING);
    paragraph(ctx, label, { ...TEXT, face: 'bodyBold' });
    space(ctx, 2);
    for (const item of items) bullet(ctx, item, PATH, 'dot');
    space(ctx, 6);
  }
  ctx.y += 6;
}

function drawFooter(ctx: Ctx, footer: readonly string[]): void {
  ensure(ctx, 40);
  rule(ctx);
  ctx.y += 8;
  for (const line of footer) {
    paragraph(ctx, line, SMALL);
    space(ctx, 3);
  }
  const replaced = ctx.guard.replaced();
  if (replaced > 0) {
    paragraph(
      ctx,
      `${String(replaced)} characters outside the PDF font set were replaced with ?`,
      SMALL,
    );
  }
}

// "Page n of m" on every page, once all pages exist so the total is known and observable.
function drawPageNumbers(ctx: Ctx): void {
  const total = ctx.doc.getNumberOfPages();
  const y = ctx.doc.internal.pageSize.getHeight() - PAGE_MARGIN + 10;
  for (let page = 1; page <= total; page++) {
    ctx.doc.setPage(page);
    write(
      ctx,
      `Page ${String(page)} of ${String(total)}`,
      PAGE_MARGIN + ctx.width,
      y,
      SMALL,
      'right',
    );
  }
  ctx.doc.setPage(total);
}

/**
 * Draws the report onto `doc` as vector text and paths. `observe` sees every string written, so tests
 * can check each character against the font it is written in. Returns the table layout evidence.
 */
export function drawReport(
  doc: jsPDF,
  model: ReportModel,
  observe?: WriteObserver,
): PdfTableEvidence {
  doc.setProperties({ title: model.title });
  const ctx: Ctx = {
    doc,
    observe,
    guard: createTextGuard(),
    width: doc.internal.pageSize.getWidth() - 2 * PAGE_MARGIN,
    bottom: doc.internal.pageSize.getHeight() - PAGE_MARGIN,
    y: PAGE_MARGIN,
    indent: 0,
    bar: null,
  };
  drawHeader(ctx, model);
  if (model.scope === 'file') {
    paragraph(ctx, model.title, TITLE);
    space(ctx, 8);
    drawLines(ctx, model.lines);
  } else {
    drawHero(ctx, model);
  }
  drawBanners(ctx, model.banners);
  const table = model.scope === 'file' ? drawFileTable(ctx, model) : drawSiteTable(ctx, model);
  ctx.y = table.finalY + 18;
  if (model.scope === 'file') {
    for (const section of model.needsReview) drawFinding(ctx, section, false);
  } else {
    heading(ctx, 'Review first', SECTION);
    for (const section of model.reviewFirst) drawFinding(ctx, section, true);
  }
  drawNotScanned(ctx, model.notScanned);
  for (const snapshot of model.snapshot ?? []) drawSnapshot(ctx, snapshot, model.scope === 'site');
  drawFooter(ctx, model.footer);
  drawPageNumbers(ctx);
  return table;
}

export function renderPdf(model: ReportModel): Uint8Array {
  const doc = createPdfDocument();
  drawReport(doc, model);
  return new Uint8Array(doc.output('arraybuffer'));
}
