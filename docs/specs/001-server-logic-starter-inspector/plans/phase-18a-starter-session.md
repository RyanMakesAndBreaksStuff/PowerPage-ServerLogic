# Phase 18a: Shared Starter session state

**Part:** A (foundation), `plan-starter.md`. This is the state half of the old Phase 18 ("Starter session + input tiles"), moved into Part A so Server Objects can insert into the handler without depending on Starter's UI. The input tiles stay in Phase 18 (Part C).
**Implements:** FR-2 (slug, five methods mapped to Learn's functions, ten recipes, three client languages, as session state), FR-5 (readiness: browser checks, validation, self-reported permissions), FR-5a (state lives only while the tool is open; nothing is written to tool settings) | **Satisfies (state half; the controls that dispatch these actions are Phase 18 and Phase 21):** AC-2.8 (recipe change resets method, Permissions and, when needed, language), AC-2.10 (a method the recipe does not export cannot be selected), AC-3.8 (R8 fixes the language to Liquid and has no method), AC-4.7 (the Liquid rule on the current text, the auto-reset to fetch with its toast, and no switch back on undo), AC-4.10 (LF-only model), AC-5.3 (Validation stays complete), AC-5.4 (Permissions reviewed only while the text equals the reviewed text), AC-5.9 (Start over defaults), and the insertion transaction from AC-6.8 (`planInsertion` changes applied as one update, `async` first)
**Depends on:** 00, 02, 03, 05, 06
**Files:**
- Replace the Phase 00 stubs (whole files): `src/app/starter-session/StarterSessionProvider.tsx`, `src/app/starter-session/useStarterSession.ts`.
- Create in `src/app/starter-session/`: `starterDeps.ts`, `starterReducer.ts`, `deriveStarter.ts`, `applyTextChanges.ts`, `fakeStarterDeps.ts` (test helper), and the tests `starterReducer.test.ts`, `deriveStarter.test.ts`, `applyTextChanges.test.ts`, `StarterSessionProvider.test.tsx`.
- Edit (this phase runs after Phase 06 merges, never in the same wave): `src/app/App.tsx` (the optional `starterDeps` prop and the provider mount) and `src/app/App.test.tsx` (the mount helper passes the fake deps).
- `starterSession.types.ts` stays exactly as Phase 00 committed it.

**Interfaces:**
- **Consumes:**
  - Phase 00 contracts: `StarterState`, `StarterAction`, `StarterDerived` (`@/app/starter-session/starterSession.types`), `HttpMethod`, `METHOD_FUNCTION`, `ClientLanguage` (`@/types/http`), `RecipeId`, `RecipeMeta`, `GeneratedHandler` (`@/types/recipe`), `TextChange` (`@/lib/code-analysis/codeAnalysis.types`), `Notice`.
  - Phase 02: `runBrowserChecks(code)`. Phase 03: `usedServerMembers(code)`. Phase 05: `slugify`, `normalizeLf`, `getRecipe`, `methodEnabled`.
  - Phase 06: `useNotify`, `HostContext`, `NotifyProvider`, `App`, `AppProps`, `createFakeHost` (through Phase 01).
  - **Injected, not imported by the reducer:** `generateHandler` (Part B, Phases 07–09 and 19) and `isLiquidAllowed` (Part B, Phase 10). They are still Phase 00 stubs when this phase runs, so the reducer receives them as `StarterDeps` and every test passes `FAKE_STARTER_DEPS`.
- **Produces** (exact names; Part C, `plan-server-objects.md` and Phase 14 rely on them):
  - `src/app/starter-session/starterDeps.ts`: `type StarterDeps = { generateHandler: (id: RecipeId) => GeneratedHandler; isLiquidAllowed: (recipe: RecipeMeta, serverText: string) => boolean }` and `STARTER_DEPS: StarterDeps` (the real Part B functions).
  - `src/app/starter-session/starterReducer.ts`: `DEFAULT_RECIPE: RecipeId` (`'R1'`), `DEFAULT_NAME` (`'customer-summary'`), `LIQUID_RESET_NOTICE: Notice`, `initialStarterState(deps: StarterDeps): StarterState`, `createStarterReducer(deps: StarterDeps): (state: StarterState, action: StarterAction) => StarterState`.
  - `src/app/starter-session/deriveStarter.ts`: `deriveStarter(state: StarterState, deps: StarterDeps): StarterDerived`.
  - `src/app/starter-session/applyTextChanges.ts`: `applyTextChanges(text: string, changes: readonly TextChange[]): string`.
  - `src/app/starter-session/useStarterSession.ts`: `StarterSessionContext` and `useStarterSession()` with the pinned return type. It throws `Error('useStarterSession must be used inside StarterSessionProvider')` outside the provider.
  - `src/app/starter-session/StarterSessionProvider.tsx`: `StarterSessionProvider(props: { children: ReactNode; deps?: StarterDeps })`. `deps` defaults to `STARTER_DEPS`.
  - `src/app/starter-session/fakeStarterDeps.ts`: `FAKE_STARTER_DEPS: StarterDeps` (tests only; never imported by product code).
  - `src/app/App.tsx`: `AppProps` gains `starterDeps?: StarterDeps`. The provider wraps the Starter and Server Objects panels only, and only when `__PAGE_STARTER__` is true.

This phase builds the one state store both Logic Starter and Server Objects share: the reducer behind the pinned `StarterState` and `StarterAction`, the derived values behind `StarterDerived`, and the provider and hook. It renders no UI of its own.

## Decisions (recorded so later phases do not re-argue them)

1. **Two rules carried over from the old Phase 18:** `readiness.browser` is `checks.hits.length === 0 && !checks.parseFailed`; and an `applyChanges` action applies all its `planInsertion` changes in one reducer step, with offsets that refer to the original text and the optional `async ` change first (Phase 03's contract). One step means one state update and one Liquid check, and the editor's matching dispatch gives one undo (Phase 21).
2. **Generators are injected.** `generateHandler` and `isLiquidAllowed` belong to Part B, which runs after Part A. Injecting them through `StarterDeps` lets this phase, and `plan-server-objects.md`, be built and tested before any handler exists. Product code always uses `STARTER_DEPS`.
3. **The provider is mounted only when Starter is released,** and around the Starter and Server Objects panels only. With Starter unreleased, Server Objects never shows Insert (AC-1.7, AC-6.8), so it never needs the session. Until Phase 07 replaces `r1.ts`, building with Starter released makes the provider throw `not implemented: phase 07`; to smoke Server Objects or Inspector in PPTB before then, build with `VITE_RELEASED_PAGES=objects,inspector`.
4. **Text is LF-only at the reducer boundary.** `editServer` and every generated text pass through `normalizeLf` (AC-4.10). `applyChanges` inserts sample text that Phase 13 already stores with LF, and normalises the result anyway.
5. **Ignored actions return the same state object.** A `setMethod` for a method the recipe does not export, a `setLanguage('liquid')` the rule forbids, and any language change on R8 are no-ops (AC-2.10, AC-4.7, AC-3.8). The controls already show these as `aria-disabled`; the reducer is the backstop.
6. **R8 is exempt from the Liquid auto-reset.** R8 has no HTTP method, so falling back to fetch would leave a client call with no target. Its language stays Liquid; if an edit makes it read an HTTP-only property, the Liquid pill shows its disabled reason (Phase 18) and the browser checks still run. The spec's AC-4.7 reset wording ("the language resets to fetch") is written for recipes that have a fetch client.
7. **The Liquid reset toast** is `{ title: "Switched to fetch: this code can't be called from Liquid", body: '', type: 'info' }`. AC-4.7 gives the text but not the type; `info` is the closest of FR-1's three. The provider sends it through `useNotify` and clears it.
8. **Start over keeps nothing.** `startOver` returns `initialStarterState(deps)`: name `customer-summary`, R1, R1's default method (GET), fetch, the generated text, no cursor, unreviewed, no notice (AC-5.9).
9. **`fn` for R8** is the recipe's only function, `getSummary`, because R8 has no method (`method: null`). Every other recipe maps its method through `METHOD_FUNCTION` (AC-2.6).

---

- [ ] **Step 0: Preflight**

  ```bash
  git status --short
  grep -n "export function runBrowserChecks" src/lib/code-analysis/browserChecks.ts
  grep -n "export function usedServerMembers" src/lib/code-analysis/structure.ts
  grep -n "export function methodEnabled\|export function getRecipe" src/services/catalogue/recipes.ts
  grep -n "export function slugify\|export function normalizeLf" src/lib/slug.ts src/lib/text.ts
  grep -n "export function NotifyProvider\|export type AppProps" src/app/NotifyProvider.tsx src/app/App.tsx
  ```

  Expect: a clean tree and every export found (Phases 02, 03, 05 and 06 merged). If any is still a Phase 00 stub (`not implemented`), stop: this phase runs in the wave after them.

- [ ] **Step 1: Write the text-change test**

  ```ts file=src/app/starter-session/applyTextChanges.test.ts
  import { describe, expect, it } from 'vitest';
  import { applyTextChanges } from './applyTextChanges';

  describe('applyTextChanges', () => {
    it('returns the text unchanged for no changes', () => {
      expect(applyTextChanges('abc', [])).toBe('abc');
    });

    it('applies every change against the original offsets, async first (AC-6.8)', () => {
      const original = 'function get() {\n  return "{}";\n}\n';
      const at = original.indexOf('  return');
      const result = applyTextChanges(original, [
        { from: 0, to: 0, insert: 'async ' },
        { from: at, to: at, insert: '  await x();\n' },
      ]);
      expect(result).toBe('async function get() {\n  await x();\n  return "{}";\n}\n');
    });

    it('replaces ranges and keeps array order for changes at the same offset', () => {
      expect(
        applyTextChanges('0123456789', [
          { from: 2, to: 4, insert: 'ab' },
          { from: 6, to: 6, insert: 'X' },
          { from: 6, to: 6, insert: 'Y' },
        ]),
      ).toBe('01ab45XY6789');
    });
  });
  ```

  Run: `npx vitest run src/app/starter-session/applyTextChanges.test.ts`. Expect: FAIL, `Failed to resolve import "./applyTextChanges"`.

- [ ] **Step 2: Implement `applyTextChanges`, run, commit**

  ```ts file=src/app/starter-session/applyTextChanges.ts
  import type { TextChange } from '@/lib/code-analysis/codeAnalysis.types';

  // Offsets refer to the original text and changes come ordered by `from` (Phase 03), so apply from the end.
  export function applyTextChanges(text: string, changes: readonly TextChange[]): string {
    let result = text;
    for (let i = changes.length - 1; i >= 0; i -= 1) {
      const change = changes[i];
      if (change === undefined) continue;
      result = result.slice(0, change.from) + change.insert + result.slice(change.to);
    }
    return result;
  }
  ```

  ```bash
  npx vitest run src/app/starter-session/applyTextChanges.test.ts
  npx prettier --write src/app/starter-session
  git add src/app/starter-session/applyTextChanges.ts src/app/starter-session/applyTextChanges.test.ts
  git commit -m "feat(starter-session): apply insertion changes against the original text"
  ```

  Expect: PASS, 3 tests.

- [ ] **Step 3: Write the deps, the fake deps and the reducer test**

  ```ts file=src/app/starter-session/starterDeps.ts
  import { isLiquidAllowed } from '@/services/generators/client/client';
  import { generateHandler } from '@/services/generators/handlers';
  import type { GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';

  export type StarterDeps = {
    generateHandler: (id: RecipeId) => GeneratedHandler;
    isLiquidAllowed: (recipe: RecipeMeta, serverText: string) => boolean;
  };

  // The real Part B generators. Tests pass FAKE_STARTER_DEPS instead.
  export const STARTER_DEPS: StarterDeps = { generateHandler, isLiquidAllowed };
  ```

  ```ts file=src/app/starter-session/fakeStarterDeps.ts
  import type { StarterDeps } from './starterDeps';

  // Test helper. CRLF on purpose, so tests prove the reducer normalises generated text (AC-4.10).
  export const FAKE_STARTER_DEPS: StarterDeps = {
    generateHandler: (id) => ({
      text: `function get() {\r\n  return JSON.stringify({ status: "success", recipe: "${id}" });\r\n}\r\n`,
      highlightLines: [2],
    }),
    isLiquidAllowed: (recipe, serverText) => recipe.liquid && !serverText.includes('Server.Context.Body'),
  };
  ```

  ```ts file=src/app/starter-session/starterReducer.test.ts
  import { describe, expect, it } from 'vitest';
  import type { StarterAction, StarterState } from './starterSession.types';
  import { FAKE_STARTER_DEPS } from './fakeStarterDeps';
  import {
    DEFAULT_NAME,
    LIQUID_RESET_NOTICE,
    createStarterReducer,
    initialStarterState,
  } from './starterReducer';

  const reduce = createStarterReducer(FAKE_STARTER_DEPS);
  const run = (...actions: StarterAction[]): StarterState =>
    actions.reduce(reduce, initialStarterState(FAKE_STARTER_DEPS));
  const generated = (id: string) =>
    `function get() {\n  return JSON.stringify({ status: "success", recipe: "${id}" });\n}\n`;

  describe('initialStarterState (AC-5.9 defaults)', () => {
    it('starts on customer-summary, R1, GET, fetch, the generated LF text and unreviewed', () => {
      expect(initialStarterState(FAKE_STARTER_DEPS)).toEqual({
        name: DEFAULT_NAME,
        method: 'GET',
        recipe: 'R1',
        language: 'fetch',
        serverText: generated('R1'),
        generatedText: generated('R1'),
        cursor: null,
        reviewedText: null,
        pendingNotice: null,
      });
      expect(DEFAULT_NAME).toBe('customer-summary');
    });
  });

  describe('selectRecipe (AC-2.8, AC-3.8)', () => {
    it('regenerates the text and resets the method to the recipe default', () => {
      const state = run({ type: 'selectRecipe', recipe: 'R2' });
      expect(state.recipe).toBe('R2');
      expect(state.method).toBe('POST');
      expect(state.serverText).toBe(generated('R2'));
      expect(state.generatedText).toBe(generated('R2'));
      expect(state.cursor).toBeNull();
    });

    it('resets Permissions to needs review', () => {
      const state = run({ type: 'markReviewed' }, { type: 'selectRecipe', recipe: 'R4' });
      expect(state.reviewedText).toBeNull();
    });

    it('resets Liquid to fetch when the new recipe has no Liquid support', () => {
      const state = run({ type: 'setLanguage', language: 'liquid' }, { type: 'selectRecipe', recipe: 'R2' });
      expect(state.language).toBe('fetch');
      expect(state.pendingNotice).toBeNull();
    });

    it('fixes R8 to Liquid with no method, and resets to fetch when leaving R8', () => {
      const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
      expect(r8.language).toBe('liquid');
      expect(r8.method).toBeNull();
      expect(reduce(r8, { type: 'selectRecipe', recipe: 'R1' }).language).toBe('fetch');
    });

    it('keeps jQuery across recipes', () => {
      const state = run({ type: 'setLanguage', language: 'jquery' }, { type: 'selectRecipe', recipe: 'R4' });
      expect(state.language).toBe('jquery');
    });
  });

  describe('setMethod (AC-2.10)', () => {
    it('selects an exported method', () => {
      expect(run({ type: 'selectRecipe', recipe: 'R4' }, { type: 'setMethod', method: 'DELETE' }).method).toBe('DELETE');
    });

    it('ignores a method the recipe does not export, returning the same state', () => {
      const r4 = run({ type: 'selectRecipe', recipe: 'R4' });
      expect(reduce(r4, { type: 'setMethod', method: 'PATCH' })).toBe(r4);
      const r1 = run();
      expect(reduce(r1, { type: 'setMethod', method: 'POST' })).toBe(r1);
    });

    it('never sets a method on R8', () => {
      const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
      expect(reduce(r8, { type: 'setMethod', method: 'GET' })).toBe(r8);
    });
  });

  describe('setLanguage (AC-4.4, AC-4.7, AC-3.8)', () => {
    it('switches between fetch, jQuery and an allowed Liquid', () => {
      expect(run({ type: 'setLanguage', language: 'jquery' }).language).toBe('jquery');
      expect(run({ type: 'setLanguage', language: 'liquid' }).language).toBe('liquid');
    });

    it('ignores Liquid when the rule forbids it', () => {
      const r2 = run({ type: 'selectRecipe', recipe: 'R2' });
      expect(reduce(r2, { type: 'setLanguage', language: 'liquid' })).toBe(r2);
    });

    it('ignores any other language on R8', () => {
      const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
      expect(reduce(r8, { type: 'setLanguage', language: 'fetch' })).toBe(r8);
    });
  });

  describe('editServer (AC-4.3, AC-4.10, AC-4.7)', () => {
    it('stores LF-only text and the cursor', () => {
      const state = run({ type: 'editServer', text: 'a\r\nb\rc', cursor: 3 });
      expect(state.serverText).toBe('a\nb\nc');
      expect(state.cursor).toBe(3);
    });

    it('resets Liquid to fetch with the toast when an edit reads an HTTP-only property', () => {
      const state = run(
        { type: 'setLanguage', language: 'liquid' },
        { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
      );
      expect(state.language).toBe('fetch');
      expect(state.pendingNotice).toEqual(LIQUID_RESET_NOTICE);
      expect(LIQUID_RESET_NOTICE).toEqual({
        title: "Switched to fetch: this code can't be called from Liquid",
        body: '',
        type: 'info',
      });
    });

    it('does not switch back to Liquid when the edit is undone', () => {
      const state = run(
        { type: 'setLanguage', language: 'liquid' },
        { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
        { type: 'clearNotice' },
        { type: 'editServer', text: generated('R1'), cursor: null },
      );
      expect(state.language).toBe('fetch');
      expect(state.pendingNotice).toBeNull();
    });

    it('keeps R8 on Liquid whatever the text (Decision 6)', () => {
      const state = run(
        { type: 'selectRecipe', recipe: 'R8' },
        { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
      );
      expect(state.language).toBe('liquid');
      expect(state.pendingNotice).toBeNull();
    });
  });

  describe('applyChanges (AC-6.8 transaction)', () => {
    it('applies the async change and the insertion in one step', () => {
      const before = run();
      const at = before.serverText.indexOf('  return');
      const state = reduce(before, {
        type: 'applyChanges',
        changes: [
          { from: 0, to: 0, insert: 'async ' },
          { from: at, to: at, insert: '  await Server.Connector.HttpClient.GetAsync(u, h);\n' },
        ],
        cursor: 10,
      });
      expect(state.serverText.startsWith('async function get() {\n  await Server.Connector')).toBe(true);
      expect(state.cursor).toBe(10);
    });

    it('runs the Liquid rule once on the result', () => {
      const before = run({ type: 'setLanguage', language: 'liquid' });
      const state = reduce(before, {
        type: 'applyChanges',
        changes: [{ from: 0, to: 0, insert: 'const b = Server.Context.Body;\n' }],
        cursor: null,
      });
      expect(state.language).toBe('fetch');
      expect(state.pendingNotice).toEqual(LIQUID_RESET_NOTICE);
    });
  });

  describe('review (AC-5.4)', () => {
    it('stores the text at the moment of marking, and Undo review clears it', () => {
      const marked = run({ type: 'markReviewed' });
      expect(marked.reviewedText).toBe(marked.serverText);
      expect(reduce(marked, { type: 'undoReview' }).reviewedText).toBeNull();
    });

    it('keeps the stored text through edits, so returning to it restores the mark', () => {
      const edited = run({ type: 'markReviewed' }, { type: 'editServer', text: 'x', cursor: null });
      expect(edited.reviewedText).toBe(generated('R1'));
      const back = reduce(edited, { type: 'editServer', text: generated('R1'), cursor: null });
      expect(back.reviewedText).toBe(back.serverText);
    });
  });

  describe('startOver (AC-5.9)', () => {
    it('returns to the defaults from any state', () => {
      const state = run(
        { type: 'setName', name: 'Orders!' },
        { type: 'selectRecipe', recipe: 'R4' },
        { type: 'setMethod', method: 'DELETE' },
        { type: 'setLanguage', language: 'jquery' },
        { type: 'editServer', text: 'x', cursor: 1 },
        { type: 'markReviewed' },
        { type: 'startOver' },
      );
      expect(state).toEqual(initialStarterState(FAKE_STARTER_DEPS));
    });
  });

  describe('small actions', () => {
    it('sets the name, the cursor and clears a notice', () => {
      const state = run({ type: 'setName', name: 'Customer Summary!' }, { type: 'setCursor', cursor: 5 });
      expect(state.name).toBe('Customer Summary!');
      expect(state.cursor).toBe(5);
    });
  });
  ```

  The R-number facts above come from the FR-3 table through Phase 05's catalogue: R1 exports `get` (default GET, Liquid yes), R2 `post` (default POST, Liquid no), R4 `get`, `post`, `put`, `del` (no PATCH), R8 `getSummary` (no method, Liquid). If Phase 05's catalogue disagrees, the catalogue test there is the authority; fix this test's expectation only if the spec table says the same.

  Run: `npx vitest run src/app/starter-session/starterReducer.test.ts`. Expect: FAIL, `Failed to resolve import "./starterReducer"`.

- [ ] **Step 4: Implement the reducer, run, commit**

  ```ts file=src/app/starter-session/starterReducer.ts
  import { getRecipe, methodEnabled } from '@/services/catalogue/recipes';
  import type { Notice } from '@/services/pptb/host.types';
  import { normalizeLf } from '@/lib/text';
  import type { RecipeId } from '@/types/recipe';
  import { applyTextChanges } from './applyTextChanges';
  import type { StarterDeps } from './starterDeps';
  import type { StarterAction, StarterState } from './starterSession.types';

  export const DEFAULT_RECIPE: RecipeId = 'R1';
  export const DEFAULT_NAME = 'customer-summary';
  export const LIQUID_RESET_NOTICE: Notice = {
    title: "Switched to fetch: this code can't be called from Liquid",
    body: '',
    type: 'info',
  };

  function generated(deps: StarterDeps, recipe: RecipeId): string {
    return normalizeLf(deps.generateHandler(recipe).text);
  }

  export function initialStarterState(deps: StarterDeps): StarterState {
    const text = generated(deps, DEFAULT_RECIPE);
    return {
      name: DEFAULT_NAME,
      method: getRecipe(DEFAULT_RECIPE).defaultMethod,
      recipe: DEFAULT_RECIPE,
      language: 'fetch',
      serverText: text,
      generatedText: text,
      cursor: null,
      reviewedText: null,
      pendingNotice: null,
    };
  }

  export function createStarterReducer(
    deps: StarterDeps,
  ): (state: StarterState, action: StarterAction) => StarterState {
    // AC-4.7: a text change that makes Liquid impossible resets to fetch with a toast. R8 is exempt (Decision 6).
    function withText(state: StarterState, text: string, cursor: number | null): StarterState {
      const next = { ...state, serverText: normalizeLf(text), cursor };
      const recipe = getRecipe(state.recipe);
      if (state.language === 'liquid' && state.recipe !== 'R8' && !deps.isLiquidAllowed(recipe, next.serverText)) {
        return { ...next, language: 'fetch', pendingNotice: LIQUID_RESET_NOTICE };
      }
      return next;
    }

    return (state, action) => {
      switch (action.type) {
        case 'setName':
          return { ...state, name: action.name };
        case 'setMethod':
          return methodEnabled(getRecipe(state.recipe), action.method) ? { ...state, method: action.method } : state;
        case 'selectRecipe': {
          const recipe = getRecipe(action.recipe);
          const text = generated(deps, action.recipe);
          const language =
            action.recipe === 'R8'
              ? 'liquid'
              : state.recipe === 'R8' || (state.language === 'liquid' && !deps.isLiquidAllowed(recipe, text))
                ? 'fetch'
                : state.language;
          return {
            ...state,
            recipe: action.recipe,
            method: recipe.defaultMethod,
            language,
            serverText: text,
            generatedText: text,
            cursor: null,
            reviewedText: null,
          };
        }
        case 'setLanguage': {
          if (state.recipe === 'R8') return state;
          if (action.language === 'liquid' && !deps.isLiquidAllowed(getRecipe(state.recipe), state.serverText)) {
            return state;
          }
          return { ...state, language: action.language };
        }
        case 'editServer':
          return withText(state, action.text, action.cursor);
        case 'setCursor':
          return { ...state, cursor: action.cursor };
        case 'applyChanges':
          return withText(state, applyTextChanges(state.serverText, action.changes), action.cursor);
        case 'markReviewed':
          return { ...state, reviewedText: state.serverText };
        case 'undoReview':
          return { ...state, reviewedText: null };
        case 'startOver':
          return initialStarterState(deps);
        case 'clearNotice':
          return { ...state, pendingNotice: null };
        default: {
          const unreachable: never = action;
          return unreachable;
        }
      }
    };
  }
  ```

  ```bash
  npx vitest run src/app/starter-session/starterReducer.test.ts
  npx prettier --write src/app/starter-session
  npx eslint src/app/starter-session --max-warnings=0
  git add src/app/starter-session/starterDeps.ts src/app/starter-session/fakeStarterDeps.ts src/app/starter-session/starterReducer.ts src/app/starter-session/starterReducer.test.ts
  git commit -m "feat(starter-session): add the Starter session reducer"
  ```

  Expect: PASS, 22 tests. The `never` default satisfies `switch-exhaustiveness-check`. If ESLint reports `@typescript-eslint/no-unnecessary-condition` on the `default` branch, the switch is already exhaustive: keep the `never` check (`.claude/rules/typescript.md` asks for it) and add `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exhaustiveness check` above `default:`.

- [ ] **Step 5: Write the derived-values test**

  ```ts file=src/app/starter-session/deriveStarter.test.ts
  import { describe, expect, it } from 'vitest';
  import type { StarterState } from './starterSession.types';
  import { deriveStarter } from './deriveStarter';
  import { FAKE_STARTER_DEPS } from './fakeStarterDeps';
  import { createStarterReducer, initialStarterState } from './starterReducer';

  const reduce = createStarterReducer(FAKE_STARTER_DEPS);
  const start = (): StarterState => initialStarterState(FAKE_STARTER_DEPS);
  const derive = (state: StarterState) => deriveStarter(state, FAKE_STARTER_DEPS);

  describe('deriveStarter', () => {
    it('slugifies the name (AC-2.2) and reports when it differs', () => {
      const d = derive(reduce(start(), { type: 'setName', name: 'Customer Summary!' }));
      expect(d.slug).toBe('customer-summary');
      expect(d.slugDiffers).toBe(true);
      expect(derive(start()).slugDiffers).toBe(false);
    });

    it('maps the method to Learn function names (AC-2.6) and uses getSummary for R8', () => {
      const r4 = reduce(start(), { type: 'selectRecipe', recipe: 'R4' });
      expect(derive(r4).fn).toBe('get');
      expect(derive(reduce(r4, { type: 'setMethod', method: 'DELETE' })).fn).toBe('del');
      expect(derive(reduce(start(), { type: 'selectRecipe', recipe: 'R8' })).fn).toBe('getSummary');
    });

    it('reports edits against the generated text, and clears it when the text is restored (AC-2.9)', () => {
      const edited = reduce(start(), { type: 'editServer', text: 'x', cursor: null });
      expect(derive(edited).edited).toBe(true);
      const restored = reduce(edited, { type: 'editServer', text: start().generatedText, cursor: null });
      expect(derive(restored).edited).toBe(false);
    });

    it('marks Browser checks complete only with no hits and a successful parse (AC-5.2)', () => {
      expect(derive(start()).readiness.browser).toBe(true);
      const blocked = reduce(start(), { type: 'editServer', text: 'function get() { return eval("1"); }', cursor: null });
      expect(derive(blocked).checks.hits.length).toBeGreaterThan(0);
      expect(derive(blocked).readiness.browser).toBe(false);
      const unparsable = reduce(start(), { type: 'editServer', text: 'function get( {', cursor: null });
      expect(derive(unparsable).checks.parseFailed).toBe(true);
      expect(derive(unparsable).readiness.browser).toBe(false);
    });

    it('keeps Validation complete, even after edits (AC-5.3)', () => {
      expect(derive(reduce(start(), { type: 'editServer', text: 'x', cursor: null })).readiness.validation).toBe(true);
    });

    it('marks Permissions reviewed only while the text equals the reviewed text (AC-5.4)', () => {
      const marked = reduce(start(), { type: 'markReviewed' });
      expect(derive(marked).readiness.permissions).toBe(true);
      const edited = reduce(marked, { type: 'editServer', text: 'x', cursor: null });
      expect(derive(edited).readiness.permissions).toBe(false);
      const back = reduce(edited, { type: 'editServer', text: marked.serverText, cursor: null });
      expect(derive(back).readiness.permissions).toBe(true);
    });

    it('counts K of 3 (AC-5.1)', () => {
      expect(derive(start()).ready).toBe(2);
      expect(derive(reduce(start(), { type: 'markReviewed' })).ready).toBe(3);
      const blocked = reduce(start(), { type: 'editServer', text: 'eval("1");', cursor: null });
      expect(derive(blocked).ready).toBe(1);
    });

    it('evaluates the Liquid rule and the used members on the current text (AC-4.7, FR-6)', () => {
      expect(derive(start()).liquidAllowed).toBe(true);
      const body = reduce(start(), { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null });
      expect(derive(body).liquidAllowed).toBe(false);
      expect(derive(body).usedMembers.get('Server.Context')).toEqual(['Body']);
    });
  });
  ```

  The `eval(` and unparsable cases use Phase 02's real checker, and the used-members case Phase 03's real analyser, so their exact shapes (`hits`, `parseFailed`, the `Map` key `Server.Context`) are those phases' contracts. If Phase 03 keys members differently, use its key here.

  Run: `npx vitest run src/app/starter-session/deriveStarter.test.ts`. Expect: FAIL, `Failed to resolve import "./deriveStarter"`.

- [ ] **Step 6: Implement `deriveStarter`, run, commit**

  ```ts file=src/app/starter-session/deriveStarter.ts
  import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
  import { usedServerMembers } from '@/lib/code-analysis/structure';
  import { slugify } from '@/lib/slug';
  import { getRecipe } from '@/services/catalogue/recipes';
  import { METHOD_FUNCTION } from '@/types/http';
  import type { StarterDeps } from './starterDeps';
  import type { StarterDerived, StarterState } from './starterSession.types';

  // Validation is always complete (AC-5.3), so K is at least 1.
  function readyCount(browser: boolean, permissions: boolean): 1 | 2 | 3 {
    if (browser && permissions) return 3;
    return browser || permissions ? 2 : 1;
  }

  export function deriveStarter(state: StarterState, deps: StarterDeps): StarterDerived {
    const recipe = getRecipe(state.recipe);
    const { slug, differs } = slugify(state.name);
    const checks = runBrowserChecks(state.serverText);
    const browser = checks.hits.length === 0 && !checks.parseFailed;
    const permissions = state.reviewedText !== null && state.reviewedText === state.serverText;
    return {
      slug,
      slugDiffers: differs,
      fn: state.method === null ? (recipe.functions[0] ?? '') : METHOD_FUNCTION[state.method],
      edited: state.serverText !== state.generatedText,
      checks,
      liquidAllowed: deps.isLiquidAllowed(recipe, state.serverText),
      usedMembers: usedServerMembers(state.serverText),
      readiness: { browser, validation: true, permissions },
      ready: readyCount(browser, permissions),
    };
  }
  ```

  ```bash
  npx vitest run src/app/starter-session/deriveStarter.test.ts
  npx prettier --write src/app/starter-session
  npx eslint src/app/starter-session --max-warnings=0
  git add src/app/starter-session/deriveStarter.ts src/app/starter-session/deriveStarter.test.ts
  git commit -m "feat(starter-session): derive slug, function, checks and readiness"
  ```

  Expect: PASS, 8 tests.

- [ ] **Step 7: Write the provider test**

  ```tsx file=src/app/starter-session/StarterSessionProvider.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import type { ReactElement } from 'react';
  import { HostContext } from '@/app/HostContext';
  import { NotifyProvider } from '@/app/NotifyProvider';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import { FAKE_STARTER_DEPS } from './fakeStarterDeps';
  import { LIQUID_RESET_NOTICE } from './starterReducer';
  import { StarterSessionProvider } from './StarterSessionProvider';
  import { useStarterSession } from './useStarterSession';

  afterEach(cleanup);

  function Probe(): ReactElement {
    const { state, dispatch, derived } = useStarterSession();
    return (
      <div>
        <p>{`${derived.slug} ${state.language} ${String(derived.ready)}/3`}</p>
        <button type="button" onClick={() => { dispatch({ type: 'setName', name: 'Orders' }); }}>
          rename
        </button>
        <button type="button" onClick={() => { dispatch({ type: 'setLanguage', language: 'liquid' }); }}>
          liquid
        </button>
        <button
          type="button"
          onClick={() => { dispatch({ type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null }); }}
        >
          read body
        </button>
      </div>
    );
  }

  function mount() {
    const host = createFakeHost();
    render(
      <HostContext value={host}>
        <NotifyProvider>
          <StarterSessionProvider deps={FAKE_STARTER_DEPS}>
            <Probe />
          </StarterSessionProvider>
        </NotifyProvider>
      </HostContext>,
    );
    return host;
  }

  describe('StarterSessionProvider', () => {
    it('provides state, dispatch and derived values', () => {
      mount();
      expect(screen.getByText('customer-summary fetch 2/3')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'rename' }));
      expect(screen.getByText('orders fetch 2/3')).toBeTruthy();
    });

    it('sends the Liquid reset notice once through useNotify and clears it (AC-4.7)', async () => {
      const host = mount();
      fireEvent.click(screen.getByRole('button', { name: 'liquid' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'read body' }));
        await Promise.resolve();
      });
      expect(screen.getByText('customer-summary fetch 2/3')).toBeTruthy();
      expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice: LIQUID_RESET_NOTICE }]);
    });

    it('throws a clear error outside the provider', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<Probe />)).toThrow('useStarterSession must be used inside StarterSessionProvider');
    });
  });
  ```

  Run: `npx vitest run src/app/starter-session/StarterSessionProvider.test.tsx`. Expect: FAIL: the provider and hook are Phase 00 stubs (`not implemented: phase 18a`).

- [ ] **Step 8: Implement the hook and the provider, run, commit**

  ```ts file=src/app/starter-session/useStarterSession.ts
  import { createContext, use } from 'react';
  import type { StarterAction, StarterDerived, StarterState } from '@/app/starter-session/starterSession.types';

  type StarterSession = { state: StarterState; dispatch: (a: StarterAction) => void; derived: StarterDerived };

  export const StarterSessionContext = createContext<StarterSession | null>(null);

  export function useStarterSession(): {
    state: StarterState;
    dispatch: (a: StarterAction) => void;
    derived: StarterDerived;
  } {
    const session = use(StarterSessionContext);
    if (session === null) throw new Error('useStarterSession must be used inside StarterSessionProvider');
    return session;
  }
  ```

  ```tsx file=src/app/starter-session/StarterSessionProvider.tsx
  import { useEffect, useReducer } from 'react';
  import type { ReactNode } from 'react';
  import { useNotify } from '@/app/useNotify';
  import { deriveStarter } from './deriveStarter';
  import { STARTER_DEPS } from './starterDeps';
  import type { StarterDeps } from './starterDeps';
  import { createStarterReducer, initialStarterState } from './starterReducer';
  import { StarterSessionContext } from './useStarterSession';

  export function StarterSessionProvider({
    children,
    deps = STARTER_DEPS,
  }: {
    readonly children: ReactNode;
    readonly deps?: StarterDeps;
  }): ReactNode {
    const [state, dispatch] = useReducer(createStarterReducer(deps), deps, initialStarterState);
    const notify = useNotify();
    const derived = deriveStarter(state, deps);

    // The notice is a message to the host, an external system, so an effect sends it once and clears it.
    const notice = state.pendingNotice;
    useEffect(() => {
      if (notice === null) return;
      notify(notice);
      dispatch({ type: 'clearNotice' });
    }, [notice, notify]);

    return <StarterSessionContext value={{ state, dispatch, derived }}>{children}</StarterSessionContext>;
  }
  ```

  ```bash
  npx vitest run src/app/starter-session
  npx prettier --write src/app/starter-session
  npx eslint src/app/starter-session --max-warnings=0
  git add src/app/starter-session
  git commit -m "feat(starter-session): provide the shared Starter session"
  ```

  Expect: PASS, all four test files (3 + 22 + 8 + 3 = 36 tests). The pinned `useStarterSession` signature in `src/skeleton.test.ts` still matches. React Compiler memoizes `deriveStarter` on `state`; do not add `useMemo` (`.claude/rules/react.md`). The notify identity from `NotifyProvider` changes per render, which only re-runs the effect while a notice is pending, and the effect clears it, so it sends once. If `react-hooks/set-state-in-effect` (react-hooks v7) reports the `dispatch` in the effect, this is the case the rule allows for: the effect syncs with an external system (the host notification) and then acknowledges it. Add `// eslint-disable-next-line react-hooks/set-state-in-effect -- acknowledges a notice already sent to the host` above that line rather than moving the side effect into the reducer.

- [ ] **Step 9: Mount the provider in `App` and update the App test**

  In `src/app/App.tsx` (Phase 06's file; this is its only other editor):

  ```tsx
  import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
  import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
  import type { StarterDeps } from '@/app/starter-session/starterDeps';

  export type AppProps = { host: PptbHost; starterDeps?: StarterDeps };

  export function App({ host, starterDeps = STARTER_DEPS }: AppProps): ReactElement {
    // ...unchanged above the <main> element
  ```

  Wrap the Starter and Server Objects panels, and only when Starter is released (Decision 3). Inside `<main className="shell__content">`:

  ```tsx
  {__PAGE_STARTER__ ? (
    <StarterSessionProvider deps={starterDeps}>
      <Panel id="starter" label="Logic Starter" view={view}>
        <StarterPage />
      </Panel>
      {__PAGE_OBJECTS__ ? (
        <Panel id="objects" label="Server Objects" view={view}>
          <ServerObjectsPage />
        </Panel>
      ) : null}
    </StarterSessionProvider>
  ) : __PAGE_OBJECTS__ ? (
    <Panel id="objects" label="Server Objects" view={view}>
      <ServerObjectsPage />
    </Panel>
  ) : null}
  {__PAGE_INSPECTOR__ ? (
    <Panel id="inspector" label="Logic Inspector" view={view}>
      <InspectorPage />
    </Panel>
  ) : null}
  ```

  In `src/app/App.test.tsx`, change both renders to pass the fake deps:

  ```tsx
  import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
  // ...
  render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
  ```

  Then run:

  ```bash
  npx vitest run src/app
  npx prettier --write src/app
  npx tsc -b
  npx eslint . --max-warnings=0
  npx vitest run
  npm run build
  git add -A
  git commit -m "feat(app): mount the Starter session around the Starter and Server Objects pages"
  ```

  Expect: all green. Without the fake deps, `App.test.tsx` would hit the Phase 00 `r1.ts` stub (`not implemented: phase 07`) until Part B lands; that is the reason for the prop, not a test-only hack. The build-shape test still finds the three placeholders and still drops unreleased pages.

## Phase verification

```bash
npx tsc -b
npx eslint . --max-warnings=0
npx prettier --check .
npx vitest run
npm run build
grep -rn "useMemo\|useCallback\|toolboxAPI\|settings\." src/app/starter-session
git status --short
```

Expect: the first five pass; the `grep` prints nothing (no manual memoisation, no host globals, nothing written to tool settings, FR-5a); a clean tree.

## Done when

- `initialStarterState`, `createStarterReducer` and `deriveStarter` implement the pinned `StarterState`, `StarterAction` and `StarterDerived` with the rules in Decisions 1 and 4 to 9, and the AC list in the header is covered by `starterReducer.test.ts` and `deriveStarter.test.ts`.
- `applyChanges` applies an insertion and its `async` change as one update against the original offsets.
- `useStarterSession` works inside `StarterSessionProvider`, which `App` mounts around the Starter and Server Objects panels when Starter is released; the Liquid reset toast goes out once through `useNotify`.
- No Part B function is imported by the reducer or `deriveStarter`; both reach the generators only through `StarterDeps`.
