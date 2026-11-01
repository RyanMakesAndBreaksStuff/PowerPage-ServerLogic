import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '@/components/Icon';
import { classNames } from '@/lib/classNames';
import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
import type { HttpMethod } from '@/types/http';
import type { RecipeGroup, RecipeId, RecipeMeta } from '@/types/recipe';
import { recipeSupportsMethod } from './starterOptions';

export type RecipeComboboxProps = {
  value: RecipeId;
  onSelect: (id: RecipeId) => void;
  methodFilter: HttpMethod | null;
  onVisibleCountChange: (count: number) => void;
};

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
export function RecipeCombobox({
  value,
  onSelect,
  methodFilter,
  onVisibleCountChange,
}: RecipeComboboxProps): ReactElement {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null shows the selected name, unfiltered
  const [active, setActive] = useState<RecipeId | null>(null);

  const visible = RECIPES.filter(
    (recipe) =>
      matches(recipe, query ?? '') &&
      (methodFilter === null || recipeSupportsMethod(recipe, methodFilter)),
  );
  const activeId = open ? (visible.find((r) => r.id === active) ?? visible[0])?.id : undefined;

  const close = useCallback(() => {
    setOpen(false);
    setQuery(null);
    setActive(null);
  }, []);

  useEffect(() => {
    onVisibleCountChange(visible.length);
  }, [onVisibleCountChange, visible.length]);

  useEffect(() => {
    if (!open || activeId === undefined) return;
    const activeOption = document.getElementById(`${id}-${activeId}`) as unknown as {
      scrollIntoView?: (options: ScrollIntoViewOptions) => void;
    } | null;
    if (typeof activeOption?.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId, id, open]);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [close]);

  const openList = (): void => {
    setOpen(true);
    setActive(value);
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
    <div
      className="starter-combobox"
      ref={rootRef}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          close();
        }
      }}
    >
      <div className="starter-combobox__field">
        <Icon name="search" />
        <input
          ref={inputRef}
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
        />
        <button
          type="button"
          className="ui-button ui-button--ghost starter-combobox__toggle"
          aria-label="Toggle recipes"
          aria-expanded={open}
          aria-controls={listId}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          onClick={() => {
            if (open) close();
            else {
              inputRef.current?.focus();
              setActive(value);
              setOpen(true);
            }
          }}
        >
          <Icon name="chevron-down" />
        </button>
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
