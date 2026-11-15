// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as copy from '@/features/inspector/model/copy';
import { buildReportModel } from './buildReportModel';
import {
  PDF_FACE_FILES,
  PDF_FACE_NAMES,
  SUPPORTED_RANGES,
  createPdfDocument,
  createTextGuard,
  wrapText,
} from './pdfFonts';
import type { PdfFace } from './pdfFonts';
import { EXPORTED_AT, REPORT_FIXTURE_CASES, REPORT_OPTIONS } from './reportFixtures';
import { drawReport } from './renderPdf';
import { cmapCodePoints } from './testCmap';

const FONT_DIR = new URL('../../../assets/fonts/', import.meta.url);
const CHECK_MARK = 0x2713;

const coverage = new Map<PdfFace, ReadonlySet<number>>(
  PDF_FACE_NAMES.map((face) => [
    face,
    cmapCodePoints(readFileSync(new URL(PDF_FACE_FILES[face], FONT_DIR))),
  ]),
);

// A line break is layout, not a glyph; every other character must be in the face it is written in.
function uncovered(face: PdfFace, text: string): string[] {
  const codePoints = coverage.get(face);
  if (codePoints === undefined) throw new Error(`No coverage for ${face}`);
  return Array.from(text).filter(
    (char) => char !== '\n' && !codePoints.has(char.codePointAt(0) ?? 0),
  );
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

describe('PDF fonts', () => {
  it('reads the cmap of each embedded TTF', () => {
    for (const face of PDF_FACE_NAMES) {
      expect(uncovered(face, 'Ab0 !|*<>[]#`')).toEqual([]);
      expect(uncovered(face, '· – —')).toEqual([]);
    }
    expect(() => cmapCodePoints(new Uint8Array(12))).toThrow('Font has no cmap table');
  });

  it('shows DM Sans and Space Grotesk have no U+2713, so the glyph is a vector', () => {
    for (const face of ['body', 'bodyBold', 'heading'] as const) {
      expect(coverage.get(face)?.has(CHECK_MARK)).toBe(false);
    }
  });

  it('embeds DM Sans 400/700, Space Grotesk 700 and JetBrains Mono 400', () => {
    const fonts = createPdfDocument().getFontList();
    expect(fonts.DMSans).toEqual(expect.arrayContaining(['normal', 'bold']));
    expect(fonts.SpaceGrotesk).toEqual(['bold']);
    expect(fonts.JetBrainsMono).toEqual(['normal']);
  });

  it('writes only characters its font covers, for the standard, long and hostile fixtures in both scopes', () => {
    const used = new Set<PdfFace>();
    for (const { name, result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of ['file', 'site'] as const) {
        for (const redact of [false, true]) {
          const model = buildReportModel(
            result(),
            { ...REPORT_OPTIONS, format: 'pdf', scope, fileId, redact },
            EXPORTED_AT,
          );
          const writes: { text: string; face: PdfFace }[] = [];
          drawReport(createPdfDocument(), model, (text, face) => {
            writes.push({ text, face });
          });
          expect(writes.length, name).toBeGreaterThan(20);
          for (const { text, face } of writes) {
            used.add(face);
            expect(uncovered(face, text), `${name} ${scope} ${face}: ${text}`).toEqual([]);
            expect(text).not.toContain('✓');
          }
        }
      }
    }
    expect([...used].toSorted()).toEqual([...PDF_FACE_NAMES].toSorted());
  });

  it('covers every string of the check copy and notes in the body face', () => {
    for (const text of strings(copy)) expect(uncovered('body', text), text).toEqual([]);
  });

  it('has a glyph in every embedded face for every code point of the supported ranges', () => {
    for (const face of PDF_FACE_NAMES) {
      const missing = SUPPORTED_RANGES.flatMap(([first, last]) =>
        Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
      ).filter((codePoint) => coverage.get(face)?.has(codePoint) !== true);
      expect(
        missing.map((codePoint) => codePoint.toString(16)),
        face,
      ).toEqual([]);
    }
  });

  it('replaces each code point outside the ranges with ? and counts it', () => {
    const guard = createTextGuard();
    expect(guard.clean('a日b😀 c\td')).toBe('a?b? c?d');
    expect(guard.replaced()).toBe(3);
    expect(guard.clean('x\r\ny\rz✓­')).toBe('x\ny\nz??');
    expect(guard.replaced()).toBe(5);
    expect(guard.clean('é Ł · – — … ‘ ’ “ ” •')).toBe('é Ł · – — … ‘ ’ “ ” •');
    expect(guard.replaced()).toBe(5);
  });

  it('flags a character outside the fonts, which jsPDF would otherwise drop silently', () => {
    expect(uncovered('body', 'file 日本語 ✓')).toEqual(['日', '本', '語', '✓']);
    expect(uncovered('mono', 'résumé-ł.js')).toEqual([]);
  });

  it('wraps long words and newlines without dropping characters', () => {
    const doc = createPdfDocument();
    const word = 'x'.repeat(400);
    const lines = wrapText(doc, word, 200, 'mono', 10);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(word);
    for (const line of lines) expect(doc.getTextWidth(line)).toBeLessThanOrEqual(200.01);
    expect(wrapText(doc, 'a\r\nb\rc\nd', 200, 'body', 10)).toEqual(['a', 'b', 'c', 'd']);
  });
});
