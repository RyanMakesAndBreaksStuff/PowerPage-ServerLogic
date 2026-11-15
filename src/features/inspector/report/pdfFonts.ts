import { jsPDF } from 'jspdf';
import dmSansRegular from '@/assets/fonts/DMSans_400Regular.ttf?inline';
import dmSansBold from '@/assets/fonts/DMSans_700Bold.ttf?inline';
import jetBrainsMonoRegular from '@/assets/fonts/JetBrainsMono_400Regular.ttf?inline';
import spaceGroteskBold from '@/assets/fonts/SpaceGrotesk_700Bold.ttf?inline';

/** body: DM Sans 400 · bodyBold: DM Sans 700 · heading: Space Grotesk 700 · mono: JetBrains Mono 400 */
export type PdfFace = 'body' | 'bodyBold' | 'heading' | 'mono';
/** Called with every string the renderer hands to the PDF, with the face it is written in. */
export type WriteObserver = (text: string, face: PdfFace) => void;

type FaceSpec = {
  readonly file: string;
  readonly family: string;
  readonly style: 'normal' | 'bold';
  readonly data: string;
};

const FACES: Readonly<Record<PdfFace, FaceSpec>> = {
  body: { file: 'DMSans_400Regular.ttf', family: 'DMSans', style: 'normal', data: dmSansRegular },
  bodyBold: { file: 'DMSans_700Bold.ttf', family: 'DMSans', style: 'bold', data: dmSansBold },
  heading: {
    file: 'SpaceGrotesk_700Bold.ttf',
    family: 'SpaceGrotesk',
    style: 'bold',
    data: spaceGroteskBold,
  },
  mono: {
    file: 'JetBrainsMono_400Regular.ttf',
    family: 'JetBrainsMono',
    style: 'normal',
    data: jetBrainsMonoRegular,
  },
};

export const PDF_FACE_NAMES = [
  'body',
  'bodyBold',
  'heading',
  'mono',
] as const satisfies readonly PdfFace[];

/** The TTF in `src/assets/fonts/` that each face embeds; the coverage test reads these files. */
export const PDF_FACE_FILES: Readonly<Record<PdfFace, string>> = {
  body: FACES.body.file,
  bodyBold: FACES.bodyBold.file,
  heading: FACES.heading.file,
  mono: FACES.mono.file,
};

/** A landscape A4 document in points with the four report faces embedded (FR-10). */
export function createPdfDocument(): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  for (const name of PDF_FACE_NAMES) {
    const face = FACES[name];
    doc.addFileToVFS(face.file, face.data.slice(face.data.indexOf(',') + 1));
    doc.addFont(face.file, face.family, face.style);
  }
  return doc;
}

export function setFace(doc: jsPDF, face: PdfFace): void {
  const spec = FACES[face];
  doc.setFont(spec.family, spec.style);
}

/** The AutoTable `font` and `fontStyle` that select a face. */
export function faceStyle(face: PdfFace): {
  readonly font: string;
  readonly fontStyle: 'normal' | 'bold';
} {
  const spec = FACES[face];
  return { font: spec.family, fontStyle: spec.style };
}

/** Wraps text to `width` points in a face and size. A word wider than the width is broken. */
export function wrapText(
  doc: jsPDF,
  text: string,
  width: number,
  face: PdfFace,
  size: number,
): string[] {
  setFace(doc, face);
  doc.setFontSize(size);
  // splitTextToSize is typed `any`; accept only a string[].
  const lines: unknown = doc.splitTextToSize(text.replace(/\r\n?/g, '\n'), width);
  if (
    !Array.isArray(lines) ||
    !lines.every((line: unknown): line is string => typeof line === 'string')
  ) {
    throw new Error('Could not lay out report text');
  }
  return lines;
}

/**
 * Code points every report face has a glyph for: printable ASCII, Latin-1 Supplement and Latin
 * Extended-A (minus the few points DM Sans or JetBrains Mono lack) and common punctuation.
 * `pdfFonts.test.ts` checks each range against the cmap of all four embedded TTFs.
 */
export const SUPPORTED_RANGES: readonly (readonly [number, number])[] = [
  [0x20, 0x7e],
  [0xa0, 0xac],
  [0xae, 0x107],
  [0x10a, 0x11b],
  [0x11e, 0x123],
  [0x126, 0x131],
  [0x136, 0x137],
  [0x139, 0x148],
  [0x14a, 0x15b],
  [0x15e, 0x165],
  [0x168, 0x17e],
  [0x2013, 0x2014],
  [0x2018, 0x2019],
  [0x201c, 0x201d],
  [0x2022, 0x2022],
  [0x2026, 0x2026],
];

const LINE_FEED = 0x0a;

function supported(codePoint: number): boolean {
  return (
    codePoint === LINE_FEED ||
    SUPPORTED_RANGES.some(([first, last]) => codePoint >= first && codePoint <= last)
  );
}

/**
 * jsPDF omits a character its embedded font cannot map, without a trace. The guard makes that
 * visible instead: every code point outside the repertoire becomes `?` and is counted, and CR and
 * CRLF become LF. The renderer reports the count in the footer.
 */
export type TextGuard = {
  readonly clean: (text: string) => string;
  readonly replaced: () => number;
};

export function createTextGuard(): TextGuard {
  let replaced = 0;
  return {
    clean: (text) =>
      Array.from(text.replace(/\r\n?/g, '\n'), (char) => {
        if (supported(char.codePointAt(0) ?? 0)) return char;
        replaced++;
        return '?';
      }).join(''),
    replaced: () => replaced,
  };
}
