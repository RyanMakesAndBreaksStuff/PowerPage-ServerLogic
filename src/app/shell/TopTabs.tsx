import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { classNames } from '@/lib/classNames';
import type { View } from '@/types/http';

const TABS = [
  { view: 'starter', label: 'Logic Starter', icon: 'code' },
  { view: 'objects', label: 'Server Objects', icon: 'cube' },
  { view: 'inspector', label: 'Logic Inspector', icon: 'target' },
] as const satisfies readonly { view: View; label: string; icon: IconName }[];

type TopTabsProps ={
  view: View;
  released: readonly View[];
  onSelect: (view: View) => void;
};

// APG tabs with automatic activation; an unreleased tab takes focus but is never selected (AC-1.7).
export function TopTabs({ view, released, onSelect }: TopTabsProps): ReactElement {
  const select = (target: View): void => {
    if (released.includes(target)) onSelect(target);
  };

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const last = TABS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      const target = TABS[next];
      if (target === undefined) return;
      document.getElementById(`tab-${target.view}`)?.focus();
      select(target.view);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const current = TABS[index];
      if (current !== undefined) select(current.view);
    }
  }

  return (
    <div role="tablist" aria-label="Pages" className="shell__tabs">
      {TABS.map((tab, index) => {
        const isReleased = released.includes(tab.view);
        const selected = tab.view === view;
        return (
          <button
            key={tab.view}
            id={`tab-${tab.view}`}
            type="button"
            role="tab"
            className={classNames('shell__tab', selected && 'shell__tab--selected')}
            aria-selected={selected}
            aria-controls={isReleased ? `panel-${tab.view}` : undefined}
            aria-disabled={isReleased ? undefined : true}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              select(tab.view);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
          >
            <span className={`shell__tab-icon shell__tab-icon--${tab.view}`}>
              <Icon name={tab.icon} size={14} />
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
