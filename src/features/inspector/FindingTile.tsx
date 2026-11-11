import type { ReactElement } from 'react';
import { checkStatusBadge } from './checkStatusBadge';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import type { CheckStatus, Finding } from '@/types/inspector';
import { CHECK_COPY } from './model/copy';
import { plain } from './pageCopy';

const GLYPH = {
  configured: 'checkmark',
  reviewed: 'checkmark',
  'needs-review': 'important',
  'not-scanned': 'subtract',
} as const satisfies Record<CheckStatus, IconName>;

export type FindingTileProps = {
  finding: Finding;
  /** Which of the three grid cells the tile takes (layout 10a): 0, 1 or 2. */
  slot: number;
  selected: boolean;
  onSelect: () => void;
};

/** One finding (AC-8.2): icon, title, one-line summary and a status that always carries a glyph and a word. */
export function FindingTile({ finding, slot, selected, onSelect }: FindingTileProps): ReactElement {
  return (
    <Tile
      className={classNames(
        'inspector-finding',
        `inspector-finding--slot-${String(slot)}`,
        `inspector-finding--${finding.status}`,
      )}
      data-selected={selected}
    >
      <button
        type="button"
        className="inspector-finding__button"
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="inspector-finding__icon" aria-hidden="true">
          <Icon name={GLYPH[finding.status]} size={16} />
        </span>
        <span className="inspector-finding__title">{CHECK_COPY[finding.check].title}</span>
        <span className="inspector-finding__summary">{plain(finding.summary)}</span>
        <StatusBadge {...checkStatusBadge(finding.status)} />
      </button>
    </Tile>
  );
}
