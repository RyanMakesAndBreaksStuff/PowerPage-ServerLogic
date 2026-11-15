import type { ComponentProps, ReactElement } from 'react';
import { classNames } from '@/lib/classNames';
import { normalizeReason, useDisabledReason } from './useDisabledReason';
import './primitives.css';

// The tooltip handlers are owned by the button, so they are not accepted from the caller.
export type ButtonProps = Omit<
  ComponentProps<'button'>,
  'disabled' | 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onKeyDown'
> & {
  variant?: 'primary' | 'ghost';
  disabledReason?: string | null;
  busy?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = 'ghost',
  disabledReason,
  busy = false,
  fullWidth = false,
  type = 'button',
  className,
  onClick,
  children,
  ...rest
}: ButtonProps): ReactElement {
  const reason = normalizeReason(disabledReason);
  const { triggerProps, tooltip } = useDisabledReason(reason);
  return (
    <span className={classNames('ui-reason-anchor', fullWidth && 'ui-reason-anchor--block')}>
      <button
        {...rest}
        {...triggerProps}
        type={type}
        className={classNames(
          'ui-button',
          `ui-button--${variant}`,
          fullWidth && 'ui-button--block',
          className,
        )}
        disabled={busy}
        aria-busy={busy ? true : undefined}
        aria-disabled={reason === null ? undefined : true}
        onClick={reason === null ? onClick : undefined}
      >
        {children}
      </button>
      {tooltip}
    </span>
  );
}
