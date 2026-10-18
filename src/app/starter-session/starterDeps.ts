import { isLiquidAllowed } from '@/services/generators/client/client';
import { generateHandler } from '@/services/generators/handlers';
import type { GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';

export type StarterDeps = {
  generateHandler: (id: RecipeId) => GeneratedHandler;
  isLiquidAllowed: (recipe: RecipeMeta, serverText: string) => boolean;
};

// The real Part B generators. Tests pass FAKE_STARTER_DEPS instead.
export const STARTER_DEPS: StarterDeps = { generateHandler, isLiquidAllowed };
