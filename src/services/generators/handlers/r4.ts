import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  IS_GUID,
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  validationFailureReturnFor,
} from './snippets';

// Arrow helpers stay out of exportedFunctionNames, which counts function declarations only.
// Each Logger call stays inline so the operation name is a string literal.

const OP = { get: 'R4 get', post: 'R4 post', put: 'R4 put', del: 'R4 del' } as const;

const MSG = {
  read: "The contact couldn't be read.",
  create: "The contact couldn't be created.",
  update: "The contact couldn't be updated.",
  remove: "The contact couldn't be removed.",
  entity: 'entitySetName is not in the allowlist.',
  id: 'id must be a GUID.',
  options: 'additionalParameters must be allowed OData options of at most 500 characters.',
  body: 'Body must be a JSON object.',
} as const;

export const R4_DIFFERENCES: readonly { change: string; reason: string }[] = [
  {
    change: 'Allowlist and GUID check',
    reason:
      'Learn reads entitySetName and id straight from the query string, so any caller can name any table. The handler allows only contacts and checks id with isGuid.',
  },
  {
    change: 'put uses entitySetName',
    reason:
      "Learn's put snippet hardcodes the accounts table. The full listing and this handler use the allowlisted entitySetName.",
  },
  {
    change: 'Reworded comments',
    reason:
      'Learn comments include a word the runtime rejects as a restricted pattern. This handler keeps comments to the header.',
  },
  {
    change: 'Narrower table permissions',
    reason:
      'Learn grants Read, Write, Create and Delete as Global. This recipe uses Account access for Read, Write and Delete, plus Global Create only, because Learn binds no account on create.',
  },
  {
    change: '$top default 10, cap 50 and option rules',
    reason:
      'A list read without $top gets $top=10. $top must be an integer from 1 to 50. Only $select, $filter, $top, $orderby and $expand are accepted, each once, in at most 500 characters.',
  },
  {
    change: 'Fixed return shape',
    reason:
      'Learn returns the connector result. This handler returns status success with data or id, or status alone for put and del, and a fixed message on failure.',
  },
  {
    change: 'No exception text in logs',
    reason:
      'Learn logs err.message, which can reach the browser. This handler logs the operation name, ActivityId, e.name, StatusCode and ReasonPhrase only.',
  },
  {
    change: 'toResult and status checks',
    reason:
      'A connector result may be a JSON string. Every call goes through toResult and is rejected when IsSuccessStatusCode is false, including a blocked call.',
  },
  {
    change: 'Ampersand inside a $filter value is not supported',
    reason:
      'Options are split on &. A filter value that itself contains & is rejected rather than passed through.',
  },
];

function pushError(field: string, message: string, indent: string): string {
  return `${indent}errors.push({ field: ${JSON.stringify(field)}, message: ${JSON.stringify(message)} });`;
}

function successReturn(indent: string, extra?: string): string {
  const tail = extra === undefined ? '' : `, ${extra}`;
  return `${indent}return JSON.stringify({ status: ${JSON.stringify('success')}${tail} });`;
}

function tryOpen(operation: string): string[] {
  return [
    '  try {',
    logLine({ level: 'Log', operation, fields: ['activity'], indent: '    ' }),
    '    const errors = [];',
  ];
}

function validationGate(): string[] {
  return ['    if (errors.length > 0) {', validationFailureReturnFor('errors', '      '), '    }'];
}

function failedResult(operation: string, message: string, indent: string): string[] {
  const nested = `${indent}  `;
  return [
    `${indent}if (!r || !r.IsSuccessStatusCode) {`,
    `${nested}if (r) {`,
    logLine({
      level: 'Error',
      operation,
      fields: ['status', 'reason'],
      indent: `${indent}    `,
    }),
    `${nested}}`,
    failureReturn(message, nested),
    `${indent}}`,
  ];
}

