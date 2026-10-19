import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  headerComment,
  logLine,
  validationFailureReturnFor,
} from '@/services/generators/handlers/snippets';

function fieldError(field: string, message: string): string {
  return `{ field: ${JSON.stringify(field)}, message: ${JSON.stringify(message)} }`;
}

const BODY_MESSAGE = 'Body must be a JSON object.';
const NAME_MESSAGE = 'Name is required and must be 100 characters or fewer.';
const EMAIL_MESSAGE = 'Email must be a valid address of 254 characters or fewer.';

export function generateR2(): GeneratedHandler {
  const bodyFail = [
    `    const errors = [${fieldError('body', BODY_MESSAGE)}];`,
    validationFailureReturnFor('errors', '    '),
  ];
  const lines = [
    headerComment(getRecipe('R2')),
    '',
    'function post() {',
    '  let body;',
    '  try {',
    '    body = JSON.parse(Server.Context.Body);',
    '  } catch {',
    ...bodyFail,
    '  }',
    `  if (body === null || Array.isArray(body) || typeof body !== ${JSON.stringify('object')}) {`,
    ...bodyFail,
    '  }',
    `  const name = typeof body.name === ${JSON.stringify('string')} ? body.name.trim() : body.name;`,
    `  const email = typeof body.email === ${JSON.stringify('string')} ? body.email.trim() : body.email;`,
    '  const errors = [];',
    `  if (typeof name !== ${JSON.stringify('string')} || name.length === 0 || name.length > 100) {`,
    `    errors.push(${fieldError('name', NAME_MESSAGE)});`,
    '  }',
    '  let emailOk = false;',
    `  if (typeof email === ${JSON.stringify('string')} && email.length <= 254) {`,
    `    const parts = email.split(${JSON.stringify('@')});`,
    `    emailOk = parts.length === 2 && parts[1].indexOf(${JSON.stringify('.')}) !== -1;`,
    '  }',
    '  if (!emailOk) {',
    `    errors.push(${fieldError('email', EMAIL_MESSAGE)});`,
    '  }',
    '  if (errors.length > 0) {',
    logLine({ level: 'Warn', operation: 'R2 post rejected', indent: '    ' }),
    validationFailureReturnFor('errors', '    '),
    '  }',
    `  return JSON.stringify({ status: ${JSON.stringify('success')}, name, email });`,
    '}',
    '',
  ];
  const text = lines.join('\n');
  const line = text.split('\n').findIndex((item) => item.includes('Server.Context.Body'));
  if (line < 0) throw new Error('R2 is missing the Server.Context.Body read');
  return { text, highlightLines: [line + 1] };
}
