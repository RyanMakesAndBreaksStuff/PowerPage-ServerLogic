import type { PillOption } from '@/components/PillGroup';
import { methodEnabled } from '@/services/catalogue/recipes';
import { HTTP_METHODS } from '@/types/http';
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

/** All five HTTP methods remain selectable as recipe filters. */
export function methodFilterOptions(): readonly PillOption<HttpMethod>[] {
  return HTTP_METHODS.map((method) => ({ value: method, label: method, disabledReason: null }));
}

/** Whether a recipe exports the function associated with a method filter. */
export function recipeSupportsMethod(recipe: RecipeMeta, method: HttpMethod): boolean {
  return methodEnabled(recipe, method);
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
