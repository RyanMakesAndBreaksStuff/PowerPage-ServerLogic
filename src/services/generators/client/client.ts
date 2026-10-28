import { readsHttpOnlyContext } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { METHOD_FUNCTION } from '@/types/http';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { ExampleRequest, RecipeId, RecipeMeta } from '@/types/recipe';

/** Payload keys from the FR-3 contract table, keyed `<recipeId>.<fn>`. Empty means a "done" line. */
export const CLIENT_PAYLOAD_KEYS: Readonly<Record<string, readonly string[]>> = {
  'R1.get': ['contacts'],
  'R2.post': ['name', 'email'],
  'R3.get': ['data'],
  'R4.get': ['data'],
  'R4.post': ['id'],
  'R4.put': [],
  'R4.del': [],
  'R5.get': ['data'],
  'R5.post': ['data'],
  'R5.put': [],
  'R5.del': [],
  'R6.get': ['message'],
  'R7.post': ['id'],
  'R8.getSummary': ['category', 'maximumResults', 'activityId', 'functionName', 'serverLogicName'],
  'R9.post': ['flowResponse'],
  'R10.get': ['data'],
  'R10.post': ['data'],
  'R10.patch': ['data'],
};

/** AC-4.7 server-pane note. Phase 21 renders it when Liquid is selected. */
export const LIQUID_SERVER_NOTE =
  'Liquid invocation needs no token and reads Server.Context.Input rather than Body or QueryParameters. Long operations cause delayed rendering.';

const BODY_METHODS: ReadonlySet<HttpMethod> = new Set(['POST', 'PUT', 'PATCH']);

const RAW_RESULT_NOTE: readonly string[] = [
  '{% comment %}',
  'result.raw_result holds the unparsed output when the handler returns non-JSON.',
  '{% endcomment %}',
];

export function isLiquidAllowed(recipe: RecipeMeta, serverText: string): boolean {
  return recipe.liquid && !readsHttpOnlyContext(serverText);
}

export function requestPathSteps(
  language: ClientLanguage,
  slug: string,
  fn: string,
): readonly { label: string; value: string }[] {
  const handler = { label: 'Handler', value: `function ${fn}()` };
  switch (language) {
    case 'fetch':
      return httpSteps('fetch()', slug, handler);
    case 'jquery':
      return httpSteps('shell.ajaxSafePost()', slug, handler);
    case 'liquid':
      return [
        { label: 'Page render', value: 'Liquid page' },
        { label: 'Tag', value: 'serverlogic' },
        handler,
        { label: 'Returns', value: 'result object' },
      ];
    default: {
      const unreachable: never = language;
      return unreachable;
    }
  }
}

export function generateClient(i: {
  slug: string;
  recipe: RecipeId;
  fn: string;
  method: HttpMethod | null;
  language: ClientLanguage;
}): string {
  const recipe = getRecipe(i.recipe);
  switch (i.language) {
    case 'liquid':
      return liquidClient(recipe, i.slug, i.fn);
    case 'fetch':
    case 'jquery':
      return httpClient(recipe, i.slug, i.fn, i.method, i.language);
    default: {
      const unreachable: never = i.language;
      return unreachable;
    }
  }
}

function httpSteps(
  pageScript: string,
  slug: string,
  handler: { label: string; value: string },
): { label: string; value: string }[] {
  return [
    { label: 'Page script', value: pageScript },
    { label: 'Token', value: '__RequestVerificationToken' },
    { label: 'Endpoint', value: `/_api/serverlogics/${slug}` },
    handler,
    { label: 'Returns', value: 'JSON string' },
  ];
}

function httpClient(
  recipe: RecipeMeta,
  slug: string,
  fn: string,
  method: HttpMethod | null,
  language: 'fetch' | 'jquery',
): string {
  const verb = agreedMethod(method, fn);
  const example = requireExample(recipe, fn);
  const json = BODY_METHODS.has(verb) ? JSON.stringify(example.body ?? {}, null, 2) : null;
  const prefix = [
    `// ${slug} | ${verb} | ${fn}`,
    ...urlLines(slug, example.query),
    '',
    ...showErrorLines(),
    '',
    ...envelopeLines(payloadKeys(recipe.id, fn)),
    '',
  ];
  switch (language) {
    case 'fetch':
      return finish([...prefix, ...fetchCall(verb, json)]);
    case 'jquery':
      return finish([...prefix, ...jqueryCall(verb, json)]);
    default: {
      const unreachable: never = language;
      return unreachable;
    }
  }
}

