export type RingState = 'done' | 'review' | 'not-scanned';
export type RingArc = {
  readonly state: RingState;
  readonly startDeg: number;
  readonly endDeg: number;
};

export const RING_GAP_DEG = 4;
export const RING_MAX_SEGMENTS = 30;

const STATE_ORDER = ['done', 'review', 'not-scanned'] as const satisfies readonly RingState[];

type Part = { readonly state: RingState; readonly weight: number };

// Angles are degrees clockwise from 12 o'clock. k arcs leave k gaps of RING_GAP_DEG (one after each arc,
// the last one wrapping to 0). One arc is a full circle: with nothing else drawn there is nothing to gap.
function layout(parts: readonly Part[]): readonly RingArc[] {
  if (parts.length === 0) return [];
  const only = parts[0];
  if (parts.length === 1 && only !== undefined)
    return [{ state: only.state, startDeg: 0, endDeg: 360 }];
  const usable = 360 - parts.length * RING_GAP_DEG;
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  let cursor = 0;
  return parts.map((part) => {
    const startDeg = cursor;
    const endDeg = startDeg + (usable * part.weight) / totalWeight;
    cursor = endDeg + RING_GAP_DEG;
    return { state: part.state, startDeg, endDeg };
  });
}

// One arc per check up to RING_MAX_SEGMENTS; above that, at most three arcs sized by count (FR-11).
export function ringArcs(segments: readonly RingState[]): readonly RingArc[] {
  if (segments.length <= RING_MAX_SEGMENTS) {
    return layout(segments.map((state) => ({ state, weight: 1 })));
  }
  return layout(
    STATE_ORDER.map((state) => ({
      state,
      weight: segments.filter((s) => s === state).length,
    })).filter((part) => part.weight > 0),
  );
}

const fmt = (value: number): string => String(Number(value.toFixed(3)));

function point(cx: number, cy: number, r: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${fmt(cx + r * Math.sin(rad))} ${fmt(cy - r * Math.cos(rad))}`;
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const radius = fmt(r);
  if (endDeg - startDeg >= 359.999) {
    const mid = point(cx, cy, r, startDeg + 180);
    const start = point(cx, cy, r, startDeg);
    return `M ${start} A ${radius} ${radius} 0 0 1 ${mid} A ${radius} ${radius} 0 0 1 ${start}`;
  }
  const large = endDeg - startDeg > 180 ? '1' : '0';
  return `M ${point(cx, cy, r, startDeg)} A ${radius} ${radius} 0 ${large} 1 ${point(cx, cy, r, endDeg)}`;
}
