import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  TO_RESULT,
  failureReturn,
  fieldErrorLiteral,
  headerComment,
  lineNumbersMatching,
  logLine,
  validationFailureReturn,
  validationFailureReturnFor,
} from './snippets';
import type { LearnDifference } from './snippets';

/** AC-3.7 differences from the Learn external-services tutorial (Decision 16). */
export const R5_DIFFERENCES: readonly LearnDifference[] = [
  {
    change:
      "Single-record paths use People('<encoded username>') instead of appending the id before /People.",
    reason:
      'Learn builds a single-record get as baseUrl(id)/People, which is not OData key syntax (correction 17).',
  },
  {
    change:
      'username, UserName and serviceSession are checked against fixed patterns before any HttpClient call.',
    reason:
      'FR-3 requires those patterns, and invalid input must fail before an outbound call (F03).',
  },
  {
    change: 'PostAsync and PatchAsync pass application/json as the contentType argument.',
    reason:
      'A body-sending HttpClient call must pass application/json, text/html or application/x-www-form-urlencoded as contentType (correction 12). Learn omits that argument.',
  },
  {
    change:
      'get and post return status plus data (empty Body becomes null). put and del return status only.',
    reason:
      'FR-3 return shape. Learn returns the raw connector result, and put and del must not forward an upstream body (F58).',
  },
  {
    change:
      'Logger calls record a fixed operation name plus StatusCode, ReasonPhrase, e.name or ActivityId.',
    reason:
      'FR-3 logging rule. Learn logs err.message, which diagnostics can expose in the browser.',
  },
];

const USER_QUERY_MESSAGE =
  'username must be 1 to 64 letters, digits, dots, underscores or hyphens.';
const USER_BODY_MESSAGE = 'UserName must be 1 to 64 letters, digits, dots, underscores or hyphens.';
const SESSION_MESSAGE = 'serviceSession must be 0 to 64 letters, digits or parentheses.';
const BODY_MESSAGE = 'Body must be a JSON object.';
const SELECT = '?$select=UserName,FirstName,LastName,MiddleName,Age';

const FAIL = {
  get: "Couldn't read people.",
  post: "Couldn't create the person.",
  put: "Couldn't update the person.",
  del: "Couldn't remove the person.",
} as const;

type Verb = keyof typeof FAIL;

const I2 = '  ';
const I4 = '    ';
const I6 = '      ';

function q(value: string): string {
  return JSON.stringify(value);
}

function pushError(field: string, message: string, indent: string): string {
  return `${indent}errors.push(${fieldErrorLiteral(field, message)});`;
}

/** `baseUrl`, then `"/" + session` when the session is non-empty, then `tail`. */
function sessionUrl(tail: string): string {
  return `${I4}const url = baseUrl + (serviceSession !== "" ? ${q('/')} + serviceSession : "") + ${tail};`;
}

function afterCall(verb: Verb, success: readonly string[]): string[] {
  return [
    `${I4}if (!r.IsSuccessStatusCode) {`,
    logLine({ level: 'Error', operation: `R5 ${verb}`, fields: ['status', 'reason'], indent: I6 }),
    failureReturn(FAIL[verb], I6),
    `${I4}}`,
    ...success,
  ];
}

function handler(verb: Verb, inner: readonly string[]): string[] {
  return [
    `async function ${verb}() {`,
    `${I2}try {`,
    logLine({ level: 'Log', operation: `R5 ${verb}`, fields: ['activity'], indent: I4 }),
    ...inner,
    `${I2}} catch (e) {`,
    logLine({ level: 'Error', operation: `R5 ${verb}`, fields: ['exception'], indent: I4 }),
    failureReturn(FAIL[verb], I4),
    `${I2}}`,
    '}',
  ];
}

function requireBody(): string[] {
  return [
    `${I4}const body = readObject();`,
    `${I4}if (body === null) {`,
    validationFailureReturn([{ field: 'body', message: BODY_MESSAGE }], I6),
    `${I4}}`,
    `${I4}const errors = personErrors(body);`,
    `${I4}if (errors.length > 0) {`,
    validationFailureReturnFor('errors', I6),
    `${I4}}`,
  ];
}

const DATA_SUCCESS: readonly string[] = [
  `${I4}const data = r.Body ? JSON.parse(r.Body) : null;`,
  `${I4}return JSON.stringify({ status: ${q('success')}, data: data });`,
];

