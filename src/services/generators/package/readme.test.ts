// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveStarter } from '@/app/starter-session/deriveStarter';
import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
import { createStarterReducer, initialStarterState } from '@/app/starter-session/starterReducer';
import type {
  StarterDerived,
  StarterPackageInput,
  StarterState,
} from '@/app/starter-session/starterSession.types';
import { getRecipe, RECIPES, UPSTREAM_CREDENTIALS_LINE } from '@/services/catalogue/recipes';
import { LIQUID_SERVER_NOTE, requestPathSteps } from '@/services/generators/client/client';
import { R4_DIFFERENCES } from '@/services/generators/handlers/r4';
import { R5_DIFFERENCES } from '@/services/generators/handlers/r5';
import { R6_DIFFERENCES } from '@/services/generators/handlers/r6';
import type { ClientLanguage } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import { buildReadme, readinessBlock } from './readme';

const OVERVIEW = 'https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview';
const AUTHOR = 'https://learn.microsoft.com/en-us/power-pages/configure/author-server-logic';
const GOVERNANCE =
  'https://learn.microsoft.com/en-us/power-pages/security/disable-external-service-calls';

const DIFFERENCES = {
  R4: R4_DIFFERENCES,
  R5: R5_DIFFERENCES,
  R6: R6_DIFFERENCES,
} as const;

const R1_HEADINGS = [
  'Set up',
  'Endpoint',
  'Request path',
  'Learn',
  'Browser checks',
  'Validation',
  'Readiness',
  'Troubleshooting',
  'Secrets',
  'Prerequisites',
];

const R4_HEADINGS = [...R1_HEADINGS, 'Differences from Learn', 'Notes'];

function readGolden(name: string): string {
  return readFileSync(new URL(`./__golden__/${name}`, import.meta.url), 'utf8');
}

function headings(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3));
}

function sectionBody(text: string, title: string): string {
  const heading = `## ${title}\n`;
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`missing ${title}`);
  const bodyStart = start + heading.length;
  const next = text.indexOf('\n## ', bodyStart);
  return next < 0 ? text.slice(bodyStart) : text.slice(bodyStart, next);
}

function readyOf(browser: boolean, validation: boolean, permissions: boolean): 0 | 1 | 2 | 3 {
  const n = Number(browser) + Number(validation) + Number(permissions);
  switch (n) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    default:
      throw new Error(`bad ready count ${String(n)}`);
  }
}

function inputFor(recipe: RecipeId): StarterPackageInput {
  if (recipe === 'R7') {
    const state: StarterState = {
      ...initialStarterState(STARTER_DEPS),
      recipe,
      method: getRecipe(recipe).defaultMethod,
    };
    return { state, derived: deriveStarter(state, STARTER_DEPS), clientText: 'client\n' };
  }
  const reduce = createStarterReducer(STARTER_DEPS);
  const state = reduce(initialStarterState(STARTER_DEPS), { type: 'selectRecipe', recipe });
  return { state, derived: deriveStarter(state, STARTER_DEPS), clientText: 'client\n' };
}

function r4Reviewed(): StarterPackageInput {
  const reduce = createStarterReducer(STARTER_DEPS);
  let state = reduce(initialStarterState(STARTER_DEPS), { type: 'selectRecipe', recipe: 'R4' });
  state = reduce(state, {
    type: 'editServer',
    text: `${state.serverText}debugger\n`,
    cursor: null,
  });
  state = reduce(state, { type: 'markReviewed' });
  return { state, derived: deriveStarter(state, STARTER_DEPS), clientText: 'client\n' };
}

function withDerived(input: StarterPackageInput, derived: StarterDerived): StarterPackageInput {
  return { ...input, derived };
}

function pathLine(language: ClientLanguage, slug: string, fn: string): string {
  return requestPathSteps(language, slug, fn)
    .map((step) => `${step.label} ${step.value}`)
    .join(' → ');
}

function catalogueOutbound(recipeId: RecipeId): boolean {
  const recipe = getRecipe(recipeId);
  return (
    recipe.outboundDomains.length > 0 ||
    [recipe.mainObject, ...recipe.serverObjects].some((name) => name.includes('HttpClient'))
  );
}

