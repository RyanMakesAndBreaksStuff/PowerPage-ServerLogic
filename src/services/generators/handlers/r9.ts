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

const OPERATION = 'R9 trigger';
const FAILURE = "Couldn't trigger the flow.";
const BODY_MESSAGE = 'Body must be a JSON object.';
const BODY_INDENT = '    ';
const FAIL_INDENT = '      ';

export function generateR9(): GeneratedHandler {
  const objectCheck = [
    '    if (value === null || Array.isArray(value) || typeof value !== ',
    JSON.stringify('object'),
    ') return null;',
  ].join('');

  const callLine =
    '    const r = toResult(await Server.Connector.CloudFlow.TriggerAsync(cloudFlowId, JSON.stringify(payload)));';

  const successLine = [
    '    return JSON.stringify({ status: ',
    JSON.stringify('success'),
    ', flowResponse });',
  ].join('');

  const lines = [
    headerComment(getRecipe('R9')),
    '',
    TO_RESULT,
    '',
    'const parseJsonObject = () => {',
    '  try {',
    '    const value = JSON.parse(Server.Context.Body);',
    objectCheck,
    '    return value;',
    '  } catch {',
    '    return null;',
    '  }',
    '};',
    '',
    'async function post() {',
    '  const payload = parseJsonObject();',
    '  if (!payload) {',
    validationFailureReturn([{ field: 'body', message: BODY_MESSAGE }], BODY_INDENT),
    '  }',
    '  try {',
    requireSettingsCode(['CLOUD_FLOW_ID'], BODY_INDENT),
    callLine,
    '    if (!r.IsSuccessStatusCode) {',
    logLine({
      level: 'Error',
      operation: OPERATION,
      fields: ['status', 'reason'],
      indent: FAIL_INDENT,
    }),
    failureReturn(FAILURE, FAIL_INDENT),
    '    }',
    '    let flowResponse = null;',
    '    if (r.Body) {',
    '      try {',
    '        flowResponse = JSON.parse(r.Body);',
    '      } catch {',
    '        flowResponse = r.Body;',
    '      }',
    '    }',
    successLine,
    '  } catch (e) {',
    logLine({ level: 'Error', operation: OPERATION, fields: ['exception'], indent: BODY_INDENT }),
    failureReturn(FAILURE, BODY_INDENT),
    '  }',
    '}',
  ];

  const text = [...lines, ''].join('\n');
  const highlight = text.split('\n').indexOf(callLine);
  if (highlight < 0) throw new Error('R9 highlight line missing');
  return { text, highlightLines: [highlight + 1] };
}
