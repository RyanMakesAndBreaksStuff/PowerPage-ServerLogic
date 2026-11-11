// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { IS_GUID, TO_RESULT, headerComment } from '@/services/generators/handlers/snippets';
import { generateR10 } from './r10';

const INVOKE = 'Server.Connector.Dataverse.InvokeCustomApi(';
const VALIDATION_RETURN =
  'return JSON.stringify({ status: "error", message: "The request isn\'t valid.", errors: errors });';
const PLACEHOLDERS = ['new_CustomBoundFunction', 'new_Action', 'new_CustomBoundAction'] as const;

function sliceFunction(text: string, name: string): string {
  const marker = `function ${name}() {`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`missing ${name}`);
  const next = text.indexOf('\nfunction ', start + marker.length);
  return text.slice(start, next === -1 ? text.length : next);
}

function lineAt(text: string, line: number): string {
  const found = text.split('\n')[line - 1];
  if (found === undefined) throw new Error(`missing line ${String(line)}`);
  return found;
}

describe('R10 handler', () => {
  it('matches the golden file exactly', () => {
    expect(generateR10().text).toBe(readGolden(import.meta.url, 'R10.js.txt'));
  });

  it('highlights exactly the three InvokeCustomApi call lines', () => {
    const { text, highlightLines } = generateR10();
    expect(highlightLines).toEqual([49, 64, 83]);
    for (const line of highlightLines) {
      expect(lineAt(text, line)).toContain(INVOKE);
    }
    const callLines = text.split('\n').filter((line) => line.includes(INVOKE));
    expect(callLines).toHaveLength(highlightLines.length);
  });

  it('has no restricted pattern or browser API and parses', () => {
    const { text } = generateR10();
    const result = runBrowserChecks(text);
    expect(result.hits).toEqual([]);
    expect(result.parseFailed).toBe(false);
  });

  it('is deterministic and LF only', () => {
    const first = generateR10();
    const second = generateR10();
    expect(second).toEqual(first);
    expect(first.text).not.toContain('\r');
    expect(first.text.endsWith('\n')).toBe(true);
    expect(first.text.endsWith('\n\n')).toBe(false);
  });

  it('exports get, post and patch, and nothing else', () => {
    const { text } = generateR10();
    expect(exportedFunctionNames(text)).toEqual(['get', 'post', 'patch']);
    expect(text).toContain('const parseJsonObject = () => {');
    expect(text).toContain('const respond = (operation, raw) => {');
    expect(text).not.toMatch(/function\s*\(/);
    expect(text).not.toMatch(/function parseJsonObject|function respond/);
  });

  it('no function is async and nothing is awaited', () => {
    const { text } = generateR10();
    expect(text).not.toMatch(/\basync\b/);
    expect(text).not.toMatch(/\bawait\b/);
  });

  it('uses the Learn call forms', () => {
    const { text } = generateR10();
    const table = getRecipe('R10').tables[0];
    expect(table?.entitySetName).toBe('accounts');
    for (const name of PLACEHOLDERS) {
      const declaration = `const ${name} = ${JSON.stringify(name)};`;
      expect(text.split(declaration)).toHaveLength(2);
    }
    expect(text).toContain(`${TO_RESULT}\n`);
    expect(text).toContain(`${IS_GUID}\n`);
    const calls = text.split('\n').filter((line) => line.includes(INVOKE));
    const getCall = calls[0];
    const postCall = calls[1];
    const patchCall = calls[2];
    if (getCall === undefined || postCall === undefined || patchCall === undefined) {
      throw new Error('expected three InvokeCustomApi lines');
    }
    expect(getCall).toContain('InvokeCustomApi("get", url)');
    expect(getCall).not.toContain('JSON.stringify');
    expect(postCall).toContain('InvokeCustomApi("post", new_Action, JSON.stringify(body))');
    expect(patchCall).toContain('InvokeCustomApi("post", url, JSON.stringify(body))');
    expect(text).toContain(
      '"accounts(" + id + ")/Microsoft.Dynamics.CRM." + new_CustomBoundFunction',
    );
    expect(text).toContain(
      '"accounts(" + id + ")/Microsoft.Dynamics.CRM." + new_CustomBoundAction',
    );
    expect(text).not.toMatch(/Microsoft\.Dynamics\.CRM\.[A-Za-z0-9_]+\(\)/);
    expect(sliceFunction(text, 'post')).not.toContain('accounts(');
  });

  it('validates before any call', () => {
    const { text } = generateR10();
    for (const name of ['get', 'post', 'patch'] as const) {
      const body = sliceFunction(text, name);
      const validationAt = body.indexOf(VALIDATION_RETURN);
      const callAt = body.indexOf(INVOKE);
      expect(validationAt).toBeGreaterThanOrEqual(0);
      expect(callAt).toBeGreaterThan(validationAt);
    }
    const post = sliceFunction(text, 'post');
    expect(post).not.toContain('QueryParameters');
    expect(post).not.toContain('["id"]');
    expect(post).not.toContain('isGuid');
    expect(post).toContain('Body must be a JSON object.');
    expect(post).not.toContain('id is required.');
    const get = sliceFunction(text, 'get');
    expect(get).not.toContain('parseJsonObject');
    expect(get).not.toContain('Server.Context.Body');
    expect(get).toContain('Server.Context.QueryParameters["id"]');
    expect(get).toContain('id is required.');
    expect(get).toContain('id must be a GUID.');
    expect(get).not.toContain('Body must be a JSON object.');
    const patch = sliceFunction(text, 'patch');
    expect(patch).toContain('Server.Context.QueryParameters["id"]');
    expect(patch).toContain('id must be a GUID.');
    expect(patch).toContain('Body must be a JSON object.');
  });

  it('logging rule', () => {
    const { text } = generateR10();
    const allowed =
      /^(?:"(?:[^"\\]|\\.)*"|(?:[A-Za-z_$][\w$]*\.)?StatusCode|(?:[A-Za-z_$][\w$]*\.)?ReasonPhrase|[A-Za-z_$][\w$]*\.name|Server\.Context\.ActivityId)$/;
    const loggerLines = text.split('\n').filter((line) => line.includes('Server.Logger.'));
    expect(loggerLines.length).toBeGreaterThan(0);
    for (const line of loggerLines) {
      const open = line.indexOf('(');
      const args = line.slice(open + 1, line.lastIndexOf(')'));
      const parts = args.split(' + ');
      expect(parts[0]?.startsWith('"')).toBe(true);
      for (const part of parts) expect(part).toMatch(allowed);
      expect(line).not.toMatch(/Body|\.message|Url|https?:/);
    }
    expect(text).not.toContain('e.message');
  });

  it('header comment links the server-objects Learn page and the replace-the-names comment is present', () => {
    const { text } = generateR10();
    const header = headerComment(getRecipe('R10'));
    expect(text.startsWith(header)).toBe(true);
    expect(header).toContain(
      'https://learn.microsoft.com/en-us/power-pages/configure/server-objects',
    );
    expect(text).toContain(
      '// Replace new_CustomBoundFunction, new_Action and new_CustomBoundAction, and review what each API changes beyond the bound record.',
    );
  });
});
