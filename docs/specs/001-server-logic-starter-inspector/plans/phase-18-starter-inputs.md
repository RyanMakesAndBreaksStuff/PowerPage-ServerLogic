# Phase 18: Starter Input Tiles Implementation Plan

> **Superseded in part by spec v4.0.0 (1a Graphite).** The colours in this file are now the 1a Graphite values in `src/app/theme/tokens.css` (spec FR-11), under the same variable names; base text is weight 600 and emphasis 700. The tiles' structure and behaviour stand.

**Goal:** Replace the Logic Starter placeholder with layout 10a's input row (Logic name, HTTP method, Recipe combobox, Readiness), the permission note tile and the action column, all driving the Phase 18a session.

**Architecture:** Every control reads and dispatches through `useStarterSession()` (Phase 18a); this phase adds no state of its own except the combobox's open/filter state and the pending recipe behind the AC-2.9 confirmation. Spec text and disabled reasons for pills live in one pure module, `src/features/starter/inputs/starterOptions.ts`, which Phase 21's client pane also consumes for the Liquid pill. Layout is CSS grid in `src/features/starter/starter.css`; Phase 21 fills grid row 2 without touching this phase's files except one mount edit in `StarterPage.tsx`.

**Tech stack:** React 19.2 with the Compiler, TypeScript ~6.0 (strict, `exactOptionalPropertyTypes`), Phase 04 primitives (`Tile`, `PillGroup`, `Ring`, `StatusBadge`, `Button`, `Modal`, `Icon`, `useDisabledReason`), Phase 05 catalogue (`RECIPES`, `getRecipe`, `methodEnabled`, `checklistLines`), Vitest 5 + Testing Library + user-event 14, jsdom.

**Scope:** `plan-starter.md` Part C, wave C1. Story 2 UI: AC-2.1, AC-2.2/2.3 (helper line), AC-2.4 (file name half; the pane header, endpoint and client URL are Phase 21's), AC-2.5, AC-2.6 (helper line), AC-2.9 (confirmation), AC-2.10 (pill reasons, R8 "Liquid only"), AC-2.11 (collision note). AC-3.1 (APG combobox), AC-3.4 (helper lists every function), AC-3.6 (note tile and in-tool checklist), AC-3.8 (method pills disabled for R8). AC-4.7 (the Liquid pill's disabled reason, as data for Phase 21). AC-5.1 (ring and three items), AC-5.3 (edited-validation tooltip), AC-5.4 (Mark checklist reviewed / Undo review and the checklist label), AC-5.5, AC-5.9 (Start over). FR-2, FR-5 (controls), NFR accessibility for these controls. Mounts Phase 14's `DownloadStarterButton`. **Depends on:** 04, 06, 10, 18a (all merged). Phases 14 and 19 have also merged, so the action column shows the working Download button and every recipe, R7 included, generates.

**Out of scope:** Code panes, request path strip, Copy, line flags, highlights and the client-language pills (Phase 21). The Download button's behaviour (Phase 14). Server Objects "Permissions needed" tile from AC-3.6 (Phase 22). Any change to the session reducer, its types or `StarterDeps` (Phase 18a).

---

**Baseline (2026-10-19, commit `5953503`, after Phases 14 and 19 merged):** `npx tsc -b` exit 0, `npx eslint . --max-warnings=0` exit 0, `npx vitest run` 69 files and 1,012 tests passing. Phase 17 (behavior harness) is not merged yet. It touches none of this phase's files, but it adds test files, so Task 5 states its expected totals relative to the baseline. A single parallel run once showed 1 timing failure in `src/lib/code-analysis/browserChecks.test.ts > performance` that passes when rerun or run alone, so treat that test as load-sensitive. `npx prettier --check .` reports 171 files only because this Windows checkout has `core.autocrlf=true` (CRLF working files). `npx prettier --check . --end-of-line auto` passes, so every Prettier command below uses that flag.

**Verified while planning:** all code in this plan was drafted at these paths and run against the repository on 2026-10-19, then removed. First run on `026f7d2`; rerun on `5953503` together with Phase 21's draft: tsc, ESLint and Prettier clean, and 78 files / 1,068 tests green in two consecutive runs. Two findings shaped it: (1) a test helper that defines a local capture component fails `react-refresh/only-export-components`, so the harness captures the session through `StarterSessionContext.Consumer`; (2) `tests/buildShape.test.ts` greps the bundle for the placeholder text this phase deletes, so Task 3 retargets it.

### Task 1: Pill options and spec strings exist as one pure module

