// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveStarter } from '@/session/deriveStarter';
import { STARTER_DEPS } from '@/session/starterDeps';
import { createStarterReducer, initialStarterState } from '@/session/starterReducer';
import type { StarterDerived, StarterState } from '@/types/starter';
import { RESTRICTED_PATTERNS } from '@/lib/code-analysis/browserChecks';
import { checklistLines, getRecipe } from '@/services/catalogue/recipes';
import { generateDemoPage } from '@/services/generators/handlers';
import type { ClientLanguage } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import { buildPackageFiles } from './buildPackageFiles';

function readGolden(name: string): string {
  return readFileSync(new URL(`./__golden__/${name}`, import.meta.url), 'utf8');
}

function sessionFor(recipe: RecipeId): { state: StarterState; derived: StarterDerived } {
  const reduce = createStarterReducer(STARTER_DEPS);
  const state = reduce(initialStarterState(STARTER_DEPS), { type: 'selectRecipe', recipe });
  return { state, derived: deriveStarter(state, STARTER_DEPS) };
}

function content(files: readonly { path: string; content: string }[], path: string): string {
  const file = files.find((item) => item.path === path);
  if (file === undefined) throw new Error(`missing ${path}`);
  return file.content;
}

describe('buildPackageFiles', () => {
  it('R1 checklist matches the golden', () => {
    const { state, derived } = sessionFor('R1');
    const files = buildPackageFiles({ state, derived, clientText: 'client' });
    expect(content(files, 'permission-checklist.md')).toBe(
      readGolden('R1.permission-checklist.md.txt'),
    );
  });

  it('R4 checklist matches the golden', () => {
    const { state, derived } = sessionFor('R4');
    const files = buildPackageFiles({ state, derived, clientText: 'client' });
    expect(content(files, 'permission-checklist.md')).toBe(
      readGolden('R4.permission-checklist.md.txt'),
    );
  });

  it('R10 checklist matches the golden', () => {
    const { state, derived } = sessionFor('R10');
    const files = buildPackageFiles({ state, derived, clientText: 'client' });
    expect(content(files, 'permission-checklist.md')).toBe(
      readGolden('R10.permission-checklist.md.txt'),
    );
  });

  it('returns four files for R1 in the fixed order', () => {
    const { state, derived } = sessionFor('R1');
    const files = buildPackageFiles({ state, derived, clientText: 'client' });
    expect(files.map((file) => file.path)).toEqual([
      `${derived.slug}.js`,
      `${derived.slug}.client.js`,
      'README.md',
      'permission-checklist.md',
    ]);
  });

  it('returns five files for R4, R5 and R6 with the page last', () => {
    for (const recipe of ['R4', 'R5', 'R6'] as const) {
      const { state, derived } = sessionFor(recipe);
      const files = buildPackageFiles({ state, derived, clientText: 'client' });
      const page = generateDemoPage(recipe, derived.slug);
      if (page === null) throw new Error(`missing demo page for ${recipe}`);
      expect(files.map((file) => file.path)).toEqual([
        `${derived.slug}.js`,
        `${derived.slug}.client.js`,
        'README.md',
        'permission-checklist.md',
        `${derived.slug}.page.html`,
      ]);
      const pageFile = files[4];
      if (pageFile === undefined) throw new Error('missing page file');
      expect(pageFile.content).toBe(page);
    }
  });

  it('uses the client extension from the language', () => {
    const { state, derived } = sessionFor('R1');
    const cases: readonly { language: ClientLanguage; suffix: string }[] = [
      { language: 'fetch', suffix: '.client.js' },
      { language: 'jquery', suffix: '.client.js' },
      { language: 'liquid', suffix: '.client.liquid' },
    ];
    for (const { language, suffix } of cases) {
      const next = { ...state, language };
      const files = buildPackageFiles({
        state: next,
        derived: deriveStarter(next, STARTER_DEPS),
        clientText: 'client',
      });
      expect(files[1]?.path).toBe(`${derived.slug}${suffix}`);
    }
  });

  it('server file is the pane text, LF, one final newline', () => {
    const { state, derived } = sessionFor('R1');
    const crlf = 'keep fetch(\r\n"sekrit-token"';
    const files = buildPackageFiles({
      state: { ...state, serverText: crlf },
      derived,
      clientText: 'client',
    });
    expect(content(files, `${derived.slug}.js`)).toBe('keep fetch(\n"sekrit-token"\n');

    const already = buildPackageFiles({
      state: { ...state, serverText: 'already\n' },
      derived,
      clientText: 'client',
    });
    expect(content(already, `${derived.slug}.js`)).toBe('already\n');
  });

  it('client file is the client text plus a final newline', () => {
    const { state, derived } = sessionFor('R1');
    const missing = buildPackageFiles({ state, derived, clientText: 'fetch("token")' });
    expect(content(missing, `${derived.slug}.client.js`)).toBe('fetch("token")\n');
    const present = buildPackageFiles({ state, derived, clientText: 'fetch("token")\n' });
    expect(content(present, `${derived.slug}.client.js`)).toBe('fetch("token")\n');
  });

  it('every checklist line is a task', () => {
    const { state, derived } = sessionFor('R4');
    const checklist = content(
      buildPackageFiles({ state, derived, clientText: 'client' }),
      'permission-checklist.md',
    );
    const tasks = checklist.split('\n').filter((line) => line.startsWith('- [ ] '));
    expect(tasks).toEqual(checklistLines(getRecipe('R4')).map((line) => `- [ ] ${line}`));
  });

  it('checklist has the AC-5.4 label and the readiness block', () => {
    const { state, derived } = sessionFor('R1');
    const checklist = content(
      buildPackageFiles({ state, derived, clientText: 'client' }),
      'permission-checklist.md',
    );
    expect(checklist).toContain(
      "For the Read Dataverse records recipe. Review anything you've added.",
    );
    expect(checklist).toContain('2/3 ready');
    expect(checklist).toContain(
      '! Needs attention: Permissions: not marked reviewed in Logic Starter; not checked against any environment',
    );
  });

  it('no restricted-pattern label contains a backtick', () => {
    for (const { label } of RESTRICTED_PATTERNS) {
      expect(label.includes('`')).toBe(false);
    }
  });

  it('is deterministic', () => {
    const { state, derived } = sessionFor('R1');
    const input = { state, derived, clientText: 'client' };
    expect(buildPackageFiles(input)).toEqual(buildPackageFiles(input));
  });
});
