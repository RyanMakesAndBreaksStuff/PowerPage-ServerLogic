import type { ComponentProps, ReactElement } from 'react';
import { classNames } from '@/lib/classNames';
import './primitives.css';

export type PillTone = 'neutral' | 'selected' | 'ok' | 'review' | 'server';
export type PillProps = ComponentProps<'span'> & {
  tone?: PillTone;
  compact?: boolean;
  mono?: boolean;
};

export function Pill({
  tone = 'neutral',
  compact = false,
  mono = false,
  className,
  ...rest
}: PillProps): ReactElement {
  return (
    <span
      {...rest}
      className={classNames(
        'ui-pill',
        `ui-pill--${tone}`,
        compact && 'ui-pill--compact',
        mono && 'ui-pill--mono',
        className,
      )}
    />
  );
}
