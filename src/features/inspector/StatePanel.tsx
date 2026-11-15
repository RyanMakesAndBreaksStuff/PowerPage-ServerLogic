import type { ReactElement, ReactNode, Ref } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Tile } from '@/components/Tile';

type StatePanelProps = {
  icon: IconName;
  title: string;
  /** The page moves focus here after Retry or Scan again, whose button hides or unmounts (see `InspectorPage`). */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Plain text under the title. */
  text?: string;
  /** Marks a state that is still working, for assistive technology. */
  busy?: boolean;
  /** Actions that can complete; omit the prop rather than render a disabled stand-in. The one exception is the AC-7.8 Export report (D-17). */
  children?: ReactNode;
};

/** A full-page state of the Inspector: one icon, one title, one sentence and, when it helps, one action. */
export function StatePanel({
  icon,
  title,
  headingRef,
  text,
  busy = false,
  children,
}: StatePanelProps): ReactElement {
  return (
    <Tile className="inspector-state" aria-busy={busy ? true : undefined}>
      <Icon name={icon} size={28} />
      <h2 ref={headingRef} tabIndex={-1} className="inspector-state__title">
        {title}
      </h2>
      {text === undefined ? null : <p className="inspector-state__text">{text}</p>}
      {children}
    </Tile>
  );
}
