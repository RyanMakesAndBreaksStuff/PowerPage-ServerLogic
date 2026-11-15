import { useRef, useState } from 'react';
import type { FocusEvent, ReactElement } from 'react';
import { classNames } from '@/lib/classNames';
import { normalizeReason, useDisabledReason } from './useDisabledReason';
import './primitives.css';

export type PillOption<V extends string> = {
  value: V;
  label: string;
  disabledReason?: string | null;
};
export type PillGroupProps<V extends string> = {
  label: string;
  options: readonly PillOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  compact?: boolean;
};

// APG radio group keys: arrows move focus and select, wrapping at both ends; Home and End jump.
function targetIndex(key: string, from: number, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return from === last ? 0 : from + 1;
    case 'ArrowLeft':
    case 'ArrowUp':
      return from === 0 ? last : from - 1;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}

type PillRadioProps = {
  label: string;
  checked: boolean;
  tabbable: boolean;
  reason: string | null;
  compact: boolean;
  onSelect: () => void;
  onFocusRadio: () => void;
  onNavigate: (key: string) => boolean;
};

function PillRadio({
  label,
  checked,
  tabbable,
  reason,
  compact,
  onSelect,
  onFocusRadio,
  onNavigate,
}: PillRadioProps): ReactElement {
  const { triggerProps, tooltip } = useDisabledReason(reason);
  const { onKeyDown: reasonKeyDown, onFocus: reasonFocus, ...reasonRest } = triggerProps;
  return (
    <span className="ui-reason-anchor">
      <button
        {...reasonRest}
        type="button"
        role="radio"
        aria-checked={checked}
        aria-disabled={reason === null ? undefined : true}
        tabIndex={tabbable ? 0 : -1}
        className={classNames(
          'ui-pill',
          'ui-pill--control',
          checked && 'ui-pill--selected',
          compact && 'ui-pill--compact',
        )}
        onClick={onSelect}
        onFocus={(event) => {
          reasonFocus?.(event);
          onFocusRadio();
        }}
        onKeyDown={(event) => {
          reasonKeyDown?.(event);
          if (onNavigate(event.key)) event.preventDefault();
        }}
      >
        {label}
      </button>
      {tooltip}
    </span>
  );
}

export function PillGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: PillGroupProps<V>): ReactElement {
  const groupRef = useRef<HTMLDivElement>(null);
  const [roving, setRoving] = useState<V | null>(null);

  const tabbable = (
    options.find((o) => o.value === roving) ??
    options.find((o) => o.value === value) ??
    options.find((o) => normalizeReason(o.disabledReason) === null) ??
    options[0]
  )?.value;

  const select = (option: PillOption<V>): void => {
    if (normalizeReason(option.disabledReason) === null) onChange(option.value);
  };

  const navigate = (from: number, key: string): boolean => {
    const to = targetIndex(key, from, options.length);
    const option = to === null ? undefined : options[to];
    if (to === null || option === undefined) return false;
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus();
    select(option);
    return true;
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const next = event.relatedTarget;
    if (!(next instanceof Node && event.currentTarget.contains(next))) setRoving(null);
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className="ui-pill-group"
      onBlur={onBlur}
    >
      {options.map((option, index) => (
        <PillRadio
          key={option.value}
          label={option.label}
          checked={option.value === value}
          tabbable={option.value === tabbable}
          reason={normalizeReason(option.disabledReason)}
          compact={compact}
          onSelect={() => {
            select(option);
          }}
          onFocusRadio={() => {
            setRoving(option.value);
          }}
          onNavigate={(key) => navigate(index, key)}
        />
      ))}
    </div>
  );
}