const STATUS_ONLY: readonly string[] = [`${I4}return JSON.stringify({ status: ${q('success')} });`];

const HELPERS: readonly string[] = [
  TO_RESULT,
  `const baseUrl = ${q('https://services.odata.org/TripPinRESTierService')};`,
  'const isUserName = value => typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(value);',
  'const isSession = value => typeof value === "string" && /^[A-Za-z0-9()]{0,64}$/.test(value);',
  '',
  'const readObject = () => {',
  '  let value = null;',
  '  try {',
  '    value = JSON.parse(Server.Context.Body);',
  '  } catch {',
  '    value = null;',
  '  }',
  '  if (value === null || Array.isArray(value) || typeof value !== "object") return null;',
  '  return value;',
  '};',
  '',
  'const personErrors = data => {',
  '  const errors = [];',
  '  if (!isSession(data.serviceSession)) {',
  pushError('serviceSession', SESSION_MESSAGE, I4),
  '  }',
  '  if (!isUserName(data.UserName)) {',
  pushError('UserName', USER_BODY_MESSAGE, I4),
  '  }',
  '  return errors;',
  '};',
];

function keyTail(variable: 'username' | 'UserName'): string {
  return `${q("/People('")} + encodeURIComponent(${variable}) + ${q("')")}`;
}

export function generateR5(): GeneratedHandler {
  const getInner: readonly string[] = [
    `${I4}const username = Server.Context.QueryParameters[${q('username')}];`,
    `${I4}const onePerson = username !== undefined && username !== null;`,
    `${I4}if (onePerson && !isUserName(username)) {`,
    validationFailureReturn([{ field: 'username', message: USER_QUERY_MESSAGE }], I6),
    `${I4}}`,
    `${I4}const url = onePerson`,
    `${I4}  ? baseUrl + ${keyTail('username')} + ${q(SELECT)}`,
    `${I4}  : baseUrl + ${q('/People')} + ${q(SELECT)};`,
    `${I4}const r = toResult(await Server.Connector.HttpClient.GetAsync(url, {}));`,
    ...afterCall('get', DATA_SUCCESS),
  ];
  const postInner: readonly string[] = [
    ...requireBody(),
    `${I4}const { serviceSession, ...person } = body;`,
    sessionUrl(q('/People')),
    `${I4}const r = toResult(await Server.Connector.HttpClient.PostAsync(url, JSON.stringify(person), {}, ${q('application/json')}));`,
    ...afterCall('post', DATA_SUCCESS),
  ];
  const putInner: readonly string[] = [
    ...requireBody(),
    `${I4}const { serviceSession, UserName, ...changes } = body;`,
    sessionUrl(keyTail('UserName')),
    `${I4}const r = toResult(await Server.Connector.HttpClient.PatchAsync(url, JSON.stringify(changes), {}, ${q('application/json')}));`,
    ...afterCall('put', STATUS_ONLY),
  ];
  const delInner: readonly string[] = [
    `${I4}const username = Server.Context.QueryParameters[${q('username')}];`,
    `${I4}const serviceSession = Server.Context.QueryParameters[${q('serviceSession')}];`,
    `${I4}const errors = [];`,
    `${I4}if (!isUserName(username)) {`,
    pushError('username', USER_QUERY_MESSAGE, I6),
    `${I4}}`,
    `${I4}if (!isSession(serviceSession)) {`,
    pushError('serviceSession', SESSION_MESSAGE, I6),
    `${I4}}`,
    `${I4}if (errors.length > 0) {`,
    validationFailureReturnFor('errors', I6),
    `${I4}}`,
    sessionUrl(keyTail('username')),
    `${I4}const r = toResult(await Server.Connector.HttpClient.DeleteAsync(url, {}));`,
    ...afterCall('del', STATUS_ONLY),
  ];
  const text = [
    headerComment(getRecipe('R5')),
    '',
    ...HELPERS,
    '',
    ...handler('get', getInner),
    '',
    ...handler('post', postInner),
    '',
    ...handler('put', putInner),
    '',
    ...handler('del', delInner),
  ].join('\n');
  const withLf = `${text}\n`;
  const highlightLines = lineNumbersMatching(withLf, (line) => line.includes('Server.Connector.'));
  return { text: withLf, highlightLines };
}
