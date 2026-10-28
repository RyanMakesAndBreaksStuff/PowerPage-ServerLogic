import { Fragment, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { PillGroup } from '@/components/PillGroup';
import { Ring } from '@/components/Ring';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { useDisabledReason } from '@/components/useDisabledReason';
import { classNames } from '@/lib/classNames';
import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
import type { RecipeId } from '@/types/recipe';
import { RecipeCombobox } from './RecipeCombobox';
import { collisionNote, EDITED_VALIDATION_NOTE, methodOptions } from './starterOptions';

function LogicNameTile(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const helpId = useId();
  const note = derived.slugDiffers ? collisionNote(derived.slug) : null;
  return (
    <Tile heading="Logic name">
      <input
        className="starter-field ui-mono"
        aria-label="Logic name"
        aria-describedby={helpId}
        value={state.name}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          dispatch({ type: 'setName', name: event.target.value });
        }}
      />
      {/* Clamped to two lines; the full text stays in the title and the input's description. */}
      <p id={helpId} className="starter-help starter-help--clamp" title={note ?? undefined}>
        File <span className="ui-mono">{derived.slug}.js</span>
        {note === null ? null : ` ${note}`}
      </p>
    </Tile>
  );
}

function MethodTile(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const recipe = getRecipe(state.recipe);
  const several = recipe.functions.length > 1;
  return (
    <Tile heading="HTTP method">
      <PillGroup
        label="HTTP method"
        options={methodOptions(recipe)}
        value={state.method}
        onChange={(method) => {
          dispatch({ type: 'setMethod', method });
        }}
      />
      <p className="starter-help">
        {recipe.id === 'R8' ? 'Liquid only · ' : null}
        Exports
        {recipe.functions.map((fn) => {
          const target = several && fn === derived.fn;
          return (
            <Fragment key={fn}>
              {' '}
              <code
                className={classNames('ui-mono', target && 'starter-export--active')}
                aria-current={target ? true : undefined}
              >{`function ${fn}()`}</code>
            </Fragment>
          );
        })}
      </p>
    </Tile>
  );
}

function RecipeTile(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const [pending, setPending] = useState<RecipeId | null>(null);
  const recipe = getRecipe(state.recipe);

  // AC-2.9: a change that would discard edits waits for confirmation; Cancel keeps both.
  const select = (id: RecipeId): void => {
    if (id === state.recipe) return;
    if (derived.edited) setPending(id);
    else dispatch({ type: 'selectRecipe', recipe: id });
  };
  const cancel = (): void => {
    setPending(null);
  };
  const discard = (): void => {
    if (pending !== null) dispatch({ type: 'selectRecipe', recipe: pending });
    setPending(null);
  };

  return (
    <Tile
      heading="Recipe"
      aside={<span className="starter-count">{RECIPES.length} recipes</span>}
      className="starter-tile--recipe"
    >
      <RecipeCombobox value={state.recipe} onSelect={select} />
      <p className="starter-help starter-help--truncate" title={recipe.mainObject}>
        Uses <span className="ui-mono starter-object">{recipe.mainObject}</span>
      </p>
      <Modal
        open={pending !== null}
        title="Discard your edits?"
        onClose={cancel}
        footer={
          <>
            <Button onClick={cancel}>Cancel</Button>
            <Button variant="primary" onClick={discard}>
              Discard edits
            </Button>
          </>
        }
      >
        <p>
          Switching to {pending === null ? '' : getRecipe(pending).name} regenerates the handler and
          discards your edits to {derived.slug}.js.
        </p>
      </Modal>
    </Tile>
  );
}

// The shared tooltip hook explains a disabled control; here it explains the Validation item (AC-5.3).
function EditedValidationInfo(): ReactElement {
  const { triggerProps, tooltip } = useDisabledReason(EDITED_VALIDATION_NOTE);
  return (
    <span className="ui-reason-anchor">
      <button
        type="button"
        className="ui-icon-button"
        aria-label="About validation"
        {...triggerProps}
      >
        <Icon name="info" size={12} />
      </button>
      {tooltip}
    </span>
  );
}

function ReadinessTile(): ReactElement {
  const { derived } = useStarterSession();
  const { browser, permissions } = derived.readiness;
  return (
    <Tile role="region" aria-label="Readiness" className="starter-tile--readiness">
      <Ring
        segments={[browser, true, permissions].map((ok) => (ok ? 'done' : 'review'))}
        label="ready"
      />
      <div className="starter-readiness">
        <StatusBadge kind={browser ? 'ok' : 'review'} label="Browser checks" />
        <span className="starter-readiness__row">
          <StatusBadge kind="ok" label="Validation">
            {derived.edited ? <EditedValidationInfo /> : null}
          </StatusBadge>
        </span>
        <StatusBadge kind={permissions ? 'ok' : 'review'} label="Permissions" />
      </div>
    </Tile>
  );
}

/** The four input tiles of layout 10a's top row (AC-2.1). */
export function StarterInputs(): ReactElement {
  return (
    <>
      <LogicNameTile />
      <MethodTile />
      <RecipeTile />
      <ReadinessTile />
    </>
  );
}
