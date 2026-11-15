import { useId, useState } from 'react';
import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactElement,
} from 'react';
import { DisabledReason } from './DisabledReason';

export type ReasonTriggerProps = {
  readonly 'aria-describedby'?: string;
  readonly onMouseEnter?: MouseEventHandler<HTMLElement>;
  readonly onMouseLeave?: MouseEventHandler<HTMLElement>;
  readonly onFocus?: FocusEventHandler<HTMLElement>;
  readonly onBlur?: FocusEventHandler<HTMLElement>;
  readonly onKeyDown?: KeyboardEventHandler<HTMLElement>;
};

export function normalizeReason(reason: string | null | undefined): string | null {
  return reason === undefined || reason === null || reason === '' ? null : reason;
}

// F47: a blocked choice stays focusable (aria-disabled, not disabled) and explains itself on hover and focus.
// Spread triggerProps on the focusable trigger and render tooltip next to it inside .ui-reason-anchor.
export function useDisabledReason(reason: string | null): {
  triggerProps: ReasonTriggerProps;
  tooltip: ReactElement | null;
} {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (reason === null) return { triggerProps: {}, tooltip: null };
  return {
    triggerProps: {
      'aria-describedby': id,
      onMouseEnter: () => {
        setHovered(true);
        setDismissed(false);
      },
      onMouseLeave: () => {
        setHovered(false);
      },
      onFocus: () => {
        setFocused(true);
        setDismissed(false);
      },
      onBlur: () => {
        setFocused(false);
      },
      onKeyDown: (event) => {
        if (event.key === 'Escape') setDismissed(true);
      },
    },
    tooltip: <DisabledReason id={id} text={reason} visible={(hovered || focused) && !dismissed} />,
  };
}
