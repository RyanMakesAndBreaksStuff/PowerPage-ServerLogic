import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import { fieldErrorLiteral, headerComment, validationFailureReturnFor } from './snippets';

const INPUT_MESSAGE = 'Input must be a JSON object.';
const CATEGORY_MESSAGE = 'category must be a string of 50 characters or fewer.';
const MAXIMUM_RESULTS_MESSAGE = 'maximumResults must be a whole number from 1 to 50.';

export function generateR8(): GeneratedHandler {
  const validationReturn = validationFailureReturnFor('errors', '    ');
  const lines = [
    ...headerComment(getRecipe('R8')).split('\n'),
    '',
    'function getSummary() {',
    '  let input = null;',
    '  try {',
    `    input = JSON.parse(Server.Context.Input || ${JSON.stringify('{}')});`,
    '  } catch (e) {',
    '    input = null;',
    '  }',
    '  const errors = [];',
    `  if (input === null || Array.isArray(input) || typeof input !== ${JSON.stringify('object')}) {`,
    `    errors.push(${fieldErrorLiteral('input', INPUT_MESSAGE)});`,
    validationReturn,
    '  }',
    `  const category = input.category === undefined ? ${JSON.stringify('')} : input.category;`,
    `  if (typeof category !== ${JSON.stringify('string')} || category.length > ${JSON.stringify(50)}) {`,
    `    errors.push(${fieldErrorLiteral('category', CATEGORY_MESSAGE)});`,
    '  }',
    `  const maximumResults = input.maximumResults === undefined ? ${JSON.stringify(5)} : input.maximumResults;`,
    `  if (!Number.isInteger(maximumResults) || maximumResults < ${JSON.stringify(1)} || maximumResults > ${JSON.stringify(50)}) {`,
    `    errors.push(${fieldErrorLiteral('maximumResults', MAXIMUM_RESULTS_MESSAGE)});`,
    '  }',
    '  if (errors.length > 0) {',
    validationReturn,
    '  }',
    '  const activityId = Server.Context.ActivityId;',
    '  const functionName = Server.Context.FunctionName;',
    '  const serverLogicName = Server.Context.ServerLogicName;',
    `  return JSON.stringify({ status: ${JSON.stringify('success')}, category, maximumResults, activityId, functionName, serverLogicName });`,
    '}',
    '',
  ];
  return { text: lines.join('\n'), highlightLines: [7] };
}
