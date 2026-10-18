import type { ReactElement } from 'react';
import './primitives.css';

export type DisabledReasonProps = { id: string; text: string; visible: boolean };

// The tooltip stays in the DOM so aria-describedby always resolves; CSS hides it until hover or focus.
export function DisabledReason({ id, text, visible }: DisabledReasonProps): ReactElement {
  return (
    <span id={id} role="tooltip" className="ui-reason" data-visible={visible}>
      {text}
    </span>
  );
}
