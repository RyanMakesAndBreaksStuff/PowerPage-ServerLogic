import type { RecipeId, RecipeMeta } from '@/types/recipe';

export const RECIPES: readonly RecipeMeta[] = [];

export function getRecipe(_id: RecipeId): RecipeMeta {
  throw new Error('not implemented: phase 05');
}