function catchClose(operation: string, message: string): string[] {
  return [
    '  } catch (e) {',
    logLine({ level: 'Error', operation, fields: ['exception'], indent: '    ' }),
    failureReturn(message, '    '),
    '  }',
  ];
}

function sharedHelpers(): string[] {
  const empty = JSON.stringify('');
  const cap = JSON.stringify(500);
  const topCap = JSON.stringify(50);
  return [
    'const OPTION_SEGMENT = /^\\$(select|filter|top|orderby|expand)=/;',
    'const TOP_VALUE = /^[1-9][0-9]?$/;',
    '',
    'const checkOptions = (raw) => {',
    `  if (raw === undefined || raw === null || raw === ${empty}) return { ok: true, value: ${empty} };`,
    `  if (typeof raw !== "string" || raw.length > ${cap}) return { ok: false, value: ${empty} };`,
    `  const parts = raw.split(${JSON.stringify('&')});`,
    '  const seen = {};',
    '  for (const part of parts) {',
    '    const matched = OPTION_SEGMENT.exec(part);',
    `    if (!matched) return { ok: false, value: ${empty} };`,
    '    const name = matched[1];',
    `    if (seen[name]) return { ok: false, value: ${empty} };`,
    '    seen[name] = true;',
    `    if (name === ${JSON.stringify('top')}) {`,
    '      const value = part.slice(matched[0].length);',
    `      if (!TOP_VALUE.test(value) || Number(value) > ${topCap}) return { ok: false, value: ${empty} };`,
    '    }',
    '  }',
    '  return { ok: true, value: raw };',
    '};',
    '',
    'const readObjectBody = () => {',
    '  try {',
    '    const parsed = JSON.parse(Server.Context.Body);',
    '    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;',
    '    return null;',
    '  } catch (parseError) {',
    '    return null;',
    '  }',
    '};',
    '',
    'const collectEntitySet = (errors) => {',
    `  const entitySetName = Server.Context.QueryParameters[${JSON.stringify('entitySetName')}];`,
    '  if (ALLOWED_ENTITY_SETS.indexOf(entitySetName) === -1) {',
    pushError('entitySetName', MSG.entity, '    '),
    '  }',
    '  return entitySetName;',
    '};',
    '',
    'const collectRequiredId = (errors) => {',
    `  const id = Server.Context.QueryParameters[${JSON.stringify('id')}];`,
    '  if (!isGuid(id)) {',
    pushError('id', MSG.id, '    '),
    '  }',
    '  return id;',
    '};',
    '',
    'const collectBody = (errors) => {',
    '  const parsedBody = readObjectBody();',
    '  if (parsedBody === null) {',
    pushError('body', MSG.body, '    '),
    '  }',
    '  return parsedBody;',
    '};',
    '',
    'const withoutAnnotationKeys = (body) => {',
    '  const kept = {};',
    '  for (const key of Object.keys(body)) {',
    `    if (key.indexOf(${JSON.stringify('@')}) === -1) kept[key] = body[key];`,
    '  }',
    '  return kept;',
    '};',
  ];
}

function emitGet(): string[] {
  const empty = JSON.stringify('');
  return [
    ...tryOpen(OP.get),
    '    const entitySetName = collectEntitySet(errors);',
    `    const idValue = Server.Context.QueryParameters[${JSON.stringify('id')}];`,
    `    const hasId = idValue !== undefined && idValue !== null && idValue !== ${empty};`,
    '    if (hasId && !isGuid(idValue)) {',
    pushError('id', MSG.id, '      '),
    '    }',
    `    const rawOptions = Server.Context.QueryParameters[${JSON.stringify('additionalParameters')}];`,
    '    const checked = checkOptions(rawOptions);',
    '    if (!checked.ok) {',
    pushError('additionalParameters', MSG.options, '      '),
    '    }',
    ...validationGate(),
    '    if (hasId) {',
    '      const r = toResult(Server.Connector.Dataverse.RetrieveRecord(entitySetName, idValue, checked.value));',
    ...failedResult(OP.get, MSG.read, '      '),
    '      const data = r.Body ? JSON.parse(r.Body) : null;',
    successReturn('      ', 'data'),
    '    }',
    '    let options = checked.value;',
    '    if (!/(^|&)\\$top=/.test(options)) {',
    `      options = options === ${empty} ? ${JSON.stringify('$top=10')} : options + ${JSON.stringify('&$top=10')};`,
    '    }',
    '    const r = toResult(Server.Connector.Dataverse.RetrieveMultipleRecords(entitySetName, options));',
    ...failedResult(OP.get, MSG.read, '    '),
    '    let data = null;',
    '    if (r.Body) {',
    '      const parsed = JSON.parse(r.Body);',
    '      data = parsed && Array.isArray(parsed.value) ? parsed.value : null;',
    '    }',
    successReturn('    ', 'data'),
    ...catchClose(OP.get, MSG.read),
  ];
}

