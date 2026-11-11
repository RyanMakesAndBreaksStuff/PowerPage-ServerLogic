import type { StarterDeps } from '@/session/starterDeps';

// Test helper. CRLF on purpose, so tests prove the reducer normalises generated text (AC-4.10).
export const FAKE_STARTER_DEPS: StarterDeps = {
  generateHandler: (id) => ({
    text: `function get() {\r\n  return JSON.stringify({ status: "success", recipe: "${id}" });\r\n}\r\n`,
    highlightLines: [2],
  }),
  isLiquidAllowed: (recipe, serverText) =>
    recipe.liquid && !serverText.includes('Server.Context.Body'),
};
