import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { useView } from '@/app/useView';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { planInsertion } from '@/lib/code-analysis/structure';
import { INSERT_REASONS, cursorAfter } from './insertion';

/**
 * AC-6.8: inserts the sample into the server pane as one `applyChanges` (insertion and `async` together), keeps the
 * cursor after it and switches to Logic Starter, where Browser checks re-run from the new text. When the plan fails,
 * the button stays focusable with the reason (`aria-disabled`, AC-2.10) and Copy still works.
 */
export function InsertButton({ sample }: { sample: string }): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const [, setView] = useView();
  const plan = planInsertion(state.serverText, sample, state.cursor, derived.fn);

  const insert = (): void => {
    if (!plan.ok) return;
    dispatch({ type: 'applyChanges', changes: plan.changes, cursor: cursorAfter(plan.changes) });
    setView('starter');
  };

  return (
    <Button
      variant="primary"
      disabledReason={plan.ok ? null : INSERT_REASONS[plan.reason]}
      onClick={insert}
    >
      <Icon name="add" size={14} />
      Insert into handler
    </Button>
  );
}