**Owns:** The AC-2.10 reason "`<recipe name>` doesn't export `<fn>()`" (plain text, no backticks; `<Recipe>` is the recipe's `name`), the AC-3.8 reason "Liquid only: not callable over HTTP", the AC-4.7 reason, the AC-5.3 note and the AC-2.11 collision note. `methodOptions` (five methods, always) and `languageOptions` (fetch, jQuery, Liquid; R8 fixed to Liquid). R8 is detected by `recipe.id === 'R8'`, the same test the Phase 18a reducer uses.

**Files:**

- Create: `src/features/starter/inputs/starterOptions.ts` — pill options and the spec strings shown by Starter controls.
- Signal: `src/features/starter/inputs/starterOptions.test.ts` — option lists, reasons and pinned strings.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/inputs/starterOptions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRecipe } from '@/services/catalogue/recipes';
import type { RecipeId } from '@/types/recipe';
import {
  collisionNote,
  EDITED_VALIDATION_NOTE,
  LIQUID_BLOCKED_REASON,
  LIQUID_ONLY_REASON,
  languageOptions,
  methodOptions,
} from './starterOptions';

const methodReasons = (id: RecipeId): Record<string, string | null> =>
  Object.fromEntries(
    methodOptions(getRecipe(id)).map((o) => [o.value, o.disabledReason ?? null] as const),
  );

describe('starter option text', () => {
  it('pins the spec strings', () => {
    expect(LIQUID_ONLY_REASON).toBe('Liquid only: not callable over HTTP');
    expect(LIQUID_BLOCKED_REASON).toBe(
      "Liquid can't call this handler: it reads HTTP-only request properties",
    );
    expect(EDITED_VALIDATION_NOTE).toBe("Generated validation; edits aren't rechecked.");
    expect(collisionNote('orders')).toBe(
      "Different names can produce the same slug, and so the same endpoint. Check that orders isn't already used on your site.",
    );
  });
});

