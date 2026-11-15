import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { usedServerMembers } from '@/lib/code-analysis/structure';
import { slugify } from '@/lib/slug';
import { getRecipe } from '@/services/catalogue/recipes';
import { METHOD_FUNCTION } from '@/types/http';
import type { StarterDeps } from '@/session/starterDeps';
import type { StarterDerived, StarterState } from '@/types/starter';

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
