import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeId, RecipeMeta } from '@/types/recipe';

export function generateClient(_i: {
  slug: string;
  recipe: RecipeId;
  fn: string;
  method: HttpMethod | null;
  language: ClientLanguage;
}): string {
  throw new Error('not implemented: phase 10');
}

export function requestPathSteps(
  _language: ClientLanguage,
  _slug: string,
  _fn: string,
): readonly { label: string; value: string }[] {
  throw new Error('not implemented: phase 10');
}

export function isLiquidAllowed(_recipe: RecipeMeta, _serverText: string): boolean {
  throw new Error('not implemented: phase 10');
}
