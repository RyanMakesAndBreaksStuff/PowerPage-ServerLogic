import type { ReactElement } from 'react';
import { normalizeReason, useDisabledReason } from './useDisabledReason';
import './primitives.css';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** F47: a blocked choice stays focusable (aria-disabled, not disabled) and explains itself on hover and focus. */
  disabledReason?: string | null;
};

export function Checkbox({ label, checked, onChange, disabledReason }: CheckboxProps): ReactElement {
  const reason = normalizeReason(disabledReason);
  const { triggerProps, tooltip } = useDisabledReason(reason);
  return (
    <span className="ui-reason-anchor">
      <label className="ui-checkbox" aria-disabled={reason === null ? undefined : true}>
        <input
          {...triggerProps}
          type="checkbox"
          checked={checked}
          aria-disabled={reason === null ? undefined : true}
          onChange={(event) => {
            if (reason === null) onChange(event.currentTarget.checked);
          }}
        />
        {label}
      </label>
      {tooltip}
    </span>
  );
}
