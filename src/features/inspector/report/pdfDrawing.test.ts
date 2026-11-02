import { describe, expect, it, vi } from 'vitest';
import { RING_GAP_DEG, ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';
import { REPORT_PALETTE, drawCheckmark, drawRing, ringColor } from './pdfDrawing';
import { createPdfDocument } from './pdfFonts';

function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].toSorted((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const many = (count: number, state: RingState): RingState[] =>
  Array.from({ length: count }, () => state);

describe('report palette', () => {
  it('holds the handoff colours with the A8 adjustments', () => {
    expect(REPORT_PALETTE).toMatchObject({
      ink: '#14213d',
      muted: '#55607a',
      rules: '#dfe4ee',
      blueChip: '#1e6dcd',
      blueTint: '#eaf2fd',
      orange: '#b05408',
      orangeTint: '#fdf0e3',
    });
  });

  it('keeps every text pair at 4.5:1 or better', () => {
    const { white, ink, muted, blueChip, blueTint, orange, orangeTint, grey, greyTint } =
      REPORT_PALETTE;
    for (const [foreground, background] of [
      [ink, white],
      [muted, white],
      [blueChip, white],
      [orange, white],
      [blueChip, blueTint],
      [orange, orangeTint],
      [ink, orangeTint],
      [muted, greyTint],
    ] as const) {
      expect(
        contrast(foreground, background),
        `${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // The ring grey is a graphic, not text.
    expect(contrast(grey, white)).toBeGreaterThanOrEqual(2.5);
  });

  it('colours ring states blue, orange and grey', () => {
    expect([ringColor('done'), ringColor('review'), ringColor('not-scanned')]).toEqual([
      REPORT_PALETTE.blue,
      REPORT_PALETTE.orange,
      REPORT_PALETTE.grey,
    ]);
  });
});

describe('drawCheckmark', () => {
  it('is a three-point vector path and writes no text', () => {
    const doc = createPdfDocument();
    const moveTo = vi.spyOn(doc, 'moveTo');
    const lineTo = vi.spyOn(doc, 'lineTo');
    const stroke = vi.spyOn(doc, 'stroke');
    const text = vi.spyOn(doc, 'text');
    drawCheckmark(doc, 10, 20, 10, REPORT_PALETTE.blueChip);
    expect(moveTo.mock.calls).toEqual([[10, 25.5]]);
    expect(lineTo.mock.calls).toHaveLength(2);
    expect(lineTo.mock.calls[0]?.[0]).toBeCloseTo(13.8);
    expect(lineTo.mock.calls[1]).toEqual([20, 21]);
    expect(stroke).toHaveBeenCalledTimes(1);
    expect(text).not.toHaveBeenCalled();
  });
});

describe('drawRing', () => {
  const cx = 100;
  const cy = 100;
  const radius = 40;
  const at = (degrees: number): [number, number] => [
    cx + radius * Math.sin((degrees * Math.PI) / 180),
    cy - radius * Math.cos((degrees * Math.PI) / 180),
  ];

  function draw(segments: readonly RingState[]) {
    const doc = createPdfDocument();
    const moveTo = vi.spyOn(doc, 'moveTo');
    const curveTo = vi.spyOn(doc, 'curveTo');
    const stroke = vi.spyOn(doc, 'stroke');
    const color = vi.spyOn(doc, 'setDrawColor');
    drawRing(doc, cx, cy, radius, 10, segments);
    return { moveTo, curveTo, stroke, color };
  }

  it('draws one arc per check with the 4 degree gap, each Bezier at most 90 degrees', () => {
    const segments = [...many(6, 'done'), ...many(3, 'review')];
    const { moveTo, curveTo, stroke, color } = draw(segments);
    const arcs = ringArcs(segments);
    expect(arcs).toHaveLength(9);
    expect(moveTo).toHaveBeenCalledTimes(9);
    expect(curveTo).toHaveBeenCalledTimes(9);
    expect(stroke).toHaveBeenCalledTimes(9);
    expect(color.mock.calls.map(([value]) => value)).toEqual([
      ...many(6, 'done').map(ringColor),
      ...many(3, 'review').map(ringColor),
    ]);
    for (const [index, arc] of arcs.entries()) {
      const [x, y] = at(arc.startDeg);
      expect(moveTo.mock.calls[index]?.[0]).toBeCloseTo(x, 3);
      expect(moveTo.mock.calls[index]?.[1]).toBeCloseTo(y, 3);
      const next = arcs[index + 1];
      if (next !== undefined) expect(next.startDeg - arc.endDeg).toBeCloseTo(RING_GAP_DEG, 6);
    }
  });

  it('splits arcs wider than 90 degrees and lands each on its end angle', () => {
    const segments = many(3, 'done');
    const { curveTo } = draw(segments);
    const arcs = ringArcs(segments);
    let drawn = 0;
    for (const arc of arcs) {
      drawn += Math.ceil((arc.endDeg - arc.startDeg) / 90);
      const last = curveTo.mock.calls[drawn - 1];
      const [x, y] = at(arc.endDeg);
      expect(last?.[4]).toBeCloseTo(x, 3);
      expect(last?.[5]).toBeCloseTo(y, 3);
    }
    expect(curveTo).toHaveBeenCalledTimes(drawn);
    expect(drawn).toBe(6);
  });

  it('draws a single check as a full circle in four quarter arcs', () => {
    const { moveTo, curveTo } = draw(['done']);
    expect(moveTo).toHaveBeenCalledTimes(1);
    expect(curveTo).toHaveBeenCalledTimes(4);
    expect(curveTo.mock.calls[3]?.[4]).toBeCloseTo(cx, 3);
    expect(curveTo.mock.calls[3]?.[5]).toBeCloseTo(cy - radius, 3);
  });

  it('falls back to at most three proportional arcs above 30 checks', () => {
    const { moveTo, color } = draw([
      ...many(20, 'done'),
      ...many(6, 'review'),
      ...many(5, 'not-scanned'),
    ]);
    expect(moveTo).toHaveBeenCalledTimes(3);
    expect(color.mock.calls.map(([value]) => value)).toEqual([
      REPORT_PALETTE.blue,
      REPORT_PALETTE.orange,
      REPORT_PALETTE.grey,
    ]);
  });

  it('draws nothing for no checks', () => {
    const { moveTo, stroke } = draw([]);
    expect(moveTo).not.toHaveBeenCalled();
    expect(stroke).not.toHaveBeenCalled();
  });
});
