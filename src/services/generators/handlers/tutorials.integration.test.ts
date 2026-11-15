// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateDemoPage, generateHandler } from '@/services/generators/handlers';
import type { GeneratedHandler, RecipeId } from '@/types/recipe';
import { R4_DIFFERENCES, generateR4 } from './r4';
import { R5_DIFFERENCES, generateR5 } from './r5';
import { R6_DIFFERENCES, generateR6 } from './r6';
import { headerComment } from './snippets';

const ALL_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
] as const satisfies readonly RecipeId[];

const TUTORIAL_IDS = ['R4', 'R5', 'R6'] as const satisfies readonly RecipeId[];

type TutorialId = (typeof TUTORIAL_IDS)[number];

const GENERATORS = {
  R4: generateR4,
  R5: generateR5,
  R6: generateR6,
} as const satisfies Record<TutorialId, () => GeneratedHandler>;

const DIFFERENCES = [
  ['R4', R4_DIFFERENCES],
  ['R5', R5_DIFFERENCES],
  ['R6', R6_DIFFERENCES],
] as const;

/** Comment lines at the top of a handler, before the blank line that follows the header. */
function headerOf(text: string): string {
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('//')) break;
    lines.push(line);
  }
  return lines.join('\n');
}

describe('tutorial wiring', () => {
  it("generateHandler('R4'|'R5'|'R6') equals the generateR* output", () => {
    for (const id of TUTORIAL_IDS) {
      expect(generateHandler(id)).toEqual(GENERATORS[id]());
    }
  });

  it('for all ten ids, generateDemoPage is non-null exactly when getRecipe(id).demoPage', () => {
    expect(ALL_IDS).toHaveLength(10);
    for (const id of ALL_IDS) {
      const page = generateDemoPage(id, 'customer-summary');
      expect(page !== null).toBe(getRecipe(id).demoPage);
    }
  });

  it("each header comment contains the recipe's learnUrl", () => {
    for (const id of TUTORIAL_IDS) {
      const recipe = getRecipe(id);
      const learnUrl = recipe.learnUrl;
      if (learnUrl === null) throw new Error(`${id} has no Learn URL`);
      const header = headerOf(generateHandler(id).text);
      expect(header).toBe(headerComment(recipe));
      expect(header).toContain(learnUrl);
    }
  });

  it('every handler function listed in recipe.functions is exported, in order', () => {
    for (const id of TUTORIAL_IDS) {
      const names = exportedFunctionNames(generateHandler(id).text);
      expect(names).toEqual(getRecipe(id).functions);
    }
  });

  it('R4/R5/R6 DIFFERENCES exports are non-empty', () => {
    for (const [id, rows] of DIFFERENCES) {
      expect(rows.length, id).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.reason.length, id).toBeGreaterThan(0);
      }
    }
  });
});
