import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import type { ConnectorUse } from '@/lib/code-analysis/codeAnalysis.types';
import {
  detectConnectorUse,
  exportedFunctionNames,
  readsHttpOnlyContext,
} from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateHandler } from '@/services/generators/handlers';
import type { GeneratedHandler, RecipeId } from '@/types/recipe';
import { generateR1 } from './r1';
import { generateR2 } from './r2';
import { generateR3 } from './r3';
import { generateR8 } from './r8';
import { headerComment } from './snippets';

const CORE_IDS = ['R1', 'R2', 'R3', 'R8'] as const satisfies readonly RecipeId[];

type CoreId = (typeof CORE_IDS)[number];

const GENERATORS = {
  R1: generateR1,
  R2: generateR2,
  R3: generateR3,
  R8: generateR8,
} as const satisfies Record<CoreId, () => GeneratedHandler>;

/** Dataverse only for R1, HttpClient only for R3, neither for R2 and R8. */
const CONNECTOR = {
  R1: { dataverse: true, httpClient: false, undetermined: false },
  R2: { dataverse: false, httpClient: false, undetermined: false },
  R3: { dataverse: false, httpClient: true, undetermined: false },
  R8: { dataverse: false, httpClient: false, undetermined: false },
} as const satisfies Record<CoreId, ConnectorUse>;

/** R1 and R8 are Liquid-eligible; R2 and R3 are not. */
const LIQUID = {
  R1: true,
  R2: false,
  R3: false,
  R8: true,
} as const satisfies Record<CoreId, boolean>;

/**
 * Each site-setting name is read only as the argument of `Server.SiteSetting.Get`.
 * `requireSettingsCode` also quotes that name in the missing-setting log and the
 * failure message; those two phrases are the only other allowed occurrences.
 */
function assertSiteSettings(text: string, names: readonly string[]): void {
  if (names.length === 0) {
    expect(text).not.toContain('Server.SiteSetting');
    return;
  }

  let remaining = text;
  for (const name of names) {
    const call = `Server.SiteSetting.Get(${JSON.stringify(name)})`;
    expect(remaining).toContain(call);
    remaining = remaining.split(call).join('');
  }
  expect(remaining).not.toContain('Server.SiteSetting');

  for (const name of names) {
    const withoutDiagnostics = remaining
      .split(`Missing site setting ${name}`)
      .join('')
      .split(`missing site setting ${name}`)
      .join('');
    expect(withoutDiagnostics).not.toContain(name);
  }
}

/** Non-empty, strictly ascending, 1-based, and within the line count (trailing LF is not a line). */
function assertHighlight(text: string, lines: readonly number[]): void {
  expect(lines.length).toBeGreaterThan(0);
  const parts = text.split('\n');
  const count = text.endsWith('\n') ? parts.length - 1 : parts.length;
  let previous = 0;
  for (const line of lines) {
    expect(Number.isInteger(line)).toBe(true);
    expect(line).toBeGreaterThan(previous);
    expect(line).toBeLessThanOrEqual(count);
    previous = line;
  }
}

for (const id of CORE_IDS) {
  describe(`generateHandler ${id}`, () => {
    it('registry returns the same handler', () => {
      expect(generateHandler(id)).toEqual(GENERATORS[id]());
    });

    it('parses as ES2023', () => {
      const parsed = parse(generateHandler(id).text, { ecmaVersion: 2023, sourceType: 'script' });
      expect(parsed.type).toBe('Program');
    });

    it("exports the catalogue's functions", () => {
      expect(exportedFunctionNames(generateHandler(id).text)).toEqual(getRecipe(id).functions);
    });

    it('connector use matches', () => {
      expect(detectConnectorUse(generateHandler(id).text)).toEqual(CONNECTOR[id]);
    });

    it('Liquid rule matches the catalogue', () => {
      const recipe = getRecipe(id);
      expect(recipe.liquid).toBe(LIQUID[id]);
      expect(!readsHttpOnlyContext(generateHandler(id).text)).toBe(recipe.liquid);
    });

    it('uses every object the catalogue lists', () => {
      const text = generateHandler(id).text;
      for (const objectName of getRecipe(id).serverObjects) {
        expect(text).toContain(objectName);
      }
    });

    it('settings', () => {
      assertSiteSettings(generateHandler(id).text, getRecipe(id).siteSettings);
    });

    it('format', () => {
      const first = generateHandler(id);
      const second = generateHandler(id);
      const headerLines = headerComment(getRecipe(id)).split('\n');

      expect(first.text).not.toContain('\r');
      expect(first.text.charCodeAt(0)).not.toBe(0xfeff);
      expect(first.text.endsWith('\n')).toBe(true);
      expect(first.text.endsWith('\n\n')).toBe(false);
      expect(first.text.split('\n').slice(0, headerLines.length)).toEqual(headerLines);
      expect(second.text).toBe(first.text);
      expect(second.highlightLines).toEqual(first.highlightLines);
      assertHighlight(first.text, first.highlightLines);
    });
  });
}
