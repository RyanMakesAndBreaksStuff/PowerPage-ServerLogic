import type { ReactElement, ReactNode } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { checklistLines, getRecipe } from '@/services/catalogue/recipes';

// Catalogue notes mark table names with backticks; the text is fixed catalogue data, never user input.
function codeSpans(text: string): ReactNode[] {
  return text.split('`').map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className="ui-mono">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

/** The note tile (AC-5.5) with the self-reported Permissions review (AC-5.4, F13, F15). */
export function PermissionNote(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const recipe = getRecipe(state.recipe);
  const reviewed = derived.readiness.permissions;
  return (
    <Tile role="region" aria-label="Permissions note" className="starter-page__note">
      <div className="starter-note__row">
        <StatusBadge kind={reviewed ? 'ok' : 'review'} label="Permissions" />
        <p className="starter-note__text">{codeSpans(recipe.permissionNote)}</p>
        {reviewed ? (
          <Button
            onClick={() => {
              dispatch({ type: 'undoReview' });
            }}
          >
            <Icon name="arrow-undo" />
            Undo review
          </Button>
        ) : (
          <Button
            onClick={() => {
              dispatch({ type: 'markReviewed' });
            }}
          >
            <Icon name="checkmark" />
            Mark checklist reviewed
          </Button>
        )}
      </div>
      <details className="starter-note__checklist">
        <summary>View checklist</summary>
        <p>For the {recipe.name} recipe. Review anything you&apos;ve added.</p>
        <ul>
          {checklistLines(recipe).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </Tile>
  );
}
