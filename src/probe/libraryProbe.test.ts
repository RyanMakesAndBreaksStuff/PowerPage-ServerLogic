// @vitest-environment node
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildProbePdf, buildProbeZip, createProbeState, parseProbe } from '@/probe/libraryProbe';

function ascii(bytes: Uint8Array, count: number): string {
  return String.fromCharCode(...bytes.slice(0, count));
}

describe('library probe', () => {
  it('writes a PDF with an embedded TTF font and an autotable', () => {
    const pdf = buildProbePdf();
    expect(ascii(pdf, 5)).toBe('%PDF-');
    // Text alone is about 3 KB; the embedded DM Sans font and the table make it much larger.
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  it('writes a zip that round-trips', () => {
    const zip = buildProbeZip('const a = 1;');
    expect(ascii(zip, 2)).toBe('PK');
    const entry = unzipSync(zip)['probe.js'];
    expect(entry === undefined ? null : strFromU8(entry)).toBe('const a = 1;');
  });

  it('parses ECMAScript 2023 with acorn', () => {
    expect(parseProbe('const a = 1;')).toBe('Program');
  });

  it('creates a CodeMirror state with the JavaScript language', () => {
    expect(createProbeState('const a = 1;\n').doc.lines).toBe(2);
  });
});
