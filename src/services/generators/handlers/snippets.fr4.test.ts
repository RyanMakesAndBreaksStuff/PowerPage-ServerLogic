import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { RECIPES } from '@/services/catalogue/recipes';
import {
  IS_GUID,
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  requireSettingsCode,
  validationFailureReturn,
  validationFailureReturnFor,
} from '@/services/generators/handlers/snippets';

/** Wrap in a function so `return` parses, then assert FR-4 finds nothing (AC-3.2, Test T1). */
function expectClean(snippet: string): void {
  const result = runBrowserChecks(`function probe() {\n${snippet}\n}\n`);
  expect(result.hits).toEqual([]);
  expect(result.parseFailed).toBe(false);
}

const ALL_SETTINGS = RECIPES.flatMap((r) => r.siteSettings);

describe('snippets pass the FR-4 checks with zero hits', () => {
  it('TO_RESULT and IS_GUID', () => {
    expectClean(TO_RESULT);
    expectClean(IS_GUID);
  });

  it.each(RECIPES.map((r) => r.id))('headerComment for %s', (id) => {
    const recipe = RECIPES.find((r) => r.id === id);
    expect(recipe).toBeDefined();
    if (recipe) expectClean(headerComment(recipe));
  });

  it('requireSettingsCode for every site setting in the catalogue', () => {
    expectClean(requireSettingsCode(ALL_SETTINGS, '  '));
    for (const r of RECIPES) expectClean(requireSettingsCode(r.siteSettings, ''));
  });

  it('failure and validation returns', () => {
    expectClean(failureReturn("Couldn't connect to SharePoint."));
    expectClean(failureReturn("Couldn't upload the ticket."));
    expectClean(failureReturn('Registration failed after the ticket was uploaded.'));
    expectClean(
      validationFailureReturn([{ field: 'body', message: 'Body must be a JSON object.' }]),
    );
    expectClean(validationFailureReturnFor('errors'));
  });

  it('every log line shape', () => {
    expectClean(logLine({ level: 'Log', operation: 'R4 get' }));
    expectClean(logLine({ level: 'Error', operation: 'R7 connect', fields: ['status', 'reason'] }));
    expectClean(logLine({ level: 'Error', operation: 'R4 post', fields: ['exception'] }));
    expectClean(
      logLine({
        level: 'Error',
        operation: 'R7 create after upload',
        fields: ['status', 'reason', 'activity'],
      }),
    );
    expectClean(logLine({ level: 'Warn', operation: 'R9 trigger', fields: ['activity'] }));
  });
});
