import type {
  StarterDerived,
  StarterPackageInput,
} from '@/app/starter-session/starterSession.types';
import type { BrowserCheckResult, CheckSeverity } from '@/lib/code-analysis/codeAnalysis.types';
import { getRecipe, UPSTREAM_CREDENTIALS_LINE } from '@/services/catalogue/recipes';
import { LIQUID_SERVER_NOTE, requestPathSteps } from '@/services/generators/client/client';
import { R4_DIFFERENCES } from '@/services/generators/handlers/r4';
import { R5_DIFFERENCES } from '@/services/generators/handlers/r5';
import { R6_DIFFERENCES } from '@/services/generators/handlers/r6';
import type { ClientLanguage } from '@/types/http';
import type { RecipeId, RecipeMeta } from '@/types/recipe';
import { README_NOTES } from './readmeNotes';

/** `validation` stays boolean so a test can cover every readiness combination. Session derivation fixes it to true. */
type ReadinessSource = {
  readiness: { browser: boolean; validation: boolean; permissions: boolean };
  ready: StarterDerived['ready'];
};

const OVERVIEW = 'https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview';
const AUTHOR = 'https://learn.microsoft.com/en-us/power-pages/configure/author-server-logic';
const GOVERNANCE =
  'https://learn.microsoft.com/en-us/power-pages/security/disable-external-service-calls';

const PERMISSIONS_DONE =
  'Permissions: marked reviewed in Logic Starter; not checked against any environment';
const PERMISSIONS_OPEN =
  'Permissions: not marked reviewed in Logic Starter; not checked against any environment';

const SECRETS =
  'Hold secrets in Azure Key Vault, surface them through an environment variable, and reference them through a site setting. The generated code never holds a literal secret.';

const DIFFERENCES: Partial<Record<RecipeId, readonly { change: string; reason: string }[]>> = {
  R4: R4_DIFFERENCES,
  R5: R5_DIFFERENCES,
  R6: R6_DIFFERENCES,
};

function mark(done: boolean, item: string): string {
  return done ? `✓ ${item}` : `! Needs attention: ${item}`;
}