function agreedMethod(method: HttpMethod | null, fn: string): HttpMethod {
  if (method === null) throw new Error('not callable over HTTP');
  if (METHOD_FUNCTION[method] !== fn) {
    throw new Error(`method ${method} does not match function ${fn}`);
  }
  return method;
}

function requireExample(recipe: RecipeMeta, fn: string): ExampleRequest {
  const example = recipe.examples[fn];
  if (example === undefined) throw new Error(`unknown function ${fn}`);
  return example;
}

function payloadKeys(recipeId: RecipeId, fn: string): readonly string[] {
  const keys = CLIENT_PAYLOAD_KEYS[`${recipeId}.${fn}`];
  if (keys === undefined) throw new Error(`no payload keys for ${recipeId}.${fn}`);
  return keys;
}

/** Split on the first "=" so a value may itself contain "=" (R4 additionalParameters). */
function parseQuery(query: string): readonly (readonly [string, string])[] {
  const raw = query.startsWith('?') ? query.slice(1) : query;
  if (raw === '') return [];
  const pairs: (readonly [string, string])[] = [];
  for (const part of raw.split('&')) {
    if (part === '') continue;
    const eq = part.indexOf('=');
    if (eq === -1) pairs.push([part, '']);
    else pairs.push([part.slice(0, eq), part.slice(eq + 1)]);
  }
  return pairs;
}

function urlLines(slug: string, query: string | null): readonly string[] {
  const endpoint = `/_api/serverlogics/${slug}`;
  const pairs = query === null ? [] : parseQuery(query);
  if (pairs.length === 0) return [`const url = ${JSON.stringify(endpoint)};`];
  return [
    'const params = new URLSearchParams({',
    ...pairs.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
    '});',
    `const url = ${JSON.stringify(`${endpoint}?`)} + params;`,
  ];
}

const ENVELOPE_INVALID = 'The response was not a valid envelope.';
const DATA_UNREADABLE = 'The response data could not be read.';

function showErrorLines(): readonly string[] {
  return ['function showError(text) {', '  console.error(text);', '}'];
}

function envelopeLines(keys: readonly string[]): readonly string[] {
  const done =
    keys.length === 0
      ? '  console.log("done");'
      : `  console.log(${keys.map((key) => `parsed.${key}`).join(', ')});`;
  const invalid = `    showError(${JSON.stringify(ENVELOPE_INVALID)});`;
  const unreadable = `    showError(${JSON.stringify(DATA_UNREADABLE)});`;
  return [
    'function handleEnvelope(envelope) {',
    '  if (typeof envelope !== "object" || envelope === null) {',
    invalid,
    '    return;',
    '  }',
    '  if (envelope.success === false) {',
    '    showError(String(envelope.error));',
    '    return;',
    '  }',
    '  if (envelope.success !== true) {',
    invalid,
    '    return;',
    '  }',
    '  let parsed;',
    '  try {',
    '    parsed = JSON.parse(envelope.data);',
    '  } catch {',
    unreadable,
    '    return;',
    '  }',
    '  if (typeof parsed !== "object" || parsed === null) {',
    unreadable,
    '    return;',
    '  }',
    '  if (parsed.status !== "success") {',
    '    showError(String(parsed.message));',
    '    return;',
    '  }',
    done,
    '}',
  ];
}

