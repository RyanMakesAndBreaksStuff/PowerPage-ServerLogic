import type { RecipeId } from '@/types/recipe';

/** Data only. Phase 19 adds the R7 entries. This file does not import handlers. */
export const README_NOTES: Partial<Record<RecipeId, readonly string[]>> = {
  R3: ['`ExternalApi/BaseUrl` must not contain a query string.'],
  R4: ['The Global Create grant is expected, and Logic Inspector flags it.'],
  R9: [
    'The flow must validate its own inputs, because the handler passes the validated body through.',
  ],
};
