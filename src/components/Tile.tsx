import { useId } from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { classNames } from '@/lib/classNames';
import './primitives.css';

export type TileProps = ComponentProps<'div'> & {
  heading?: string;
  aside?: ReactNode;
  flush?: boolean;
};

// A glass tile (dark) or white tile (light). With a heading it is a named region; aside shows only with a heading.
export function Tile({
  heading,
  aside,
  flush = false,
  className,
  children,
  ...rest
}: TileProps): ReactElement {
  const headingId = useId();
  return (
    <div
      {...rest}
      {...(heading === undefined ? {} : { role: 'region', 'aria-labelledby': headingId })}
      className={classNames('ui-tile', flush && 'ui-tile--flush', className)}
    >
      {heading === undefined ? null : (
        <div className="ui-tile__head">
          <div id={headingId} className="ui-tile__label">
            {heading}
          </div>
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}
