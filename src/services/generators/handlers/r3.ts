import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  requireSettingsCode,
  singleHighlight,
  validationFailureReturnFor,
} from './snippets';

const FAILURE = 'The external API call failed.';
const OPERATION = 'R3 get';
const Q_MESSAGE = 'q must be 100 characters or fewer.';
const TRY = '    ';
const BLOCK = '      ';

export function generateR3(): GeneratedHandler {
  const qLine = [
    '    const q = Server.Context.QueryParameters[',
    JSON.stringify('q'),
    '] ?? ',
    JSON.stringify(''),
    ';',
  ].join('');

  const errorsLine = [
    '      const errors = [{ field: ',
    JSON.stringify('q'),
    ', message: ',
    JSON.stringify(Q_MESSAGE),
    ' }];',
  ].join('');

  const urlLine = [
    '    const url = q === ',
    JSON.stringify(''),
    ' ? externalApiBaseUrl : externalApiBaseUrl + ',
    JSON.stringify('?q='),
    ' + encodeURIComponent(q);',
  ].join('');

  const callLine = [
    '    const r = toResult(await Server.Connector.HttpClient.GetAsync(url, { Accept: ',
    JSON.stringify('application/json'),
    ' }));',
  ].join('');

  const successLine = [
    '    return JSON.stringify({ status: ',
    JSON.stringify('success'),
    ', data });',
  ].join('');

  const lines = [
    headerComment(getRecipe('R3')),
    '',
    TO_RESULT,
    '',
    'async function get() {',
    '  try {',
    qLine,
    '    if (typeof q !== "string" || q.length > 100) {',
    errorsLine,
    validationFailureReturnFor('errors', BLOCK),
    '    }',
    requireSettingsCode(['ExternalApi/BaseUrl'], TRY),
    '    // The site setting must not contain a query string.',
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
    '    const data = r.Body ? JSON.parse(r.Body) : null;',
    successLine,
    '  } catch (e) {',
    logLine({ level: 'Error', operation: OPERATION, fields: ['exception'], indent: TRY }),
    failureReturn(FAILURE, TRY),
    '  }',
    '}',
  ];

  const text = [...lines, ''].join('\n');
  return singleHighlight('R3', text, callLine);
}