export function readinessBlock(derived: ReadinessSource): string {
  const { browser, validation, permissions } = derived.readiness;
  return [
    `${String(derived.ready)}/3 ready`,
    '',
    mark(browser, 'Browser checks'),
    mark(validation, 'Validation'),
    mark(permissions, permissions ? PERMISSIONS_DONE : PERMISSIONS_OPEN),
  ].join('\n');
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

function setupBody(slug: string, recipe: RecipeMeta, language: ClientLanguage): string {
  const clientName = `${slug}${language === 'liquid' ? '.client.liquid' : '.client.js'}`;
  const paste =
    language === 'liquid'
      ? `Paste \`${clientName}\` into a page or web template.`
      : `Paste \`${clientName}\` into a page's custom JavaScript.`;
  const steps = [
    '1. Set up a workspace.',
    '2. Open Server logic.',
    '3. Select + New server logic.',
    `4. Name it exactly \`${slug}\`. That name is the API resource name.`,
    `5. Select + Add roles and add \`${recipe.webRole}\`.`,
    '6. Select Edit code, then Open Visual Studio Code.',
    `7. Replace the file content with \`${slug}.js\` and save.`,
    '8. Configure the site settings, allowed domains and table permissions as listed in permission-checklist.md.',
    `9. ${paste}`,
  ];
  if (recipe.demoPage) {
    steps.push(`10. Use \`${slug}.page.html\` as the reference page for these calls.`);
  }
  return steps.join('\n');
}

function endpointBody(recipe: RecipeMeta, slug: string): string {
  if (recipe.id !== 'R8') return `\`/_api/serverlogics/${slug}\``;
  const fn = recipe.functions[0];
  if (fn === undefined) throw new Error('R8 has no function');
  return [
    `\`{% serverlogic name: '${slug}', operation: '${fn}', output: result %}\``,
    '',
    'The client file shows the version with `input:`.',
  ].join('\n');
}

function pathLine(language: ClientLanguage, slug: string, fn: string): string {
  return requestPathSteps(language, slug, fn)
    .map((step) => `${step.label} ${step.value}`)
    .join(' → ');
}

function learnBody(recipe: RecipeMeta): string {
  const urls: string[] = [];
  if (recipe.learnUrl !== null) urls.push(recipe.learnUrl);
  urls.push(...recipe.extraUrls, OVERVIEW, AUTHOR);
  return urls.join('\n');
}

function severityWord(severity: CheckSeverity): string {
  switch (severity) {
    case 'blocked':
      return 'Blocked';
    case 'may-be-rejected':
      return 'May be rejected';
    default: {
      const unreachable: never = severity;
      return unreachable;
    }
  }
}

function browserBody(checks: BrowserCheckResult): string {
  const lines: string[] = [];
  if (checks.hits.length === 0) {
    lines.push('No restricted patterns or browser APIs found.');
  } else {
    for (const hit of checks.hits) {
      lines.push(`Line ${String(hit.line)}: \`${hit.pattern}\` (${severityWord(hit.severity)})`);
    }
  }
  if (checks.parseFailed) lines.push("Couldn't parse this code");
  lines.push('', 'This is a text-pattern check, not a compile or a runtime test.');
  return lines.join('\n');
}

function validationBody(edited: boolean): string {
  const lines = ["Validation isn't authorization; table permissions are."];
  if (edited) lines.push('', "Generated validation; edits aren't rechecked.");
  return lines.join('\n');
}

function reportsBlockedHost(recipe: RecipeMeta): boolean {
  if (recipe.outboundDomains.length > 0) return true;
  return [recipe.mainObject, ...recipe.serverObjects].some((name) => name.includes('HttpClient'));
}

function troubleshootingBody(recipe: RecipeMeta): string {
  const lines = [
    '- The `x-ms-user-trace` response header holds base64 JSON, a list of `{ Level, MessageCode, Message }`, including `Server.Logger` output.',
    "- An `RTSL01` validation error means the whole file doesn't run and the caller gets HTTP 400.",
    `- HTTP 403 when the tenant's "Disable external service calls from Server Logic" governance control is on: ${GOVERNANCE}`,
  ];
  if (reportsBlockedHost(recipe)) {
    lines.push(
      "- A call to a host the outbound settings don't allow returns `StatusCode` 0 and the handler reports its fixed failure message.",
    );
  }
  return lines.join('\n');
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function differencesBody(id: RecipeId): string | null {
  const entries = DIFFERENCES[id];
  if (entries === undefined) return null;
  return entries.map((entry) => `- ${entry.change} Reason: ${entry.reason}`).join('\n');
}

function notesBody(recipe: RecipeMeta, language: ClientLanguage): string | null {
  const notes = [...(README_NOTES[recipe.id] ?? [])];
  if (language === 'liquid') notes.push(LIQUID_SERVER_NOTE);
  if (notes.length === 0) return null;
  return bulletList(notes);
}

export function buildReadme(i: StarterPackageInput): string {
  const { state, derived } = i;
  const recipe = getRecipe(state.recipe);
  const slug = derived.slug;
  const blocks = [
    `# ${slug}\n\n${recipe.name}`,
    section('Set up', setupBody(slug, recipe, state.language)),
    section('Endpoint', endpointBody(recipe, slug)),
    section('Request path', pathLine(state.language, slug, derived.fn)),
    section('Learn', learnBody(recipe)),
    section('Browser checks', browserBody(derived.checks)),
    section('Validation', validationBody(derived.edited)),
    section('Readiness', readinessBlock(derived)),
    section('Troubleshooting', troubleshootingBody(recipe)),
  ];
  if (recipe.upstreamCredentials) blocks.push(UPSTREAM_CREDENTIALS_LINE);
  blocks.push(section('Secrets', SECRETS));
  if (recipe.prerequisites.length > 0) {
    blocks.push(section('Prerequisites', bulletList(recipe.prerequisites)));
  }
  const differences = differencesBody(recipe.id);
  if (differences !== null) blocks.push(section('Differences from Learn', differences));
  const notes = notesBody(recipe, state.language);
  if (notes !== null) blocks.push(section('Notes', notes));
  return `${blocks.join('\n\n')}\n`;
}
