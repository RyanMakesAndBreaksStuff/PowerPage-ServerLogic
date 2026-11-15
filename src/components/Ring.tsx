import type { ReactElement } from 'react';
import { arcPath, ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';
import './primitives.css';

export type RingProps = { segments: readonly RingState[]; label: string; size?: number };

const STROKE = 10;

// The text count is always rendered (FR-11): the ring is never the only carrier of the status.
export function Ring({ segments, label, size = 78 }: RingProps): ReactElement {
  const total = segments.length;
  const done = segments.filter((s) => s === 'done').length;
  const center = size / 2;
  const radius = (size - STROKE) / 2;
  return (
    <div
      className="ui-ring"
      role="img"
      aria-label={`${String(done)} of ${String(total)} ${label}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        width={size}
        height={size}
        aria-hidden="true"
      >
        {ringArcs(segments).map((arc) => (
          <path
            key={`${arc.state}-${String(arc.startDeg)}`}
            className={`ui-ring__arc ui-ring__arc--${arc.state}`}
            data-state={arc.state}
            d={arcPath(center, center, radius, arc.startDeg, arc.endDeg)}
            strokeWidth={STROKE}
          />
        ))}
      </svg>
      <div className="ui-ring__text">
        <span className="ui-ring__count" style={{ fontSize: Math.round(size / 4) }}>
          {done}/{total}
        </span>
        <span className="ui-ring__label" style={{ fontSize: Math.max(9, Math.round(size / 7.8)) }}>
          {label}
        </span>
      </div>
    </div>
  );
}
