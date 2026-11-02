// Test-only: reads which code points a TrueType font maps to a glyph (cmap formats 4 and 12).
// Nothing in the application imports this file, so it is not part of the bundle.

function tableOffset(view: DataView, tag: string): number {
  const count = view.getUint16(4);
  for (let index = 0; index < count; index++) {
    const record = 12 + index * 16;
    const name = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3),
    );
    if (name === tag) return view.getUint32(record + 8);
  }
  throw new Error(`Font has no ${tag} table`);
}

function addFormat4(view: DataView, start: number, codePoints: Set<number>): void {
  const segmentsX2 = view.getUint16(start + 6);
  const ends = start + 14;
  const starts = ends + segmentsX2 + 2;
  const deltas = starts + segmentsX2;
  const ranges = deltas + segmentsX2;
  for (let segment = 0; segment < segmentsX2 / 2; segment++) {
    const first = view.getUint16(starts + segment * 2);
    const last = view.getUint16(ends + segment * 2);
    const delta = view.getInt16(deltas + segment * 2);
    const rangeOffset = view.getUint16(ranges + segment * 2);
    for (let code = first; code <= last && code !== 0xffff; code++) {
      const glyph =
        rangeOffset === 0
          ? (code + delta) & 0xffff
          : view.getUint16(ranges + segment * 2 + rangeOffset + (code - first) * 2);
      if (glyph !== 0) codePoints.add(code);
    }
  }
}

function addFormat12(view: DataView, start: number, codePoints: Set<number>): void {
  const groups = view.getUint32(start + 12);
  for (let group = 0; group < groups; group++) {
    const record = start + 16 + group * 12;
    if (view.getUint32(record + 8) === 0) continue;
    for (let code = view.getUint32(record); code <= view.getUint32(record + 4); code++) {
      codePoints.add(code);
    }
  }
}

export function cmapCodePoints(font: Uint8Array): ReadonlySet<number> {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const cmap = tableOffset(view, 'cmap');
  const codePoints = new Set<number>();
  for (let index = 0; index < view.getUint16(cmap + 2); index++) {
    const subtable = cmap + view.getUint32(cmap + 4 + index * 8 + 4);
    const format = view.getUint16(subtable);
    if (format === 4) addFormat4(view, subtable, codePoints);
    if (format === 12) addFormat12(view, subtable, codePoints);
  }
  return codePoints;
}
