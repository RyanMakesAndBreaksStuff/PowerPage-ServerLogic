import { Fragment, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useStarterSession } from '@/session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { PillGroup } from '@/components/PillGroup';
import { Ring } from '@/components/Ring';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { useDisabledReason } from '@/components/useDisabledReason';
import { classNames } from '@/lib/classNames';
import type { HttpMethod } from '@/types/http';
import { getRecipe } from '@/services/catalogue/recipes';
import type { RecipeId } from '@/types/recipe';
import { RecipeCombobox } from './RecipeCombobox';
import {
  COLLISION_NOTE_AFTER,
  COLLISION_NOTE_BEFORE,
  collisionNote,
  EDITED_VALIDATION_NOTE,
  METHOD_FILTER_OPTIONS,
  recipeCountLabel,
  visibleRecipes,
} from './starterOptions';

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
        {note === null ? null : (
          <>
            {' '}
            {COLLISION_NOTE_BEFORE} <code className="ui-mono">{derived.slug}</code>{' '}
            {COLLISION_NOTE_AFTER}
          </>
        )}
      </p>
    </Tile>
  );
}

type MethodFilterProps = {
  methodFilter: HttpMethod | null;
  onMethodFilterChange: (method: HttpMethod) => void;
};

type PendingRecipeSelection = { recipe: RecipeId; preferredMethod: HttpMethod | null };

type RecipeFilterProps = {
  methodFilter: HttpMethod | null;
  query: string | null;
  onQueryChange: (query: string | null) => void;
  onClearMethodFilter: () => void;
};

function MethodTile({ methodFilter, onMethodFilterChange }: MethodFilterProps): ReactElement {
  const { state, derived } = useStarterSession();
  const recipe = getRecipe(state.recipe);
  const several = recipe.functions.length > 1;
  return (
    <Tile heading="HTTP method">
      <PillGroup
        label="HTTP method"
        options={METHOD_FILTER_OPTIONS}
        value={methodFilter}
        onChange={onMethodFilterChange}
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

function RecipeTile({
  methodFilter,
  query,
  onQueryChange,
  onClearMethodFilter,
}: RecipeFilterProps): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const [pending, setPending] = useState<PendingRecipeSelection | null>(null);
  const recipe = getRecipe(state.recipe);

  const commit = (selection: PendingRecipeSelection): void => {
    if (selection.preferredMethod === null) {
      dispatch({ type: 'selectRecipe', recipe: selection.recipe });
    } else {
      dispatch({
        type: 'selectRecipe',
        recipe: selection.recipe,
        preferredMethod: selection.preferredMethod,
      });
    }
  };

  // AC-2.9: a change that would discard edits waits for confirmation; Cancel keeps both.
  const select = (id: RecipeId): void => {
    if (id === state.recipe) {
      if (methodFilter !== null) dispatch({ type: 'setMethod', method: methodFilter });
      return;
    }
    const selection = { recipe: id, preferredMethod: methodFilter };
    if (derived.edited) setPending(selection);
    else commit(selection);
  };
  const cancel = (): void => {
    setPending(null);
  };
  const discard = (): void => {
    if (pending !== null) commit(pending);
    setPending(null);
  };

  return (
    <Tile
      heading="Recipe"
      aside={
        <div className="starter-recipe__aside">
          <span className="starter-count">{recipeCountLabel(visibleRecipes(query ?? '', methodFilter).length)}</span>
          <Button
            aria-label="Clear method filter"
            className="starter-recipe__clear"
            onClick={onClearMethodFilter}
          >
            Clear filter
          </Button>
        </div>
      }
      className="starter-tile--recipe"
    >
      <RecipeCombobox
        value={state.recipe}
        methodFilter={methodFilter}
        query={query}
        onQueryChange={onQueryChange}
        onSelect={select}
      />
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
          Switching to {pending === null ? '' : getRecipe(pending.recipe).name} regenerates the
          handler and
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
  const { state, dispatch } = useStarterSession();
  const [query, setQuery] = useState<string | null>(null);
  return (
    <>
      <LogicNameTile />
      <MethodTile
        methodFilter={state.recipeMethodFilter}
        onMethodFilterChange={(method) => {
          dispatch({ type: 'setRecipeMethodFilter', method });
        }}
      />
      <RecipeTile
        methodFilter={state.recipeMethodFilter}
        query={query}
        onQueryChange={setQuery}
        onClearMethodFilter={() => {
          dispatch({ type: 'setRecipeMethodFilter', method: null });
        }}
      />
      <ReadinessTile />
    </>
  );
}
