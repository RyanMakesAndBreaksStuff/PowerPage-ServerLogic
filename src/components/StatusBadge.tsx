import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Pill } from './Pill';
import type { PillTone } from './Pill';

export type BadgeKind = 'ok' | 'review' | 'unknown';
export type StatusBadgeProps = { kind: BadgeKind; label: string };

const GLYPH = {
  ok: 'checkmark',
  review: 'important',
  unknown: 'subtract',
} as const satisfies Record<BadgeKind, IconName>;
const TONE = { ok: 'ok', review: 'review', unknown: 'neutral' } as const satisfies Record<
  BadgeKind,
  PillTone
>;

// Status is never colour alone (FR-11): a glyph and a word always travel with the tone.
export function StatusBadge({ kind, label }: StatusBadgeProps): ReactElement {
  return (
    <Pill tone={TONE[kind]}>
      <span className="ui-badge__glyph" data-glyph={kind} aria-hidden="true">
        <Icon name={GLYPH[kind]} size={12} />
      </span>
      {label}
    </Pill>
  );
}
