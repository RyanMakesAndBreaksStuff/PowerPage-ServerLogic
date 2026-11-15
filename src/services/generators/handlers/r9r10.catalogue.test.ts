// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exportedFunctionNames, usedServerMembers } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import type { RecipeId, RecipeMeta } from '@/types/recipe';
import { generateHandler } from './index';
import { generateR9 } from './r9';
import { generateR10 } from './r10';

const IDS = ['R9', 'R10'] as const satisfies readonly RecipeId[];

/** Objects `usedServerMembers` reports that the catalogue row does not list. A new one fails the test. */
const EXTRA_OBJECTS = {
  R9: ['Server.Context', 'Server.SiteSetting'],
  R10: [],
} as const satisfies Record<(typeof IDS)[number], readonly string[]>;

const PLACEHOLDERS = ['new_CustomBoundFunction', 'new_Action', 'new_CustomBoundAction'] as const;

function textOf(id: RecipeId): string {
  return generateHandler(id).text;
}

/** Arguments of `Server.SiteSetting.Get("…")`, first-seen order, decoded. */
function siteSettingReads(text: string): readonly string[] {
  const names: string[] = [];
  const pattern = /Server\.SiteSetting\.Get\("((?:\\.|[^"\\])*)"\)/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1];
    if (raw === undefined) continue;
    const parsed: unknown = JSON.parse(`"${raw}"`);
    if (typeof parsed !== 'string') throw new Error('Site setting name did not parse');
    if (!names.includes(parsed)) names.push(parsed);
  }
  return names;
}

/** A catalogue entry names this object (`Server.Logger`) or a member of it (`Server.Context.Body`). */
function catalogueListsObject(listed: readonly string[], objectPath: string): boolean {
  return listed.some((entry) => entry === objectPath || entry.startsWith(`${objectPath}.`));
}

function objectsBeyondCatalogue(text: string, listed: readonly string[]): readonly string[] {
  const used: ReadonlyMap<string, readonly string[]> = usedServerMembers(text);
  return [...used.keys()].filter((objectPath) => !catalogueListsObject(listed, objectPath));
}

// The three names are in the permission note. A prerequisite says to replace them, without repeating the names.
function placeholderNames(recipe: RecipeMeta): readonly string[] {
  const told = [recipe.permissionNote, ...recipe.prerequisites].join('\n');
  const names: string[] = [];
  for (const match of told.matchAll(/`(new_[A-Za-z0-9_]+)`/g)) {
    const name = match[1];
    if (name !== undefined && !names.includes(name)) names.push(name);
  }
  return names;
}

/** `const name = "name"` lines, in source order. */
function placeholderConstants(text: string): readonly string[] {
  const names: string[] = [];
  const pattern = /^const ([A-Za-z_][\w]*) = "((?:\\.|[^"\\])*)";$/gm;
  for (const match of text.matchAll(pattern)) {
    const ident = match[1];
    const raw = match[2];
    if (ident === undefined || raw === undefined) continue;
    const parsed: unknown = JSON.parse(`"${raw}"`);
    if (parsed === ident) names.push(ident);
  }
  return names;
}

describe('R9 and R10 catalogue agreement', () => {
  it('R9 and R10 function names equal getRecipe(id).functions', () => {
    for (const id of IDS) {
      const names: readonly string[] | null = exportedFunctionNames(textOf(id));
      expect(names).toEqual(getRecipe(id).functions);
    }
  });

  it("R9 reads exactly getRecipe('R9').siteSettings and R10 reads none", () => {
    expect(getRecipe('R9').siteSettings).toEqual(['CLOUD_FLOW_ID']);
    expect(getRecipe('R10').siteSettings).toEqual([]);
    expect(siteSettingReads(textOf('R9'))).toEqual(getRecipe('R9').siteSettings);
    expect(siteSettingReads(textOf('R10'))).toEqual(getRecipe('R10').siteSettings);
  });

  it("every entry of the recipe's serverObjects appears in the text", () => {
    for (const id of IDS) {
      const text = textOf(id);
      for (const object of getRecipe(id).serverObjects) {
        expect(text, `${id} ${object}`).toContain(object);
      }
    }
  });

  it('the objects the text uses beyond the catalogue are exactly the expected ones', () => {
    for (const id of IDS) {
      expect(objectsBeyondCatalogue(textOf(id), getRecipe(id).serverObjects)).toEqual([
        ...EXTRA_OBJECTS[id],
      ]);
    }
  });

  it('the R10 placeholder names in the text are the ones its prerequisites tell the maker to replace', () => {
    const recipe = getRecipe('R10');
    expect(recipe.prerequisites).toContain('Replace the three placeholder API names.');
    const told = placeholderNames(recipe);
    expect(told).toEqual([...PLACEHOLDERS]);
    expect(placeholderConstants(textOf('R10'))).toEqual(told);
  });

  it('R10 entity set comes from the catalogue', () => {
    const sets = getRecipe('R10').tables.map((table) => table.entitySetName);
    expect(sets).toEqual(['accounts']);
    const text = textOf('R10');
    for (const entitySet of sets) {
      expect(text).toContain(JSON.stringify(`${entitySet}(`));
    }
  });

  it("generateHandler('R9') and generateHandler('R10') equal the direct generators", () => {
    expect(generateHandler('R9')).toEqual(generateR9());
    expect(generateHandler('R10')).toEqual(generateR10());
  });
});
