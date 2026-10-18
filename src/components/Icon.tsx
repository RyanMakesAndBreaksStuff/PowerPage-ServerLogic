import type { ReactElement } from 'react';
import { ICONS } from './icons';
import type { IconName } from './icons';
import './primitives.css';

export type IconProps = { name: IconName; size?: number; title?: string };

// The Fluent component sets aria-hidden, or role="img" plus aria-label when given a title.
export function Icon({ name, size = 16, title }: IconProps): ReactElement {
  const Glyph = ICONS[name];
  return (
    <Glyph
      className="ui-icon"
      style={{ width: size, height: size }}
      focusable="false"
      {...(title === undefined ? {} : { title })}
    />
  );
}
