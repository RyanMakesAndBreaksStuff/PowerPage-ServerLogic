// @vitest-environment node
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { deriveStarter } from '@/app/starter-session/deriveStarter';
import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
import { createStarterReducer, initialStarterState } from '@/app/starter-session/starterReducer';
import type { StarterDerived, StarterState } from '@/app/starter-session/starterSession.types';
import { RECIPES } from '@/services/catalogue/recipes';
import { generateClient, isLiquidAllowed } from '@/services/generators/client/client';
import { generateHandler } from '@/services/generators/handlers';
import type { ClientLanguage } from '@/types/http';
import type { RecipeId, RecipeMeta } from '@/types/recipe';
import { buildPackageFiles } from './buildPackageFiles';
import { buildZip } from './buildZip';

/** Phase 19 removes this list and the R7 stub test together. */
const PENDING_R7: readonly RecipeId[] = ['R7'];

function fileCount(id: RecipeId): number {
  return id === 'R4' || id === 'R5' || id === 'R6' ? 5 : 4;
}

function languagesFor(recipe: RecipeMeta, serverText: string): readonly ClientLanguage[] {
  if (recipe.id === 'R8') return ['liquid'];
  const languages: ClientLanguage[] = ['fetch', 'jquery'];
  if (isLiquidAllowed(recipe, serverText)) languages.push('liquid');
  return languages;
}

function openSession(
  recipe: RecipeId,
  language: ClientLanguage,
): {
  state: StarterState;
  derived: StarterDerived;
} {
  const reduce = createStarterReducer(STARTER_DEPS);
  let state = reduce(initialStarterState(STARTER_DEPS), { type: 'selectRecipe', recipe });
  if (state.language !== language) state = reduce(state, { type: 'setLanguage', language });
  if (state.language !== language) throw new Error(`${recipe} did not accept ${language}`);
  return { state, derived: deriveStarter(state, STARTER_DEPS) };
}

function clientFileName(slug: string, language: ClientLanguage): string {
  return `${slug}${language === 'liquid' ? '.client.liquid' : '.client.js'}`;
}

function packageNames(slug: string, language: ClientLanguage, demoPage: boolean): string[] {
  const names = [
    `${slug}.js`,
    clientFileName(slug, language),
    'README.md',
    'permission-checklist.md',
  ];
  if (demoPage) names.push(`${slug}.page.html`);
  return names;
}

function unzipText(bytes: Uint8Array): Record<string, string> {
  const text: Record<string, string> = {};
  for (const [name, bytesOfFile] of Object.entries(unzipSync(bytes))) {
    text[name] = strFromU8(bytesOfFile);
  }
  return text;
}