describe('buildReadme', () => {
  it('R1 README matches the golden', () => {
    expect(buildReadme(inputFor('R1'))).toBe(readGolden('R1.README.md.txt'));
  });

  it('R4 README matches the golden', () => {
    expect(buildReadme(r4Reviewed())).toBe(readGolden('R4.README.md.txt'));
  });

  it('R8 README matches the golden', () => {
    expect(buildReadme(inputFor('R8'))).toBe(readGolden('R8.README.md.txt'));
  });

  it('sections appear in the specified order', () => {
    expect(headings(buildReadme(inputFor('R1')))).toEqual(R1_HEADINGS);
    expect(headings(buildReadme(r4Reviewed()))).toEqual(R4_HEADINGS);
  });

  it('set up names the file exactly', () => {
    const input = inputFor('R1');
    const readme = buildReadme(input);
    expect(readme).toContain(`Name it exactly \`${input.derived.slug}\``);
    expect(readme).toContain('API resource name');
    expect(readme).toContain(getRecipe('R1').webRole);
    expect(readme).toContain(`${input.derived.slug}.js`);
  });

  it('endpoint is the path, and for R8 the Liquid tag', () => {
    const r1 = inputFor('R1');
    expect(buildReadme(r1)).toContain(`/_api/serverlogics/${r1.derived.slug}`);
    const r8 = buildReadme(inputFor('R8'));
    expect(r8).toContain(
      "{% serverlogic name: 'customer-summary', operation: 'getSummary', output: result %}",
    );
    expect(r8).not.toContain('/_api/serverlogics/');
  });

  it('request path joins the steps with arrows', () => {
    const fetchInput = inputFor('R1');
    expect(buildReadme(fetchInput)).toContain(
      pathLine('fetch', fetchInput.derived.slug, fetchInput.derived.fn),
    );
    const jqueryState = { ...fetchInput.state, language: 'jquery' as const };
    const jquery = withDerived(fetchInput, deriveStarter(jqueryState, STARTER_DEPS));
    const jqueryReadme = buildReadme({ ...jquery, state: jqueryState });
    expect(jqueryReadme).toContain(pathLine('jquery', jquery.derived.slug, jquery.derived.fn));
    const liquid = inputFor('R8');
    expect(buildReadme(liquid)).toContain(
      pathLine('liquid', liquid.derived.slug, liquid.derived.fn),
    );
  });

  it('learn links', () => {
    const r4 = buildReadme(inputFor('R4'));
    const recipe = getRecipe('R4');
    if (recipe.learnUrl === null) throw new Error('R4 learnUrl');
    expect(r4).toContain(recipe.learnUrl);
    expect(r4).toContain(OVERVIEW);
    expect(r4).toContain(AUTHOR);
    const r7 = buildReadme(inputFor('R7'));
    for (const url of getRecipe('R7').extraUrls) expect(r7).toContain(url);
    const r3 = buildReadme(inputFor('R3'));
    expect(getRecipe('R3').learnUrl).toBeNull();
    expect(r3).toContain(OVERVIEW);
    expect(r3).toContain(AUTHOR);
    expect(r3).not.toContain('server-logic-operations');
  });

  it('browser checks: none, hits, parse failure', () => {
    const clean = buildReadme(inputFor('R2'));
    expect(clean).toContain('No restricted patterns or browser APIs found.');
    expect(clean).toContain('This is a text-pattern check, not a compile or a runtime test.');

    const base = inputFor('R2');
    const hits = buildReadme(
      withDerived(base, {
        ...base.derived,
        checks: {
          hits: [
            { pattern: 'eval(', line: 3, severity: 'blocked' },
            { pattern: 'fetch', line: 8, severity: 'may-be-rejected' },
          ],
          parseFailed: false,
        },
      }),
    );
    const hitLines = hits.split('\n').filter((line) => line.startsWith('Line '));
    expect(hitLines).toEqual(['Line 3: `eval(` (Blocked)', 'Line 8: `fetch` (May be rejected)']);

    const failed = buildReadme(
      withDerived(base, {
        ...base.derived,
        checks: { hits: [], parseFailed: true },
      }),
    );
    expect(failed).toContain("Couldn't parse this code");
    expect(failed).toContain('This is a text-pattern check, not a compile or a runtime test.');
  });

  it('validation line appears only after an edit', () => {
    const base = inputFor('R2');
    const clean = buildReadme(withDerived(base, { ...base.derived, edited: false }));
    const edited = buildReadme(withDerived(base, { ...base.derived, edited: true }));
    expect(clean).toContain("Validation isn't authorization; table permissions are.");
    expect(clean).not.toContain("Generated validation; edits aren't rechecked.");
    expect(edited).toContain("Validation isn't authorization; table permissions are.");
    expect(edited).toContain("Generated validation; edits aren't rechecked.");
  });

  it('readiness marks', () => {
    const flags = [false, true] as const;
    for (const browser of flags) {
      for (const validation of flags) {
        for (const permissions of flags) {
          const ready = readyOf(browser, validation, permissions);
          const block = readinessBlock({
            ready,
            readiness: { browser, validation, permissions },
          });
          expect(block.startsWith(`${String(ready)}/3 ready`)).toBe(true);
          expect(block).toContain(
            browser ? '✓ Browser checks' : '! Needs attention: Browser checks',
          );
          expect(block).toContain(validation ? '✓ Validation' : '! Needs attention: Validation');
          expect(block).toContain(
            permissions
              ? '✓ Permissions: marked reviewed in Logic Starter; not checked against any environment'
              : '! Needs attention: Permissions: not marked reviewed in Logic Starter; not checked against any environment',
          );
          for (const line of block.split('\n')) {
            expect(line.includes('exists')).toBe(false);
            expect(line.includes('granted')).toBe(false);
          }
        }
      }
    }
  });

  it('troubleshooting has the four points', () => {
    for (const recipe of RECIPES) {
      const readme = buildReadme(inputFor(recipe.id));
      const trouble = sectionBody(readme, 'Troubleshooting');
      expect(trouble).toContain('x-ms-user-trace');
      expect(trouble).toContain('RTSL01');
      expect(trouble).toContain('403');
      expect(trouble).toContain(GOVERNANCE);
      if (catalogueOutbound(recipe.id)) expect(trouble).toContain('StatusCode');
      else expect(trouble).not.toContain('StatusCode');
    }
  });

  it('upstream line for R3, R5, R6, R9 and not for R1, R2, R4, R8, R10', () => {
    const present = new Set<RecipeId>(['R3', 'R5', 'R6', 'R9']);
    const absent = new Set<RecipeId>(['R1', 'R2', 'R4', 'R8', 'R10']);
    for (const id of present) {
      expect(getRecipe(id).upstreamCredentials).toBe(true);
      expect(buildReadme(inputFor(id))).toContain(UPSTREAM_CREDENTIALS_LINE);
    }
    for (const id of absent) {
      expect(getRecipe(id).upstreamCredentials).toBe(false);
      expect(buildReadme(inputFor(id))).not.toContain(UPSTREAM_CREDENTIALS_LINE);
    }
  });

  it('secrets paragraph is always present', () => {
    for (const recipe of RECIPES) {
      const readme = buildReadme(inputFor(recipe.id));
      expect(readme).toContain('Azure Key Vault');
      expect(readme).toContain('environment variable');
      expect(readme).toContain('site setting');
    }
  });

  it('prerequisites only when present', () => {
    for (const recipe of RECIPES) {
      const readme = buildReadme(inputFor(recipe.id));
      if (recipe.prerequisites.length === 0) {
        expect(readme).not.toContain('## Prerequisites');
      } else {
        expect(readme).toContain('## Prerequisites');
        for (const line of recipe.prerequisites) expect(readme).toContain(`- ${line}`);
      }
    }
  });

  it('differences only for tutorials', () => {
    for (const recipe of RECIPES) {
      const readme = buildReadme(inputFor(recipe.id));
      const diffs =
        recipe.id === 'R4' || recipe.id === 'R5' || recipe.id === 'R6'
          ? DIFFERENCES[recipe.id]
          : undefined;
      if (diffs === undefined) {
        expect(readme).not.toContain('## Differences from Learn');
      } else {
        expect(readme).toContain('## Differences from Learn');
        for (const entry of diffs) {
          expect(readme).toContain(entry.change);
          expect(readme).toContain(entry.reason);
        }
      }
    }
  });

  it('notes', () => {
    expect(buildReadme(inputFor('R3'))).toContain(
      '`ExternalApi/BaseUrl` must not contain a query string.',
    );
    expect(buildReadme(inputFor('R4'))).toContain(
      'The Global Create grant is expected, and Logic Inspector flags it.',
    );
    expect(buildReadme(inputFor('R9'))).toContain(
      'The flow must validate its own inputs, because the handler passes the validated body through.',
    );
    const bare = inputFor('R2');
    expect(buildReadme(bare)).not.toContain('## Notes');
    const liquid = buildReadme({
      ...bare,
      state: { ...bare.state, language: 'liquid' },
    });
    expect(liquid).toContain('## Notes');
    expect(liquid).toContain(LIQUID_SERVER_NOTE);
    expect(buildReadme(inputFor('R8'))).toContain(LIQUID_SERVER_NOTE);
  });

  it('text is LF, ends with one newline, and is deterministic', () => {
    const input = inputFor('R1');
    const readme = buildReadme(input);
    expect(readme.endsWith('\n')).toBe(true);
    expect(readme.endsWith('\n\n')).toBe(false);
    expect(readme.includes('\r')).toBe(false);
    expect(buildReadme(input)).toBe(readme);
  });
});
