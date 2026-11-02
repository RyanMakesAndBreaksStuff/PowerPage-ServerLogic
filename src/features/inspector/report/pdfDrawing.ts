import type { jsPDF } from 'jspdf';
import { ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';

export const PAGE_MARGIN = 36;

// Original handoff report palette with the A8 adjustments: orange text #b05408, blue chip #1e6dcd.
export const REPORT_PALETTE = {
  ink: '#14213d',
  muted: '#55607a',
  rules: '#dfe4ee',
  head: '#f6f8fc',
  blue: '#1f6fd1',
  blueChip: '#1e6dcd',
  blueTint: '#eaf2fd',
  orange: '#b05408',
  orangeTint: '#fdf0e3',
  grey: '#9aa3b5',
  greyTint: '#eef0f4',
  white: '#ffffff',
} as const;

export function ringColor(state: RingState): string {
  switch (state) {
    case 'done':
      return REPORT_PALETTE.blue;
    case 'review':
      return REPORT_PALETTE.orange;
    case 'not-scanned':
      return REPORT_PALETTE.grey;
  }
}

/** The `✓` status glyph: a three-point vector path. Neither DM Sans nor Space Grotesk has U+2713. */
export function drawCheckmark(doc: jsPDF, x: number, y: number, size: number, color: string): void {
  doc
    .setDrawColor(color)
    .setLineWidth(size * 0.2)
    .setLineCap('round')
    .setLineJoin('round');
  doc
    .moveTo(x, y + size * 0.55)
    .lineTo(x + size * 0.38, y + size * 0.9)
    .lineTo(x + size, y + size * 0.1)
    .stroke();
}

/** Status ring from `ringArcs`: clockwise from 12 o'clock, gaps kept, cubic arcs of at most 90 degrees. */
export function drawRing(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  segments: readonly RingState[],
): void {
  doc.setLineWidth(thickness).setLineCap('butt');
  for (const arc of ringArcs(segments)) {
    doc.setDrawColor(ringColor(arc.state));
    let start = (arc.startDeg * Math.PI) / 180;
    const end = (arc.endDeg * Math.PI) / 180;
    doc.moveTo(cx + radius * Math.sin(start), cy - radius * Math.cos(start));
    while (start < end - 1e-8) {
      const next = Math.min(end, start + Math.PI / 2);
      const k = (4 / 3) * Math.tan((next - start) / 4);
      doc.curveTo(
        cx + radius * (Math.sin(start) + k * Math.cos(start)),
        cy - radius * (Math.cos(start) - k * Math.sin(start)),
        cx + radius * (Math.sin(next) - k * Math.cos(next)),
        cy - radius * (Math.cos(next) + k * Math.sin(next)),
        cx + radius * Math.sin(next),
        cy - radius * Math.cos(next),
      );
      start = next;
    }
    doc.stroke();
  }
}

export function drawDot(doc: jsPDF, x: number, y: number, radius: number, color: string): void {
  doc.setFillColor(color).circle(x, y, radius, 'F');
}

export function drawCheckbox(doc: jsPDF, x: number, y: number, size: number, color: string): void {
  doc.setDrawColor(color).setLineWidth(0.8).rect(x, y, size, size, 'S');
}