function emitPost(): string[] {
  return [
    ...tryOpen(OP.post),
    '    const entitySetName = collectEntitySet(errors);',
    '    const parsedBody = collectBody(errors);',
    ...validationGate(),
    '    const record = withoutAnnotationKeys(parsedBody);',
    '    const r = toResult(Server.Connector.Dataverse.CreateRecord(entitySetName, JSON.stringify(record)));',
    ...failedResult(OP.post, MSG.create, '    '),
    '    const id = r.Headers && (r.Headers.entityid ?? r.Headers.entityId);',
    '    if (!id) {',
    logLine({ level: 'Error', operation: OP.post, indent: '      ' }),
    failureReturn(MSG.create, '      '),
    '    }',
    successReturn('    ', 'id'),
    ...catchClose(OP.post, MSG.create),
  ];
}

function emitPut(): string[] {
  return [
    ...tryOpen(OP.put),
    '    const entitySetName = collectEntitySet(errors);',
    '    const id = collectRequiredId(errors);',
    '    const parsedBody = collectBody(errors);',
    ...validationGate(),
    '    const record = withoutAnnotationKeys(parsedBody);',
    '    const r = toResult(Server.Connector.Dataverse.UpdateRecord(entitySetName, id, JSON.stringify(record)));',
    ...failedResult(OP.put, MSG.update, '    '),
    successReturn('    '),
    ...catchClose(OP.put, MSG.update),
  ];
}

function emitDel(): string[] {
  return [
    ...tryOpen(OP.del),
    '    const entitySetName = collectEntitySet(errors);',
    '    const id = collectRequiredId(errors);',
    ...validationGate(),
    '    const r = toResult(Server.Connector.Dataverse.DeleteRecord(entitySetName, id));',
    ...failedResult(OP.del, MSG.remove, '    '),
    successReturn('    '),
    ...catchClose(OP.del, MSG.remove),
  ];
}

function emitFunction(name: 'get' | 'post' | 'put' | 'del', body: readonly string[]): string[] {
  return [`function ${name}() {`, ...body, '}'];
}

function handlerLines(): string[] {
  return [
    ...headerComment(getRecipe('R4')).split('\n'),
    '',
    TO_RESULT,
    IS_GUID,
    `const ALLOWED_ENTITY_SETS = [${JSON.stringify('contacts')}];`,
    '',
    ...sharedHelpers(),
    '',
    ...emitFunction('get', emitGet()),
    '',
    ...emitFunction('post', emitPost()),
    '',
    ...emitFunction('put', emitPut()),
    '',
    ...emitFunction('del', emitDel()),
  ];
}

function connectorHighlightLines(text: string): readonly number[] {
  const highlights: number[] = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.includes('Server.Connector.') === true) highlights.push(index + 1);
  }
  return highlights;
}

export function generateR4(): GeneratedHandler {
  const text = `${handlerLines().join('\n')}\n`;
  if (text.includes('${')) throw new Error('Handler text contains a template placeholder');
  return { text, highlightLines: connectorHighlightLines(text) };
}