describe('methodOptions (AC-2.5, AC-2.10, AC-3.8)', () => {
  it('always lists the five methods in order', () => {
    expect(methodOptions(getRecipe('R1')).map((o) => o.label)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
  });

  it('enables only the methods whose function the recipe exports', () => {
    expect(methodReasons('R1').POST).toBe("Read Dataverse records doesn't export post()");
    expect(methodReasons('R4')).toEqual({
      GET: null,
      POST: null,
      PUT: null,
      PATCH: "Dataverse CRUD doesn't export patch()",
      DELETE: null,
    });
    expect(methodReasons('R5').PATCH).toBe("External service CRUD doesn't export patch()");
    expect(methodReasons('R10')).toEqual({
      GET: null,
      POST: null,
      PUT: "Call a Dataverse custom API doesn't export put()",
      PATCH: null,
      DELETE: "Call a Dataverse custom API doesn't export del()",
    });
  });

  it('disables every method for R8 with the Liquid-only reason', () => {
    expect(new Set(Object.values(methodReasons('R8')))).toEqual(new Set([LIQUID_ONLY_REASON]));
  });
});

describe('languageOptions (AC-4.4, AC-4.7, AC-3.8)', () => {
  const reasons = (id: RecipeId, liquidAllowed: boolean): (string | null)[] =>
    languageOptions(getRecipe(id), liquidAllowed).map((o) => o.disabledReason ?? null);

  it('offers fetch, jQuery and Liquid', () => {
    expect(languageOptions(getRecipe('R1'), true).map((o) => o.label)).toEqual([
      'fetch',
      'jQuery',
      'Liquid',
    ]);
    expect(reasons('R1', true)).toEqual([null, null, null]);
  });

  it('disables Liquid with the AC-4.7 reason when the rule fails', () => {
    expect(reasons('R2', false)).toEqual([null, null, LIQUID_BLOCKED_REASON]);
  });

  it('fixes R8 to Liquid', () => {
    expect(reasons('R8', true)).toEqual([LIQUID_ONLY_REASON, LIQUID_ONLY_REASON, null]);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/inputs/starterOptions.test.ts`

Expected: `FAIL  src/features/starter/inputs/starterOptions.test.ts`, with `Error: Failed to resolve import "./starterOptions" from "src/features/starter/inputs/starterOptions.test.ts". Does the file exist?` and `Test Files  1 failed (1)`.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/inputs/starterOptions.ts`:

```ts
import type { PillOption } from '@/components/PillGroup';
import { methodEnabled } from '@/services/catalogue/recipes';
import { HTTP_METHODS, METHOD_FUNCTION } from '@/types/http';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeMeta } from '@/types/recipe';

export const LIQUID_ONLY_REASON = 'Liquid only: not callable over HTTP';
export const LIQUID_BLOCKED_REASON =
  "Liquid can't call this handler: it reads HTTP-only request properties";
export const EDITED_VALIDATION_NOTE = "Generated validation; edits aren't rechecked.";

/** AC-2.11: shown when the slug differs from the typed name. Starter is offline, so it can't check the site. */
export function collisionNote(slug: string): string {
  return `Different names can produce the same slug, and so the same endpoint. Check that ${slug} isn't already used on your site.`;
}

/** AC-2.5, AC-2.10, AC-3.8: all five methods; one the recipe doesn't export is disabled with its reason. */
export function methodOptions(recipe: RecipeMeta): readonly PillOption<HttpMethod>[] {
  return HTTP_METHODS.map((method) => ({
    value: method,
    label: method,
    disabledReason:
      recipe.id === 'R8'
        ? LIQUID_ONLY_REASON
        : methodEnabled(recipe, method)
          ? null
          : `${recipe.name} doesn't export ${METHOD_FUNCTION[method]}()`,
  }));
}

/** AC-4.4, AC-4.7, AC-3.8: fetch, jQuery and Liquid. R8 is fixed to Liquid. */
export function languageOptions(
  recipe: RecipeMeta,
  liquidAllowed: boolean,
): readonly PillOption<ClientLanguage>[] {
  const httpReason = recipe.id === 'R8' ? LIQUID_ONLY_REASON : null;
  return [
    { value: 'fetch', label: 'fetch', disabledReason: httpReason },
    { value: 'jquery', label: 'jQuery', disabledReason: httpReason },
    {
      value: 'liquid',
      label: 'Liquid',
      disabledReason: liquidAllowed ? null : LIQUID_BLOCKED_REASON,
    },
  ];
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/inputs/starterOptions.test.ts`

Expected: `Test Files  1 passed (1)` and `Tests  7 passed (7)`.

Run: `npx tsc -b && npx eslint src/features/starter --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/inputs/starterOptions.ts src/features/starter/inputs/starterOptions.test.ts
git commit -m "feat(starter): add method and language pill options with their disabled reasons"
```

### Task 2: The recipe picker is an APG editable combobox

**Owns:** AC-3.1 behaviour: field shows the selected recipe name; opening lists all ten recipes with their main object under "Core", "Learn tutorials", "Learn reference samples"; typing filters by name or object, case-insensitive; ↑/↓ move and wrap; Enter selects; Esc and blur close without selecting and restore the name; click selects without moving focus. Per APG list autocomplete, focus stays in the input, `aria-activedescendant` names the active option and that option carries `aria-selected="true"`. The listbox stays in the DOM (`hidden` when closed) so `aria-controls` always resolves. Options are `tabIndex={-1}` to satisfy `jsx-a11y/interactive-supports-focus`; `onMouseDown` prevents the input blur.

**Files:**

- Create: `src/features/starter/inputs/RecipeCombobox.tsx` — the searchable recipe combobox.
- Signal: `src/features/starter/inputs/RecipeCombobox.test.tsx` — APG keyboard, filter, grouping and selection.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/inputs/RecipeCombobox.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecipeCombobox } from './RecipeCombobox';

function mount() {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<RecipeCombobox value="R1" onSelect={onSelect} />);
  return { user, onSelect, input: screen.getByRole('combobox', { name: 'Recipe' }) };
}

const optionNames = (): string[] =>
  screen.queryAllByRole('option').map((o) => o.textContent.replace(/Server\..*$/, '').trim());

function activeOption(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant');
  return id === null ? null : document.getElementById(id);
}

describe('RecipeCombobox (AC-3.1, APG combobox)', () => {
  it('shows the selected recipe and starts closed', () => {
    const { input } = mount();
    expect(input).toHaveValue('Read Dataverse records');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lists the ten recipes with their objects under three groups', async () => {
    const { user, input } = mount();
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const group = (name: string): string[] =>
      within(screen.getByRole('group', { name }))
        .getAllByRole('option')
        .map((o) => o.textContent);
    expect(group('Core')).toEqual([
      'Read Dataverse records Server.Connector.Dataverse',
      'Validate a request Server.Context',
      'Call an external API Server.Connector.HttpClient',
    ]);
    expect(group('Learn tutorials')).toHaveLength(4);
    expect(group('Learn reference samples')).toEqual([
      'Invoke from Liquid Server.Context',
      'Trigger a cloud flow Server.Connector.CloudFlow',
      'Call a Dataverse custom API Server.Connector.Dataverse',
    ]);
  });

  it('filters by recipe name or object, ignoring case', async () => {
    const { user, input } = mount();
    await user.clear(input);
    await user.type(input, 'crud');
    expect(optionNames()).toEqual(['Dataverse CRUD', 'External service CRUD']);
    await user.clear(input);
    await user.type(input, 'CLOUDFLOW');
    expect(optionNames()).toEqual(['Trigger a cloud flow']);
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(optionNames()).toEqual([]);
    expect(screen.getByText('No recipes match')).toBeInTheDocument();
  });

  it('moves with the arrow keys, wraps, and selects with Enter', async () => {
    const { user, input, onSelect } = mount();
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Read Dataverse records');
    expect(activeOption(input)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Validate a request');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(activeOption(input)).toHaveTextContent('Call a Dataverse custom API');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('R10');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes with Esc or on blur without selecting, and restores the name', async () => {
    const { user, input, onSelect } = mount();
    await user.clear(input);
    await user.type(input, 'flow');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Read Dataverse records');
    await user.click(input);
    await user.tab();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects an option on click', async () => {
    const { user, input, onSelect } = mount();
    await user.click(input);
    await user.click(screen.getByRole('option', { name: /^Dataverse CRUD/ }));
    expect(onSelect).toHaveBeenCalledWith('R4');
    expect(input).toHaveFocus();
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/inputs/RecipeCombobox.test.tsx`

Expected: `FAIL  src/features/starter/inputs/RecipeCombobox.test.tsx`, with `Error: Failed to resolve import "./RecipeCombobox" from "src/features/starter/inputs/RecipeCombobox.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/inputs/RecipeCombobox.tsx`:

```tsx
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
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/inputs`

Expected: `Test Files  2 passed (2)` and `Tests  13 passed (13)`.

Run: `npx tsc -b && npx eslint src/features/starter --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/inputs/RecipeCombobox.tsx src/features/starter/inputs/RecipeCombobox.test.tsx
git commit -m "feat(starter): add the searchable recipe combobox (APG)"
```

### Task 3: The Starter page shows the four input tiles

**Owns:** The page grid (layout 10a §2: rows `129px / minmax(0,1fr) / auto`, columns `220px repeat(3, minmax(0,1fr))`, 12px gaps, 12px/16px padding) and all Starter CSS. The page height is `max(calc(100vh - 42px), 658px)`: the Phase 06 panel and `.shell__content` don't stretch their children, and this keeps Phase 06's files untouched (42px is the title bar; 658px is the 700px minimum viewport minus it). The four tiles: name input with the "File `<slug>.js`" helper and, when the slug differs, the AC-2.11 note (clamped to two lines, full text in `title` and the input's `aria-describedby`); method pills plus the "Exports …" helper (every function listed; for several functions the targeted one is bold and `aria-current`; R8 adds "Liquid only · "); the recipe combobox with "10 recipes" and "Uses `<object>`"; the readiness ring (`[browser, validation, permissions]` → `'done' | 'review'`, label "ready") with three `StatusBadge`s. The AC-2.9 confirmation: selecting a different recipe while `derived.edited` opens `Modal` "Discard your edits?" (Cancel is focused first, so Enter is safe); re-selecting the current recipe is not a change and dispatches nothing. The AC-5.3 tooltip sits on an info icon button next to Validation, shown only when edited, because status badges are not focusable. The test harness `renderStarter` that Phase 21 reuses.

**Files:**

- Create: `src/features/starter/starterTestHarness.tsx` — test-only render helper (providers, fake host, session capture). Never imported by app code, so it is not in the bundle.
- Create: `src/features/starter/inputs/StarterInputs.tsx` — the four top-row tiles and the discard confirmation.
- Create: `src/features/starter/starter.css` — Create Logic grid and Starter control styles.
- Modify: `src/features/starter/StarterPage.tsx` (whole file, placeholder) — page grid with the input row.
- Modify: `src/app/App.test.tsx:50`, `src/app/App.test.tsx:57` — stop asserting the placeholder text.
- Modify: `tests/buildShape.test.ts:95-101`, `tests/buildShape.test.ts:113` — find the Starter page by text it now renders.
- Signal: `src/features/starter/StarterPage.test.tsx` — the input tiles through the real session.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/starterTestHarness.tsx` (shared by every Starter UI test; it renders exactly the providers `App` gives the Starter page):

```tsx
// Test helper, never imported by the app: mounts Starter UI inside the providers App gives it, on a fake host.
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import type { StarterDeps } from '@/app/starter-session/starterDeps';
import type { StarterAction } from '@/app/starter-session/starterSession.types';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/app/starter-session/useStarterSession';
import type { useStarterSession } from '@/app/starter-session/useStarterSession';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';

type Session = ReturnType<typeof useStarterSession>;

export function renderStarter(
  ui: ReactElement,
  options: { deps?: StarterDeps; host?: FakeHostInit } = {},
) {
  const host = createFakeHost(options.host);
  const user = userEvent.setup();
  let latest: Session | null = null;
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <StarterSessionProvider deps={options.deps ?? FAKE_STARTER_DEPS}>
          {ui}
          {/* A render function, not a component, so the capture stays out of the app's lint rules. */}
          <StarterSessionContext.Consumer>
            {(session) => {
              latest = session;
              return null;
            }}
          </StarterSessionContext.Consumer>
        </StarterSessionProvider>
      </NotifyProvider>
    </HostContext>,
  );
  const session = (): Session => {
    if (latest === null) throw new Error('Starter session not captured');
    return latest;
  };
  const dispatch = (action: StarterAction): void => {
    act(() => {
      session().dispatch(action);
    });
  };
  return { host, user, session, dispatch };
}
```

Create `src/features/starter/StarterPage.test.tsx`. Queries are scoped to their tiles so Phase 21's pills and code text never match them:

```tsx
import { act, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StarterPage } from './StarterPage';
import { renderStarter } from './starterTestHarness';

// Scoped to their tiles, so the code panes' own pills and text (Phase 21) never match.
const methodTile = (): HTMLElement => screen.getByRole('region', { name: 'HTTP method' });
const radio = (name: string): HTMLElement => within(methodTile()).getByRole('radio', { name });
const nameInput = (): HTMLElement => screen.getByRole('textbox', { name: 'Logic name' });
const readiness = (): HTMLElement => screen.getByRole('region', { name: 'Readiness' });
const ring = (label: string): HTMLElement => within(readiness()).getByRole('img', { name: label });

async function pickRecipe(user: UserEvent, name: RegExp): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: 'Recipe' }));
  await user.click(screen.getByRole('option', { name }));
}

describe('StarterPage input tiles (Phase 18)', () => {
  it('shows the four input tiles (AC-2.1)', () => {
    renderStarter(<StarterPage />);
    for (const name of ['Logic name', 'HTTP method', 'Recipe', 'Readiness']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('10 recipes');
  });

  it('slugifies the name into the file line and warns about shared slugs (AC-2.2, AC-2.3, AC-2.11)', async () => {
    const { user } = renderStarter(<StarterPage />);
    expect(nameInput()).toHaveValue('customer-summary');
    expect(nameInput()).toHaveAccessibleDescription('File customer-summary.js');
    await user.clear(nameInput());
    await user.type(nameInput(), 'Customer Summary!');
    expect(nameInput()).toHaveAccessibleDescription(
      "File customer-summary.js Different names can produce the same slug, and so the same endpoint. Check that customer-summary isn't already used on your site.",
    );
    await user.clear(nameInput());
    expect(nameInput()).toHaveAccessibleDescription(/^File untitled\.js /);
  });

  it('shows five method pills and explains the disabled ones (AC-2.5, AC-2.6, AC-2.10)', () => {
    renderStarter(<StarterPage />);
    const group = screen.getByRole('radiogroup', { name: 'HTTP method' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(radio('POST')).toHaveAttribute('aria-disabled', 'true');
    expect(radio('POST')).toHaveAccessibleDescription(
      "Read Dataverse records doesn't export post()",
    );
    act(() => {
      radio('POST').focus();
    });
    expect(
      screen.getByRole('tooltip', { name: "Read Dataverse records doesn't export post()" }),
    ).toHaveAttribute('data-visible', 'true');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Exports function get()',
    );
  });

  it('lists every function of a multi-function recipe and marks the targeted one (AC-2.6, AC-3.4)', async () => {
    const { user } = renderStarter(<StarterPage />);
    await pickRecipe(user, /^Dataverse CRUD/);
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(radio('PATCH')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Exports function get() function post() function put() function del()',
    );
    expect(within(methodTile()).getByText('function get()')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await user.click(radio('PUT'));
    expect(within(methodTile()).getByText('function put()')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(methodTile()).getByText('function get()')).not.toHaveAttribute('aria-current');
  });

  it('disables every method for R8 and says Liquid only (AC-2.10, AC-3.8)', async () => {
    const { user } = renderStarter(<StarterPage />);
    await pickRecipe(user, /^Invoke from Liquid/);
    for (const r of within(methodTile()).getAllByRole('radio')) {
      expect(r).toHaveAttribute('aria-disabled', 'true');
      expect(r).toHaveAttribute('aria-checked', 'false');
    }
    expect(radio('GET')).toHaveAccessibleDescription('Liquid only: not callable over HTTP');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Liquid only · Exports function getSummary()',
    );
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('Uses Server.Context');
  });

  it('asks before a recipe change discards edits; Cancel keeps both (AC-2.9)', async () => {
    const h = renderStarter(<StarterPage />);
    h.dispatch({ type: 'editServer', text: 'function get() { return "mine"; }', cursor: null });
    await pickRecipe(h.user, /^Validate a request/);
    const dialog = screen.getByRole('dialog', { name: 'Discard your edits?' });
    expect(dialog).toHaveTextContent(
      'Switching to Validate a request regenerates the handler and discards your edits to customer-summary.js.',
    );
    await h.user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.session().state.recipe).toBe('R1');
    expect(h.session().state.serverText).toBe('function get() { return "mine"; }');
    await pickRecipe(h.user, /^Validate a request/);
    await h.user.click(screen.getByRole('button', { name: 'Discard edits' }));
    expect(h.session().state.recipe).toBe('R2');
    expect(h.session().derived.edited).toBe(false);
  });

  it('changes recipe without asking once the text is back to the generated text (AC-2.9)', async () => {
    const h = renderStarter(<StarterPage />);
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    h.dispatch({ type: 'editServer', text: h.session().state.generatedText, cursor: null });
    await pickRecipe(h.user, /^Validate a request/);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.session().state.recipe).toBe('R2');
  });

  it('shows K/3 with the three readiness items (AC-5.1, AC-5.2 state)', () => {
    const h = renderStarter(<StarterPage />);
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(readiness()).toHaveTextContent('2/3ready');
    const badge = (label: string): string | null | undefined =>
      within(readiness())
        .getByText(label)
        .querySelector('[data-glyph]')
        ?.getAttribute('data-glyph');
    expect([badge('Browser checks'), badge('Validation'), badge('Permissions')]).toEqual([
      'ok',
      'ok',
      'review',
    ]);
    h.dispatch({ type: 'editServer', text: 'eval("x");', cursor: null });
    expect(ring('1 of 3 ready')).toBeInTheDocument();
    expect(badge('Browser checks')).toBe('review');
  });

  it('explains that edited validation is not rechecked (AC-5.3)', () => {
    const h = renderStarter(<StarterPage />);
    expect(screen.queryByRole('button', { name: 'About validation' })).toBeNull();
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    expect(screen.getByRole('button', { name: 'About validation' })).toHaveAccessibleDescription(
      "Generated validation; edits aren't rechecked.",
    );
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/StarterPage.test.tsx`

Expected: `Tests  9 failed (9)`. The first failure reads `TestingLibraryElementError: Unable to find an accessible element with the role "region" and name "Logic name"`, because `StarterPage` is still the Phase 00 placeholder.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/inputs/StarterInputs.tsx`:

```tsx
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
          <StatusBadge kind="ok" label="Validation" />
          {derived.edited ? <EditedValidationInfo /> : null}
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
```

Create `src/features/starter/starter.css` (it already styles Task 4's note and action column, so later tasks don't touch it):

```css
/* Create Logic, layout 10a §2. Colours come only from the theme tokens. */

/* Fills the tool below the 42px title bar; below the 1024×700 minimum the window scrolls (NFR). */
.starter-page {
  box-sizing: border-box;
  height: max(calc(100vh - 42px), 658px);
  padding: 12px 16px 16px;
  display: grid;
  grid-template-columns: 220px repeat(3, minmax(0, 1fr));
  grid-template-rows: 129px minmax(0, 1fr) auto;
  gap: 12px;
}

.starter-page__note {
  grid-row: 3;
  grid-column: 1 / 4;
}

.starter-page__actions {
  grid-row: 3;
  grid-column: 4;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.starter-field {
  box-sizing: border-box;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--control-border);
  border-bottom: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--code);
  color: var(--text);
  font-size: 12.5px;
}

.starter-help {
  margin: 0;
  color: var(--muted);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}

.starter-help--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.starter-help--truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.starter-help code {
  font-size: 11.5px;
}

.starter-export--active {
  color: var(--text);
  font-weight: 700;
}

.starter-object {
  color: var(--server);
}

.starter-count {
  color: var(--muted);
  font-size: 11.5px;
  white-space: nowrap;
}

/* The recipe list opens over the code row, so this tile must not clip it. */
.starter-tile--recipe {
  position: relative;
  z-index: 2;
  overflow: visible;
}

.starter-tile--readiness {
  flex-direction: row;
  align-items: center;
  gap: 14px;
}

.starter-readiness {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.starter-readiness__row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.starter-combobox {
  position: relative;
}

.starter-combobox__field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--control-border);
  border-bottom: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--code);
  color: var(--muted);
}

.starter-combobox__field:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.starter-combobox__input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  text-overflow: ellipsis;
}

/* The field draws the focus ring for the input inside it. */
.starter-combobox__input:focus-visible {
  outline: none;
}

.starter-combobox__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
  background: var(--tile);
  border: 1px solid var(--control-border);
  border-radius: 6px;
  box-shadow: var(--tile-shadow);
}

.starter-combobox__group {
  padding: 6px 10px 2px;
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.starter-combobox__option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 10px;
  color: var(--text);
  font-size: 12.5px;
  cursor: pointer;
}

.starter-combobox__option[aria-selected='true'] {
  background: var(--ok-tint);
  box-shadow: inset 2px 0 0 var(--primary);
}

.starter-combobox__object {
  color: var(--server);
  font-size: 11px;
}

.starter-combobox__empty {
  padding: 6px 10px;
  color: var(--muted);
  font-size: 12px;
}

.starter-note__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.starter-note__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text-2);
  font-size: 12.5px;
}

.starter-note__checklist {
  color: var(--text-2);
  font-size: 12px;
}

.starter-note__checklist summary {
  color: var(--muted);
  cursor: pointer;
}

.starter-note__checklist ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
```

Replace the whole of `src/features/starter/StarterPage.tsx`:

```tsx
import type { ReactElement } from 'react';
import { StarterInputs } from './inputs/StarterInputs';
import './starter.css';

// Create Logic, layout 10a §2: the input row, the code row (Phase 21) and the action row.
export function StarterPage(): ReactElement {
  return (
    <section aria-label="Logic Starter" className="starter-page">
      <StarterInputs />
    </section>
  );
}
```

In `src/app/App.test.tsx`, the placeholder text is gone. Replace line 50 (inside `'swaps the visible page immediately and keeps the others mounted (AC-1.4)'`; the Starter panel is hidden there, so the query needs `hidden: true`):

```tsx
    expect(screen.getByRole('region', { name: 'Logic name', hidden: true })).toBeTruthy();
```

and line 57 (inside `'reads "Not connected" and keeps the site pill disabled without a connection (AC-1.3)'`):

```tsx
    expect(screen.getByRole('region', { name: 'Logic name' })).toBeTruthy();
```

In `tests/buildShape.test.ts`, the bundle no longer contains the Starter placeholder. Change the test at line 95:

```ts
  it('includes all three pages', () => {
    const [file] = filesIn(dist, '.js');
    if (file === undefined) throw new Error('no bundle emitted');
    const code = read(dist, file);
    expect(code).toContain('Discard your edits?'); // text only the Starter page renders
    expect(code).toContain('Server Objects page placeholder');
    expect(code).toContain('Logic Inspector page placeholder');
  });
```

and line 113, inside `'keeps only the Starter page when VITE_RELEASED_PAGES=starter'`:

```ts
      expect(code).toContain('Discard your edits?'); // text only the Starter page renders
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/StarterPage.test.tsx`

Expected: `Test Files  1 passed (1)` and `Tests  9 passed (9)`.

Run: `npx vitest run src/features/starter src/app tests/buildShape.test.ts`

Expected: every file passes; `src/app/App.test.tsx` and `tests/buildShape.test.ts` (11 tests) included.

Run: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check src tests --end-of-line auto`

Expected: exit 0; Prettier prints `All matched files use Prettier code style!`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/starterTestHarness.tsx src/features/starter/inputs/StarterInputs.tsx src/features/starter/starter.css src/features/starter/StarterPage.tsx src/features/starter/StarterPage.test.tsx src/app/App.test.tsx tests/buildShape.test.ts
git commit -m "feat(starter): show the Logic name, HTTP method, Recipe and Readiness tiles"
```

### Task 4: The note tile and action column complete the Starter controls

**Owns:** The note tile (AC-5.5): a Permissions `StatusBadge` that follows `derived.readiness.permissions`, the recipe's `permissionNote` with backtick spans rendered as `<code>`, and one button: "Mark checklist reviewed" (dispatches `markReviewed`) or, while reviewed, "Undo review" (`undoReview`). A native `<details>` "View checklist" shows the AC-5.4 label "For the `<recipe name>` recipe. Review anything you've added." and `checklistLines(recipe)`, so the user can see what they are marking (the same lines Phase 14 writes to `permission-checklist.md`). The action column: Phase 14's `DownloadStarterButton`, then "Start over" (dispatches `startOver`; the spec asks for no confirmation).

**Files:**

- Create: `src/features/starter/inputs/PermissionNote.tsx` — the note tile and the self-reported review.
- Modify: `src/features/starter/StarterPage.tsx` — mount the note tile and the action column.
- Signal: `src/features/starter/StarterPage.test.tsx` — append the note and actions tests.

- [ ] **Step 1: Establish the observable pre-change signal**

Append to `src/features/starter/StarterPage.test.tsx`:

```tsx
describe('StarterPage note and actions (Phase 18)', () => {
  it('shows the recipe permission note and its checklist (AC-5.5, AC-3.6, AC-5.4 label)', () => {
    renderStarter(<StarterPage />);
    const note = screen.getByRole('region', { name: 'Permissions note' });
    expect(note).toHaveTextContent(
      "Grant Read on contact with Account access to the caller's web role, then validate on your development site.",
    );
    expect(within(note).getByText('contact').tagName).toBe('CODE');
    expect(note).toHaveTextContent(
      "For the Read Dataverse records recipe. Review anything you've added.",
    );
    expect(note).toHaveTextContent(
      'Table permission: contact (entity set contacts): Read, access type Account',
    );
  });

  it('marks and undoes the review, tied to the reviewed text (AC-5.4)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.click(screen.getByRole('button', { name: 'Mark checklist reviewed' }));
    expect(ring('3 of 3 ready')).toBeInTheDocument();
    h.dispatch({
      type: 'editServer',
      text: `${h.session().state.serverText}// note\n`,
      cursor: null,
    });
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark checklist reviewed' })).toBeInTheDocument();
    h.dispatch({ type: 'editServer', text: h.session().state.generatedText, cursor: null });
    expect(ring('3 of 3 ready')).toBeInTheDocument();
    await h.user.click(screen.getByRole('button', { name: 'Undo review' }));
    expect(ring('2 of 3 ready')).toBeInTheDocument();
  });

  it('Start over resets every input to the defaults (AC-5.9)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.clear(nameInput());
    await h.user.type(nameInput(), 'Orders');
    await pickRecipe(h.user, /^Dataverse CRUD/);
    await h.user.click(radio('PUT'));
    await h.user.click(screen.getByRole('button', { name: 'Mark checklist reviewed' }));
    await h.user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(nameInput()).toHaveValue('customer-summary');
    expect(screen.getByRole('combobox', { name: 'Recipe' })).toHaveValue('Read Dataverse records');
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(h.session().state.language).toBe('fetch');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/StarterPage.test.tsx`

Expected: `Tests  3 failed | 9 passed (12)`; the failures read `Unable to find an accessible element with the role "region" and name "Permissions note"` and `Unable to find an accessible element with the role "button" and name "Mark checklist reviewed"`.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/inputs/PermissionNote.tsx`:

```tsx
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
```

Replace the whole of `src/features/starter/StarterPage.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { DownloadStarterButton } from './download/DownloadStarterButton';
import { PermissionNote } from './inputs/PermissionNote';
import { StarterInputs } from './inputs/StarterInputs';
import './starter.css';

// Create Logic, layout 10a §2: the input row, the code row (Phase 21) and the action row.
export function StarterPage(): ReactElement {
  const { dispatch } = useStarterSession();
  return (
    <section aria-label="Logic Starter" className="starter-page">
      <StarterInputs />
      <PermissionNote />
      <div className="starter-page__actions">
        <DownloadStarterButton />
        <Button
          fullWidth
          onClick={() => {
            dispatch({ type: 'startOver' });
          }}
        >
          <Icon name="arrow-clockwise" />
          Start over
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/StarterPage.test.tsx`

Expected: `Test Files  1 passed (1)` and `Tests  12 passed (12)`.

Run: `npx vitest run src/features/starter src/app`

Expected: every file passes.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/inputs/PermissionNote.tsx src/features/starter/StarterPage.tsx src/features/starter/StarterPage.test.tsx
git commit -m "feat(starter): add the permission note, review toggle, Download and Start over"
```

### Task 5: The phase passes every repository gate and builds one IIFE bundle

**Owns:** Phase 18's completion evidence. No code.

**Files:**

- Signal: the four repository gates and `npm run build`.

- [ ] **Step 1: Establish the observable pre-change signal**

The signal is the gate list from `plan-starter.md` § Global Constraints, run on the finished phase. No new code.

- [ ] **Step 2: Capture the current signal**

Run: `git status --short src tests`

Expected: no output (Tasks 1–4 committed).

- [ ] **Step 3: Implement the minimum fix**

No change. If a gate fails, fix it in the task that owns the failing file and amend nothing: add a new commit.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . --end-of-line auto`

Expected: exit 0; Prettier prints `All matched files use Prettier code style!`.

Run: `npx vitest run`

Expected: every file passes, with 3 more files and 25 more tests than the baseline: `Test Files  72 passed (72)` and `Tests  1037 passed (1037)` from `5953503`. If Phase 17 or another phase merged first, add its files and tests to both numbers. If only `browserChecks.test.ts > performance` fails, rerun it alone (`npx vitest run src/lib/code-analysis/browserChecks.test.ts`): it is load-sensitive and was flaky before this phase.

Run: `npm run build`

Expected: `✓ built in` with no error. The existing "Some chunks are larger than 500 kB" warning is expected for the single-bundle shape.

◆ Owner check (not an agent task): in PPTB (Debug → Load Local Tool, project root), confirm in both themes that the recipe list opens over the code row, the dark glass tiles stay legible, the Validation info tooltip and method-pill tooltips appear on hover and focus, and Download starter saves `<slug>.zip` from the action column.

- [ ] **Step 5: Commit the coherent change**

No commit: this task adds no files. Record the gate results in the phase PR description.

---

## Notes after the plan

- **Download.** Phase 14 has merged, so the mount in Task 4 renders the working button. Its behaviour stays covered by Phase 14's own tests; this phase's tests don't click it.
- **Contract use.** No pinned contract changes. `languageOptions` is new and is the only export Phase 21 needs from this phase; `plan-starter.md` § Contracts can list it next to the Phase 18 row when the plan is next edited.
- **Coverage map.** AC-2.1, 2.2/2.3 helper, 2.5, 2.6 helper, 2.10 → Tasks 1, 3; AC-2.9 → Task 3; AC-2.11 → Tasks 1, 3; AC-3.1 → Task 2; AC-3.4 helper → Task 3; AC-3.6 note and checklist → Task 4; AC-3.8 pills → Tasks 1, 3; AC-4.7 pill reason → Task 1; AC-5.1, 5.3 → Task 3; AC-5.4, 5.5, 5.9 → Task 4.
