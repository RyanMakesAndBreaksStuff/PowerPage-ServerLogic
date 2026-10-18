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
      case 'selectRecipe': {
        const recipe = getRecipe(action.recipe);
        const text = generated(deps, action.recipe);
        const language =
          action.recipe === 'R8'
            ? 'liquid'
            : state.recipe === 'R8' ||
                (state.language === 'liquid' && !deps.isLiquidAllowed(recipe, text))
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
