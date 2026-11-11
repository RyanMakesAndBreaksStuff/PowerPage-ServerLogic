import type {
  StarterDerived,
  StarterPackageInput,
} from '@/types/starter';
import { normalizeLf } from '@/lib/text';
import { checklistLines, getRecipe } from '@/services/catalogue/recipes';
import { generateDemoPage } from '@/services/generators/handlers';
import type { RecipeMeta } from '@/types/recipe';
import { buildReadme, clientSuffix, readinessBlock } from './readme';

function withFinalNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function buildChecklist(slug: string, recipe: RecipeMeta, derived: StarterDerived): string {
  const lines = [
    `# Permission checklist for ${slug}`,
    '',
    `For the ${recipe.name} recipe. Review anything you've added.`,
    '',
    ...checklistLines(recipe).map((line) => `- [ ] ${line}`),
    '',
    '## Readiness',
    '',
    readinessBlock(derived),
  ];
  return `${lines.join('\n')}\n`;
}

export function buildPackageFiles(
  i: StarterPackageInput,
): readonly { path: string; content: string }[] {
  const { state, derived, clientText } = i;
  const recipe = getRecipe(state.recipe);
  const slug = derived.slug;
  const files: { path: string; content: string }[] = [
    { path: `${slug}.js`, content: withFinalNewline(normalizeLf(state.serverText)) },
    { path: `${slug}${clientSuffix(state.language)}`, content: withFinalNewline(clientText) },
    { path: 'README.md', content: buildReadme(i) },
    { path: 'permission-checklist.md', content: buildChecklist(slug, recipe, derived) },
  ];
  if (recipe.demoPage) {
    const page = generateDemoPage(state.recipe, slug);
    if (page === null) throw new Error(`Missing demo page for ${state.recipe}`);
    files.push({ path: `${slug}.page.html`, content: page });
  }
  return files;
}
