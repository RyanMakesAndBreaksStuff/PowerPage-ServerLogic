import { describe, expect, it } from 'vitest';
import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
import { HTTP_METHODS } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import {
  collisionNote,
  recipeCountLabel,
  visibleRecipes,
  EDITED_VALIDATION_NOTE,
  LIQUID_BLOCKED_REASON,
  LIQUID_ONLY_REASON,
  languageOptions,
  methodFilterOptions,
  recipeSupportsMethod,
} from './starterOptions';

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

describe('recipeCountLabel (AC-3.1)', () => {
  it('is singular for one recipe and plural otherwise', () => {
    expect(recipeCountLabel(1)).toBe('1 recipe');
    expect(recipeCountLabel(0)).toBe('0 recipes');
    expect(recipeCountLabel(10)).toBe('10 recipes');
  });
});

describe('visibleRecipes', () => {
  it('combines the text query and the method filter', () => {
    expect(visibleRecipes('', 'PATCH').map((r) => r.name)).toEqual(['Call a Dataverse custom API']);
    expect(visibleRecipes('cloudflow', 'PATCH')).toEqual([]);
    expect(visibleRecipes('', null)).toHaveLength(10);
  });
});

describe('methodFilterOptions (finding 10)', () => {
  it('keeps every filter enabled and derives eligibility from exported functions', () => {
    expect(methodFilterOptions().map(({ value, disabledReason }) => [value, disabledReason])).toEqual(
      HTTP_METHODS.map((method) => [method, null]),
    );
    for (const method of HTTP_METHODS) {
      expect(
        RECIPES.filter((recipe) => recipeSupportsMethod(recipe, method)).every(
          (recipe) => recipe.id !== 'R8',
        ),
      ).toBe(true);
    }
    expect(recipeSupportsMethod(getRecipe('R10'), 'PATCH')).toBe(true);
    expect(recipeSupportsMethod(getRecipe('R8'), 'GET')).toBe(false);
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
