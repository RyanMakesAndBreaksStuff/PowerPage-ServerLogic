import type { GeneratedHandler, RecipeId } from '@/types/recipe';
import { generateR1 } from './r1';
import { generateR2 } from './r2';
import { generateR3 } from './r3';
import { generateR4 } from './r4';
import { generateR5 } from './r5';
import { generateR6 } from './r6';
import { generateR7 } from './r7';
import { generateR8 } from './r8';
import { generateR9 } from './r9';
import { generateR10 } from './r10';

const GENERATORS = {
  R1: generateR1,
  R2: generateR2,
  R3: generateR3,
  R4: generateR4,
  R5: generateR5,
  R6: generateR6,
  R7: generateR7,
  R8: generateR8,
  R9: generateR9,
  R10: generateR10,
} as const satisfies Record<RecipeId, () => GeneratedHandler>;

export function generateHandler(id: RecipeId): GeneratedHandler {
  return GENERATORS[id]();
}

export { generateDemoPage } from './demoPages';
