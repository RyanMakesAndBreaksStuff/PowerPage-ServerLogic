import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import { TO_RESULT, failureReturn, headerComment, logLine } from './snippets';

const FAILURE = "Couldn't read contacts.";
const OPERATION = 'R1 get';
const OPTIONS = '$select=contactid,fullname,emailaddress1&$top=10';

export function generateR1(): GeneratedHandler {
  const recipe = getRecipe('R1');
  const table = recipe.tables[0];
  if (table === undefined) throw new Error('R1 has no table');

  const readLine = [
    '    const r = toResult(Server.Connector.Dataverse.RetrieveMultipleRecords(',
    JSON.stringify(table.entitySetName),
    ', ',
    JSON.stringify(OPTIONS),
    '));',
  ].join('');

  const lines = [
    headerComment(recipe),
    '',
    TO_RESULT,
    '',
    'function get() {',
    '  try {',
    readLine,
    '    if (!r.IsSuccessStatusCode) {',
    logLine({
      level: 'Error',
      operation: OPERATION,
      fields: ['status', 'reason'],
      indent: '      ',
    }),
    failureReturn(FAILURE, '      '),
    '    }',
    '    const parsed = r.Body ? JSON.parse(r.Body) : null;',
    '    const value = parsed && Array.isArray(parsed.value) ? parsed.value : [];',
    '    const contacts = value.map(row => ({ id: row.contactid, fullname: row.fullname, email: row.emailaddress1 }));',
    '    return JSON.stringify({ status: "success", contacts });',
    '  } catch (e) {',
    logLine({ level: 'Error', operation: OPERATION, fields: ['exception'], indent: '    ' }),
    failureReturn(FAILURE, '    '),
    '  }',
    '}',
  ];

  const text = [...lines, ''].join('\n');
  const highlight = text.split('\n').indexOf(readLine);
  if (highlight < 0) throw new Error('R1 highlight line missing');
  return { text, highlightLines: [highlight + 1] };
}