function withoutOneFinalNewline(text: string): string {
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

type Built = {
  state: StarterState;
  derived: StarterDerived;
  clientText: string;
  files: readonly { path: string; content: string }[];
  zip: Record<string, string>;
};

function build(recipe: RecipeId, language: ClientLanguage): Built {
  const { state, derived } = openSession(recipe, language);
  const clientText = generateClient({
    slug: derived.slug,
    recipe: state.recipe,
    fn: derived.fn,
    method: state.method,
    language: state.language,
  });
  const files = buildPackageFiles({ state, derived, clientText });
  return { state, derived, clientText, files, zip: unzipText(buildZip(files)) };
}

function zipEntry(zip: Record<string, string>, path: string): string {
  const text = zip[path];
  if (text === undefined) throw new Error(`missing ${path}`);
  return text;
}

const active = RECIPES.filter((recipe) => !PENDING_R7.includes(recipe.id));

describe('starter package integration', () => {
  it('every recipe gives the right file count and names', () => {
    for (const recipe of active) {
      const probe = openSession(recipe.id, recipe.id === 'R8' ? 'liquid' : 'fetch');
      for (const language of languagesFor(recipe, probe.state.serverText)) {
        const built = build(recipe.id, language);
        const names = packageNames(built.derived.slug, language, recipe.demoPage);
        expect(built.files).toHaveLength(fileCount(recipe.id));
        expect(built.files.map((file) => file.path)).toEqual(names);
        expect(Object.keys(built.zip).sort()).toEqual([...names].sort());
      }
    }
  });

  it('zip client file equals generateClient output', () => {
    for (const recipe of active) {
      const probe = openSession(recipe.id, recipe.id === 'R8' ? 'liquid' : 'fetch');
      for (const language of languagesFor(recipe, probe.state.serverText)) {
        const built = build(recipe.id, language);
        const zipped = zipEntry(built.zip, clientFileName(built.derived.slug, language));
        expect(withoutOneFinalNewline(zipped)).toBe(withoutOneFinalNewline(built.clientText));
      }
    }
  });

  it("zip server file equals the session's server text", () => {
    for (const recipe of active) {
      const built = build(recipe.id, recipe.id === 'R8' ? 'liquid' : 'fetch');
      const server = zipEntry(built.zip, `${built.derived.slug}.js`);
      const expected = built.state.serverText.endsWith('\n')
        ? built.state.serverText
        : `${built.state.serverText}\n`;
      expect(server).toBe(expected);
    }
  });

  it('R8 uses the liquid extension and contains the Liquid tag in the README', () => {
    const built = build('R8', 'liquid');
    const slug = built.derived.slug;
    expect(built.files.map((file) => file.path)).toContain(`${slug}.client.liquid`);
    expect(zipEntry(built.zip, 'README.md')).toContain(
      `{% serverlogic name: '${slug}', operation: 'getSummary', output: result %}`,
    );
  });

  it('each build finishes within 500 ms', () => {
    for (const recipe of active) {
      const { state, derived } = openSession(recipe.id, recipe.id === 'R8' ? 'liquid' : 'fetch');
      const clientText = generateClient({
        slug: derived.slug,
        recipe: state.recipe,
        fn: derived.fn,
        method: state.method,
        language: state.language,
      });
      const started = performance.now();
      buildZip(buildPackageFiles({ state, derived, clientText }));
      expect(performance.now() - started).toBeLessThan(500);
    }
  });

  it('R7 is still a stub until Phase 19 removes it and PENDING_R7 together', () => {
    expect(PENDING_R7).toEqual(['R7']);
    expect(() => generateHandler('R7')).toThrow('not implemented: phase 19');
  });

  it('passes untitled and a digits-and-hyphens slug through unchanged', () => {
    const reduce = createStarterReducer(STARTER_DEPS);
    const untitled = reduce(initialStarterState(STARTER_DEPS), { type: 'setName', name: '@@@' });
    const untitledDerived = deriveStarter(untitled, STARTER_DEPS);
    expect(untitledDerived.slug).toBe('untitled');
    const untitledFiles = buildPackageFiles({
      state: untitled,
      derived: untitledDerived,
      clientText: 'client\n',
    });
    const untitledReadme = untitledFiles.find((file) => file.path === 'README.md');
    const untitledChecklist = untitledFiles.find((file) => file.path === 'permission-checklist.md');
    if (untitledReadme === undefined || untitledChecklist === undefined) {
      throw new Error('missing package text');
    }
    expect(untitledReadme.content).toContain('# untitled');
    expect(untitledChecklist.content).toContain('# Permission checklist for untitled');
    expect(untitledReadme.content.includes('@@@')).toBe(false);
    expect(untitledChecklist.content.includes('@@@')).toBe(false);

    const hyphenated = reduce(initialStarterState(STARTER_DEPS), {
      type: 'setName',
      name: 'ab-12',
    });
    const hyphenDerived = deriveStarter(hyphenated, STARTER_DEPS);
    expect(hyphenDerived.slug).toBe('ab-12');
    const hyphenFiles = buildPackageFiles({
      state: hyphenated,
      derived: hyphenDerived,
      clientText: 'client\n',
    });
    const hyphenReadme = hyphenFiles.find((file) => file.path === 'README.md');
    const hyphenChecklist = hyphenFiles.find((file) => file.path === 'permission-checklist.md');
    if (hyphenReadme === undefined || hyphenChecklist === undefined) {
      throw new Error('missing package text');
    }
    expect(hyphenReadme.content).toContain('# ab-12');
    expect(hyphenChecklist.content).toContain('# Permission checklist for ab-12');
  });
});
