import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { exportedFunctionNames, readsHttpOnlyContext } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { headerComment, validationFailureReturnFor } from '@/services/generators/handlers/snippets';
import { generateR8 } from './r8';

// Vite rewrites `new URL('./file', import.meta.url)` into an http URL in this client environment,
// and a file URL whose path contains %20 is rejected by readFileSync on Windows.
const golden = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '__golden__', 'R8.js.txt'),
  'utf8',
);

describe('generateR8', () => {
  it('matches the golden file', () => {
    const { text } = generateR8();
    expect(text).toBe(golden);
    expect(text.startsWith(`${headerComment(getRecipe('R8'))}\n\n`)).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
  });

  it('highlights the Input read', () => {
    const { text, highlightLines } = generateR8();
    expect(highlightLines).toEqual([7]);
    expect(text.split('\n')[6] ?? '').toContain('Server.Context.Input');
  });

  it('has zero FR-4 hits', () => {
    const { hits, parseFailed } = runBrowserChecks(generateR8().text);
    expect(hits).toEqual([]);
    expect(parseFailed).toBe(false);
  });

  it('exports only getSummary', () => {
    const { text } = generateR8();
    expect(exportedFunctionNames(text)).toEqual(['getSummary']);
    expect(text).toContain('function getSummary()');
    expect(text).not.toContain('async');
    expect(text).not.toContain('await');
  });

  it('reads no HTTP-only context', () => {
    const { text } = generateR8();
    expect(readsHttpOnlyContext(text)).toBe(false);
    expect(text).not.toContain('Server.Context.Body');
    expect(text).not.toContain('.Headers');
    expect(text).not.toContain('.HttpMethod');
    expect(text).not.toContain('.QueryParameters');
    expect(text).not.toContain('.Url');
  });

  it('parses input with defaults and limits', () => {
    const { text } = generateR8();
    expect(text).toContain('JSON.parse(Server.Context.Input || "{}")');
    expect(text).toContain('""');
    expect(text).toContain('5');
    expect(text).toContain('50');
    expect(text).toContain('1');
    expect(text).toContain('Number.isInteger');
    expect(text).toContain(validationFailureReturnFor('errors', '    '));
    expect(text).toContain('Input must be a JSON object.');
    expect(text).toContain('category must be a string of 50 characters or fewer.');
    expect(text).toContain('maximumResults must be a whole number from 1 to 50.');
  });

  it('returns the context identifiers', () => {
    const { text } = generateR8();
    expect(text).toContain(
      'JSON.stringify({ status: "success", category, maximumResults, activityId, functionName, serverLogicName })',
    );
    expect(text).toContain('Server.Context.ActivityId');
    expect(text).toContain('Server.Context.FunctionName');
    expect(text).toContain('Server.Context.ServerLogicName');
    expect(text).not.toContain('Server.Logger');
    expect(text).not.toContain('Server.Connector');
    expect(text).not.toContain('Server.SiteSetting');
    expect(text).not.toContain('Server.User');
    expect(text).not.toContain('toResult');
  });
});
