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
