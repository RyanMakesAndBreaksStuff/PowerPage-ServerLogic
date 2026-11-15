import { describe, expect, it } from 'vitest';
import { RING_GAP_DEG, RING_MAX_SEGMENTS, arcPath, ringArcs } from './ringGeometry';
import type { RingState } from './ringGeometry';

const many = (n: number, state: RingState): RingState[] => Array.from({ length: n }, () => state);
const sweep = (a: { startDeg: number; endDeg: number }): number => a.endDeg - a.startDeg;

describe('ringArcs, one arc per check up to 30', () => {
  it('draws nothing for no segments', () => {
    expect(ringArcs([])).toEqual([]);
  });

  it('draws a single segment as a full circle with no gap', () => {
    expect(ringArcs(['review'])).toEqual([{ state: 'review', startDeg: 0, endDeg: 360 }]);
  });

  it('splits three segments into 116 degree arcs separated by 4 degree gaps', () => {
    expect(ringArcs(['done', 'done', 'review'])).toEqual([
      { state: 'done', startDeg: 0, endDeg: 116 },
      { state: 'done', startDeg: 120, endDeg: 236 },
      { state: 'review', startDeg: 240, endDeg: 356 },
    ]);
  });

  it('puts a 4 degree gap between every pair of arcs, including the wrap back to 0', () => {
    for (const n of [2, 5, 12, 30]) {
      const arcs = ringArcs(many(n, 'done'));
      expect(arcs).toHaveLength(n);
      arcs.forEach((arc, i) => {
        const next = arcs[i + 1]?.startDeg ?? 360;
        expect(next - arc.endDeg).toBeCloseTo(RING_GAP_DEG, 9);
      });
    }
  });

  it('still draws one arc per check at the 30 check limit (8 degrees each)', () => {
    const arcs = ringArcs(many(RING_MAX_SEGMENTS, 'done'));
    expect(arcs).toHaveLength(30);
    expect(sweep(arcs[0] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo(8, 9);
  });

  it('keeps each segment in its position with its own state', () => {
    const states: RingState[] = ['done', 'not-scanned', 'review', 'done'];
    expect(ringArcs(states).map((a) => a.state)).toEqual(states);
  });
});

describe('ringArcs, proportional mode above 30', () => {
  it('switches to three arcs at 31 segments, sized by count, in done-review-not-scanned order', () => {
    const arcs = ringArcs([...many(20, 'done'), ...many(10, 'review'), 'not-scanned']);
    expect(arcs.map((a) => a.state)).toEqual(['done', 'review', 'not-scanned']);
    expect(sweep(arcs[0] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo((348 * 20) / 31, 6);
    expect(sweep(arcs[1] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo((348 * 10) / 31, 6);
    expect(sweep(arcs[2] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo(348 / 31, 6);
    const total = arcs.reduce((sum, a) => sum + sweep(a), 0);
    expect(total + arcs.length * RING_GAP_DEG).toBeCloseTo(360, 6);
  });

  it('omits empty arcs and puts gaps only between the arcs drawn', () => {
    const arcs = ringArcs([...many(35, 'done'), ...many(5, 'review')]);
    expect(arcs).toEqual([
      { state: 'done', startDeg: 0, endDeg: 308 },
      { state: 'review', startDeg: 312, endDeg: 356 },
    ]);
  });

  it('draws one gapless full circle when only one state is present', () => {
    expect(ringArcs(many(31, 'done'))).toEqual([{ state: 'done', startDeg: 0, endDeg: 360 }]);
  });

  it('never draws more than three arcs', () => {
    expect(
      ringArcs([...many(40, 'done'), ...many(40, 'review'), ...many(40, 'not-scanned')]),
    ).toHaveLength(3);
  });
});

describe('arcPath', () => {
  it('draws a quarter circle clockwise from 12 o clock', () => {
    expect(arcPath(50, 50, 40, 0, 90)).toBe('M 50 10 A 40 40 0 0 1 90 50');
  });

  it('sets the large-arc flag above 180 degrees', () => {
    expect(arcPath(50, 50, 40, 0, 270)).toBe('M 50 10 A 40 40 0 1 1 10 50');
  });

  it('draws a full circle as two half arcs, because one 360 degree arc has no direction', () => {
    expect(arcPath(50, 50, 40, 0, 360)).toBe('M 50 10 A 40 40 0 0 1 50 90 A 40 40 0 0 1 50 10');
  });
});
