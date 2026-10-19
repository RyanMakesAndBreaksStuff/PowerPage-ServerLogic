import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  requireSettingsCode,
  validationFailureReturn,
} from './snippets';

/** Differences from the Learn Azure Function tutorial (AC-3.7, Decision 16). */
export const R6_DIFFERENCES: readonly { change: string; reason: string }[] = [
  {
    change:
      'The function URL, including its key, is read from the site setting AZURE_FUNCTION_URL.',
    reason:
      'Learn stores the function URL and key in a literal. The recipe reads that endpoint from a site setting and emits no secret (AC-3.5, correction 17).',
  },
  {
    change:
      'name is appended with encodeURIComponent, using ? or & when the setting already has a query.',
    reason:
      'Learn reads name and never sends it. The recipe sends the value URL-encoded, and joins with & when the setting already contains ? (correction 17).',
  },
  {
    change: 'name is required and must be 1 to 100 characters as received, with no default.',
    reason:
      'Learn defaults a missing name to World. The recipe rejects a missing or out-of-range name before any outbound call (FR-3).',
  },
  {
    change:
      'A missing or empty AZURE_FUNCTION_URL logs the setting name and returns the fixed failure.',
    reason: 'The handler must not call out when the endpoint is absent (F57).',
  },
  {
    change:
      'Success returns status and message set to the raw Body, or an empty message when Body is missing.',
    reason:
      'Learn returns the raw Body string as the handler result. The recipe wraps that raw Body as message and does not parse it (F01, FR-3).',
  },
  {
    change:
      'Failures log a fixed operation name with StatusCode and ReasonPhrase, or the exception name.',
    reason:
      'Learn logs err.message. The recipe logs only what the FR-3 rule allows and never logs the URL (F09).',
  },
];

const FAILURE = 'The Azure Function call failed.';
const OPERATION = 'R6 get';
const NAME_MESSAGE = 'Name is required and must be from 1 to 100 characters.';
const TRY = '    ';
const BLOCK = '      ';

export function generateR6(): GeneratedHandler {
  const nameLine = [
    '    const name = Server.Context.QueryParameters[',
    JSON.stringify('name'),
    '];',
  ].join('');
  const separatorLine = [
    '    const separator = azureFunctionUrl.indexOf(',
    JSON.stringify('?'),
    ') === -1 ? ',
    JSON.stringify('?'),
    ' : ',
    JSON.stringify('&'),
    ';',
  ].join('');
  const urlLine = [
    '    const url = azureFunctionUrl + separator + ',
    JSON.stringify('name='),
    ' + encodeURIComponent(name);',
  ].join('');
  const callLine = '    const r = toResult(await Server.Connector.HttpClient.GetAsync(url));';
  const successLine = [
    '    return JSON.stringify({ status: ',
    JSON.stringify('success'),
    ', message: r.Body == null ? ',
    JSON.stringify(''),
    ' : r.Body });',
  ].join('');
  const lines = [
    headerComment(getRecipe('R6')),
    '',
    TO_RESULT,
    '',
    'async function get() {',
    '  try {',
    nameLine,
    '    if (typeof name !== "string" || name.length < 1 || name.length > 100) {',
    validationFailureReturn([{ field: 'name', message: NAME_MESSAGE }], BLOCK),
    '    }',
    requireSettingsCode(['AZURE_FUNCTION_URL'], TRY),
    separatorLine,
    urlLine,
    callLine,
    '    if (!r.IsSuccessStatusCode) {',
    logLine({
      level: 'Error',
      operation: OPERATION,
      fields: ['status', 'reason'],
      indent: BLOCK,
    }),
    failureReturn(FAILURE, BLOCK),
    '    }',
    successLine,
    '  } catch (e) {',
    logLine({ level: 'Error', operation: OPERATION, fields: ['exception'], indent: TRY }),
    failureReturn(FAILURE, TRY),
    '  }',
    '}',
  ];
  const text = [...lines, ''].join('\n');
  const highlight = text.split('\n').indexOf(callLine);
  if (highlight < 0) throw new Error('R6 highlight line missing');
  return { text, highlightLines: [highlight + 1] };
}
