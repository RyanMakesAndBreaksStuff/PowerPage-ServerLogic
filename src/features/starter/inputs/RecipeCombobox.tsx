import { useId, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '@/components/Icon';
import { classNames } from '@/lib/classNames';
import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
import type { RecipeGroup, RecipeId, RecipeMeta } from '@/types/recipe';

export type RecipeComboboxProps = { value: RecipeId; onSelect: (id: RecipeId) => void };

const GROUPS = [
  { group: 'core', label: 'Core' },
  { group: 'tutorial', label: 'Learn tutorials' },
  { group: 'reference', label: 'Learn reference samples' },
] as const satisfies readonly { group: RecipeGroup; label: string }[];

function matches(recipe: RecipeMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    q === '' || recipe.name.toLowerCase().includes(q) || recipe.mainObject.toLowerCase().includes(q)
  );
}

// APG editable combobox with list autocomplete (AC-3.1, F48): focus stays in the input and
// aria-activedescendant names the active option.
export function RecipeCombobox({ value, onSelect }: RecipeComboboxProps): ReactElement {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null shows the selected name, unfiltered
  const [active, setActive] = useState<RecipeId | null>(null);

  const visible = RECIPES.filter((r) => matches(r, query ?? ''));
  const activeId = open ? (visible.find((r) => r.id === active) ?? visible[0])?.id : undefined;

  const openList = (): void => {
    setOpen(true);
    setActive(value);
  };
  const close = (): void => {
    setOpen(false);
    setQuery(null);
    setActive(null);
  };
  const choose = (recipe: RecipeId): void => {
    close();
    onSelect(recipe);
  };
  const move = (step: 1 | -1): void => {
    if (!open) {
      openList();
      return;
    }
    const index = visible.findIndex((r) => r.id === activeId);
    const next = visible[(index + step + visible.length) % visible.length];
    if (next !== undefined) setActive(next.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && activeId !== undefined) {
      event.preventDefault();
      choose(activeId);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="starter-combobox">
      <div className="starter-combobox__field">
        <Icon name="search" />
        <input
          role="combobox"
          aria-label="Recipe"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId === undefined ? undefined : `${id}-${activeId}`}
          className="starter-combobox__input"
          value={query ?? getRecipe(value).name}
          title={getRecipe(value).name}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(null);
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          onBlur={close}
        />
        <Icon name="chevron-down" />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label="Recipes"
        className="starter-combobox__list"
        hidden={!open}
      >
        {GROUPS.map(({ group, label }) => {
          const items = visible.filter((r) => r.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} role="group" aria-labelledby={`${id}-${group}`}>
              <div id={`${id}-${group}`} role="presentation" className="starter-combobox__group">
                {label}
              </div>
              {items.map((recipe) => (
                <div
                  key={recipe.id}
                  id={`${id}-${recipe.id}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={recipe.id === activeId}
                  className="starter-combobox__option"
                  onMouseDown={(event) => {
                    event.preventDefault(); // keep focus in the input
                    choose(recipe.id);
                  }}
                >
                  <span>{recipe.name}</span>{' '}
                  <span className={classNames('ui-mono', 'starter-combobox__object')}>
                    {recipe.mainObject}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        {visible.length === 0 ? (
          <div role="presentation" className="starter-combobox__empty">
            No recipes match
          </div>
        ) : null}
      </div>
    </div>
  );
}
