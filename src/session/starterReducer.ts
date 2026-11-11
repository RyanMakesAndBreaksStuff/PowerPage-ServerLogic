import { getRecipe, methodEnabled } from '@/services/catalogue/recipes';
import type { Notice } from '@/services/pptb/host.types';
import { applyChanges } from '@/lib/code-analysis/structureInsert';
import { normalizeLf } from '@/lib/text';
import type { RecipeId } from '@/types/recipe';
import type { StarterDeps } from '@/session/starterDeps';
import type { StarterAction, StarterState } from '@/types/starter';

const DEFAULT_RECIPE: RecipeId = 'R1';
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
    recipeMethodFilter: null,
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
    if (
      state.language === 'liquid' &&
      state.recipe !== 'R8' &&
      !deps.isLiquidAllowed(recipe, next.serverText)
    ) {
      return { ...next, language: 'fetch', pendingNotice: LIQUID_RESET_NOTICE };
    }
    return next;
  }

  return (state, action) => {
    switch (action.type) {
      case 'setName':
        return { ...state, name: action.name };
      case 'setMethod':
        return methodEnabled(getRecipe(state.recipe), action.method)
          ? { ...state, method: action.method }
          : state;
      case 'setRecipeMethodFilter':
        return { ...state, recipeMethodFilter: action.method };
      case 'selectRecipe': {
        const recipe = getRecipe(action.recipe);
        const text = generated(deps, action.recipe);
        // AC-4.7: losing Liquid because the new recipe can't use it gets the same toast as a text edit.
        // Leaving or entering R8 is exempt (Decision 6): R8 fixes the language.
        const liquidLost =
          state.language === 'liquid' &&
          state.recipe !== 'R8' &&
          action.recipe !== 'R8' &&
          !deps.isLiquidAllowed(recipe, text);
        const language =
          action.recipe === 'R8' ? 'liquid' : state.recipe === 'R8' || liquidLost ? 'fetch' : state.language;
        return {
          ...state,
          recipe: action.recipe,
          method:
            action.preferredMethod !== undefined && methodEnabled(recipe, action.preferredMethod)
              ? action.preferredMethod
              : recipe.defaultMethod,
          language,
          serverText: text,
          generatedText: text,
          cursor: null,
          reviewedText: null,
          pendingNotice: liquidLost ? LIQUID_RESET_NOTICE : state.pendingNotice,
        };
      }
      case 'setLanguage': {
        if (state.recipe === 'R8') return state;
        if (
          action.language === 'liquid' &&
          !deps.isLiquidAllowed(getRecipe(state.recipe), state.serverText)
        ) {
          return state;
        }
        return { ...state, language: action.language };
      }
      case 'editServer':
        return withText(state, action.text, action.cursor);
      case 'setCursor':
        return { ...state, cursor: action.cursor };
      case 'applyChanges':
        return withText(state, applyChanges(state.serverText, action.changes), action.cursor);
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
