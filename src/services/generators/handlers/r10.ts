import { getRecipe } from '@/services/catalogue/recipes';
import type { GeneratedHandler } from '@/types/recipe';
import {
  IS_GUID,
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  validationFailureReturnFor,
} from './snippets';

const BOUND_FUNCTION = 'new_CustomBoundFunction';
const UNBOUND_ACTION = 'new_Action';
const BOUND_ACTION = 'new_CustomBoundAction';
const FAILURE_MESSAGE = "Couldn't call the custom API.";
const OPERATIONS = ['R10 get', 'R10 post', 'R10 patch'] as const;

const REPLACE_COMMENT = [
  '// Replace ',
  BOUND_FUNCTION,
  ', ',
  UNBOUND_ACTION,
  ' and ',
  BOUND_ACTION,
  ', and review what each API changes beyond the bound record.',
].join('');

function placeholder(name: string): string {
  return `const ${name} = ${JSON.stringify(name)};`;
}

function errorObject(field: string, message: string): string {
  return `{ field: ${JSON.stringify(field)}, message: ${JSON.stringify(message)} }`;
}

function successReturn(dataExpr: string): string {
  const data = dataExpr === 'data' ? 'data' : `data: ${dataExpr}`;
  return `JSON.stringify({ status: ${JSON.stringify('success')}, ${data} })`;
}

function idLines(): string[] {
  return [
    '  const id = Server.Context.QueryParameters["id"];',
    `  if (!id) errors.push(${errorObject('id', 'id is required.')});`,
    `  else if (!isGuid(id)) errors.push(${errorObject('id', 'id must be a GUID.')});`,
  ];
}

function validationReturn(): string[] {
  return ['  if (errors.length > 0) {', validationFailureReturnFor('errors', '    '), '  }'];
}

function boundUrl(entitySet: string, constantName: string): string {
  const prefix = JSON.stringify(`${entitySet}(`);
  const suffix = JSON.stringify(')/Microsoft.Dynamics.CRM.');
  return `    const url = ${prefix} + id + ${suffix} + ${constantName};`;
}

function invokeLine(operation: string, args: readonly string[]): string {
  const call = ['Server.Connector.Dataverse.InvokeCustomApi(', args.join(', '), ')'].join('');
  return ['    return respond(', JSON.stringify(operation), ', ', call, ');'].join('');
}

function catchBlock(operation: string): string[] {
  return [
    '  } catch (e) {',
    logLine({ level: 'Error', operation, fields: ['exception'], indent: '    ' }),
    failureReturn(FAILURE_MESSAGE, '    '),
    '  }',
  ];
}

function parseJsonObjectFunction(): string[] {
  return [
    'const parseJsonObject = () => {',
    '  try {',
    '    const value = JSON.parse(Server.Context.Body);',
    '    if (value !== null && typeof value === "object" && !Array.isArray(value)) return value;',
    '  } catch {',
    '    return null;',
    '  }',
    '  return null;',
    '};',
  ];
}

/** One literal log per operation so every Server.Logger call keeps a string literal (F09). */
function statusBranches(): string[] {
  const lines: string[] = [];
  OPERATIONS.forEach((operation, index) => {
    const keyword = index === 0 ? 'if' : '} else if';
    lines.push(`    ${keyword} (operation === ${JSON.stringify(operation)}) {`);
    lines.push(
      logLine({ level: 'Error', operation, fields: ['status', 'reason'], indent: '      ' }),
    );
  });
  lines.push('    }');
  return lines;
}

function respondFunction(): string[] {
  return [
    'const respond = (operation, raw) => {',
    '  const r = toResult(raw);',
    '  if (!r.IsSuccessStatusCode) {',
    ...statusBranches(),
    failureReturn(FAILURE_MESSAGE, '    '),
    '  }',
    `  if (!r.Body) return ${successReturn('null')};`,
    '  const data = JSON.parse(r.Body);',
    `  return ${successReturn('data')};`,
    '};',
  ];
}

function getFunction(entitySet: string): string[] {
  return [
    'function get() {',
    '  const errors = [];',
    ...idLines(),
    ...validationReturn(),
    '  try {',
    boundUrl(entitySet, BOUND_FUNCTION),
    invokeLine('R10 get', [JSON.stringify('get'), 'url']),
    ...catchBlock('R10 get'),
    '}',
  ];
}

function postFunction(): string[] {
  return [
    'function post() {',
    '  const errors = [];',
    '  const body = parseJsonObject();',
    `  if (body === null) errors.push(${errorObject('body', 'Body must be a JSON object.')});`,
    ...validationReturn(),
    '  try {',
    invokeLine('R10 post', [JSON.stringify('post'), UNBOUND_ACTION, 'JSON.stringify(body)']),
    ...catchBlock('R10 post'),
    '}',
  ];
}

function patchFunction(entitySet: string): string[] {
  return [
    'function patch() {',
    '  const errors = [];',
    ...idLines(),
    '  const body = parseJsonObject();',
    `  if (body === null) errors.push(${errorObject('body', 'Body must be a JSON object.')});`,
    ...validationReturn(),
    '  try {',
    boundUrl(entitySet, BOUND_ACTION),
    invokeLine('R10 patch', [JSON.stringify('post'), 'url', 'JSON.stringify(body)']),
    ...catchBlock('R10 patch'),
    '}',
  ];
}

export function generateR10(): GeneratedHandler {
  const recipe = getRecipe('R10');
  const table = recipe.tables[0];
  if (table === undefined) throw new Error('R10 has no table');
  const lines: string[] = [
    ...headerComment(recipe).split('\n'),
    '',
    REPLACE_COMMENT,
    placeholder(BOUND_FUNCTION),
    placeholder(UNBOUND_ACTION),
    placeholder(BOUND_ACTION),
    '',
    TO_RESULT,
    IS_GUID,
    '',
    ...parseJsonObjectFunction(),
    '',
    ...respondFunction(),
    '',
    ...getFunction(table.entitySetName),
    '',
    ...postFunction(),
    '',
    ...patchFunction(table.entitySetName),
  ];
  const highlightLines = lines.flatMap((line, index) =>
    line.includes('Server.Connector.Dataverse.InvokeCustomApi(') ? [index + 1] : [],
  );
  if (highlightLines.length !== 3) throw new Error('R10 highlight lines');
  return { text: `${lines.join('\n')}\n`, highlightLines };
}
