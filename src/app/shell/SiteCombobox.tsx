import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '@/components/Icon';
import { useDisabledReason } from '@/components/useDisabledReason';
import { classNames } from '@/lib/classNames';
import './siteCombobox.css';

export type SiteOption = {
  id: string;
  label: string;
  /** Muted second line, for example the site's domain. */
  detail: string;
  /** An inactive site: listed and labelled, never selectable. */
  disabled: boolean;
};

export type SiteComboboxProps = {
  /** Accessible name of the control. */
  label: string;
  /** Shown while nothing is selected. */
  placeholder: string;
  options: readonly SiteOption[];
  selectedId: string | null;
  /** When set, the control is unavailable and explains why on hover and focus (F47). */
  unavailableReason: string | null;
  onSelect: (id: string) => void;
};

const TYPE_AHEAD_MS = 600;

/** APG type-ahead: a repeated letter cycles through matches; a longer string matches a prefix from the current option. */
function findMatch(options: readonly SiteOption[], from: number, typed: string): number {
  const query = typed.toLowerCase();
  const first = query.charAt(0);
  const cycle = query === first.repeat(query.length);
  const search = cycle ? first : query;
  const start = from + (cycle ? 1 : 0);
  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset) % options.length;
    if (options[index]?.label.toLowerCase().startsWith(search) === true) return index;
  }
  return -1;
}

/**
 * The title-bar site picker: the WAI-ARIA APG select-only combobox. Focus stays on the combobox and the
 * highlighted option is announced through aria-activedescendant. Arrow keys, Home, End and type-ahead only
 * move the highlight; Enter, Space and (after the highlight moved) Tab commit it, Escape and a click away
 * cancel. Inactive options can be highlighted so they can be read, but never committed.
 */
export function SiteCombobox({
  label,
  placeholder,
  options,
  selectedId,
  unavailableReason,
  onSelect,
}: SiteComboboxProps): ReactElement {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typing = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const { triggerProps, tooltip } = useDisabledReason(unavailableReason);

  const unavailable = unavailableReason !== null;
  const expanded = open && !unavailable && options.length > 0;
  const last = options.length - 1;
  const activeIndex = Math.min(active, Math.max(last, 0));
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const selected = selectedIndex < 0 ? null : (options[selectedIndex] ?? null);
  const shownLabel = selected?.label ?? null;
  const optionId = (index: number): string => `${baseId}-option-${String(index)}`;

  const firstEnabled = (): number => {
    const index = options.findIndex((option) => !option.disabled);
    return index < 0 ? 0 : index;
  };
  const openAt = (index: number, navigated = false): void => {
    setActive(index);
    setMoved(navigated);
    setOpen(true);
  };
  const move = (index: number): void => {
    setActive(index);
    setMoved(true);
  };
  const commit = (index: number): void => {
    const option = options[index];
    if (option === undefined || option.disabled) return;
    setOpen(false);
    if (option.id !== selectedId) onSelect(option.id);
  };

  useEffect(() => {
    if (!expanded) return;
    const dismissOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [expanded]);

  useEffect(() => {
    const list = listRef.current;
    const option = expanded ? list?.children.item(activeIndex) : null;
    if (list === null || !(option instanceof HTMLElement)) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [expanded, activeIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!expanded) {
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          event.preventDefault();
          openAt(selectedIndex < 0 ? firstEnabled() : selectedIndex);
          return;
        case 'Home':
          event.preventDefault();
          openAt(0, true);
          return;
        case 'End':
          event.preventDefault();
          openAt(Math.max(last, 0), true);
          return;
        default:
          break;
      }
    } else {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(Math.min(activeIndex + 1, last));
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (event.altKey) commit(activeIndex);
          else move(Math.max(activeIndex - 1, 0));
          return;
        case 'Home':
          event.preventDefault();
          move(0);
          return;
        case 'End':
          event.preventDefault();
          move(last);
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          commit(activeIndex);
          return;
        case 'Escape':
          event.preventDefault();
          setOpen(false);
          return;
        case 'Tab':
          // Focus moves on; a highlight the user never moved is not a choice.
          if (moved) commit(activeIndex);
          else setOpen(false);
          return;
        default:
          break;
      }
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    const now = Date.now();
    const text = now - typing.current.at > TYPE_AHEAD_MS ? event.key : typing.current.text + event.key;
    typing.current = { text, at: now };
    const match = findMatch(options, expanded ? activeIndex : Math.max(selectedIndex, 0), text);
    if (match < 0) return;
    event.preventDefault();
    if (expanded) move(match);
    else openAt(match, true);
  };

  const behaviour = unavailable
    ? triggerProps
    : {
        onKeyDown,
        onBlur: () => {
          setOpen(false);
        },
        onClick: () => {
          if (expanded) setOpen(false);
          else openAt(selectedIndex < 0 ? firstEnabled() : selectedIndex);
        },
      };

  return (
    <div className="site-combobox" ref={rootRef}>
      <span className="ui-reason-anchor">
        <div
          {...behaviour}
          role="combobox"
          tabIndex={0}
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded ? optionId(activeIndex) : undefined}
          aria-disabled={unavailable ? true : undefined}
          title={shownLabel ?? undefined}
          className={classNames(
            'site-combobox__trigger',
            shownLabel !== null && 'site-combobox__trigger--selected',
          )}
        >
          <span className="site-combobox__label">{shownLabel ?? placeholder}</span>
          <Icon name="chevron-down" size={12} />
        </div>
        {tooltip}
      </span>
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        hidden={!expanded}
        className="site-combobox__list"
        onMouseDown={(event) => {
          // Keep focus on the combobox while the pointer picks an option.
          event.preventDefault();
        }}
      >
        {options.map((option, index) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox owns keyboard operation (APG select-only)
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={option.id === selectedId}
            aria-disabled={option.disabled ? true : undefined}
            data-active={expanded && index === activeIndex}
            className={classNames(
              'site-combobox__option',
              option.disabled && 'site-combobox__option--disabled',
            )}
            onClick={() => {
              commit(index);
            }}
          >
            <span className="site-combobox__name" title={option.label}>
              {option.label}
            </span>
            <span className="site-combobox__detail">{option.detail}</span>
            {option.disabled ? <span className="site-combobox__tag">Inactive</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