function fetchCall(method: HttpMethod, json: string | null): readonly string[] {
  const lines = [
    'shell.getTokenDeferred().done(function (token) {',
    '  fetch(url, {',
    `    method: ${JSON.stringify(method)},`,
    '    headers: {',
    '      "__RequestVerificationToken": token,',
    `      "Content-Type": ${JSON.stringify('application/json')},`,
    '    },',
  ];
  if (json !== null) {
    lines.push(
      '    body: JSON.stringify(',
      ...json.split('\n').map((line) => `      ${line}`),
      '    ),',
    );
  }
  lines.push(
    '  })',
    '    .then(function (response) {',
    '      return response.json();',
    '    })',
    '    .then(handleEnvelope)',
    '    .catch(function () {',
    '      showError("The call failed before a response envelope could be read.");',
    '    });',
    '}).fail(function () {',
    '  showError("The request token was rejected.");',
    '});',
  );
  return lines;
}

function jqueryCall(method: HttpMethod, json: string | null): readonly string[] {
  const options = [
    `  type: ${JSON.stringify(method)}`,
    '  url: url',
    `  contentType: ${JSON.stringify('application/json')}`,
  ];
  if (json !== null) {
    options.push(
      ['  data: JSON.stringify(', ...json.split('\n').map((line) => `    ${line}`), '  )'].join(
        '\n',
      ),
    );
  }
  options.push('  success: handleEnvelope');
  return [
    'shell.ajaxSafePost({',
    `${options.join(',\n')},`,
    '}).fail(function () {',
    '  showError("The request failed.");',
    '});',
  ];
}

function liquidClient(recipe: RecipeMeta, slug: string, fn: string): string {
  if (!recipe.liquid) throw new Error('Liquid is not available for this recipe');
  const example = requireExample(recipe, fn);
  const lines = recipe.readsLiquidInput
    ? liquidPair(recipe.id, slug, fn, example)
    : liquidSingle(recipe.id, slug, fn);
  return finish(lines);
}

function liquidSingle(recipeId: RecipeId, slug: string, fn: string): readonly string[] {
  return [...RAW_RESULT_NOTE, serverlogicTag(slug, fn, false), ...liquidBranches(recipeId, fn)];
}

function liquidPair(
  recipeId: RecipeId,
  slug: string,
  fn: string,
  example: ExampleRequest,
): readonly string[] {
  const branches = liquidBranches(recipeId, fn);
  return [
    '{% comment %}',
    'Invoke server logic without input',
    '{% endcomment %}',
    serverlogicTag(slug, fn, false),
    ...branches,
    ...RAW_RESULT_NOTE,
    '',
    '{% comment %}',
    'Pass input to server logic',
    '{% endcomment %}',
    assignLine(example),
    serverlogicTag(slug, fn, true),
    ...branches,
  ];
}

function liquidBranches(recipeId: RecipeId, fn: string): readonly string[] {
  return [
    "{% if result.success and result.data.status == 'success' %}",
    ...liquidValues(recipeId, fn),
    '{% elsif result.success %}',
    '{{ result.data.message | escape }}',
    '{% else %}',
    '{{ result.status_code }}',
    '{% endif %}',
  ];
}

function liquidValues(recipeId: RecipeId, fn: string): readonly string[] {
  if (recipeId === 'R1') {
    return [
      '{% for contact in result.data.contacts %}',
      '{{ contact.fullname | escape }}',
      '{{ contact.email | escape }}',
      '{% endfor %}',
    ];
  }
  const keys = payloadKeys(recipeId, fn);
  if (keys.length === 0) throw new Error(`no Liquid payload for ${recipeId}.${fn}`);
  return keys.map((key) => `{{ result.data.${key} | escape }}`);
}

function assignLine(example: ExampleRequest): string {
  if (example.liquidInput === null) throw new Error('missing liquid input');
  return `{% assign inputData = '${example.liquidInput}' %}`;
}

function liquidQuoted(value: string): string {
  if (!/^[A-Za-z0-9-]+$/.test(value)) throw new Error(`unsafe Liquid literal ${value}`);
  return `'${value}'`;
}

function serverlogicTag(slug: string, fn: string, withInput: boolean): string {
  const attrs = [`name: ${liquidQuoted(slug)}`, `operation: ${liquidQuoted(fn)}`];
  if (withInput) attrs.push('input: inputData');
  attrs.push('output: result');
  return `{% serverlogic ${attrs.join(', ')} %}`;
}

function finish(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}
