// @vitest-environment node
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';
import { describe, expect, it, vi } from 'vitest';
import { readGolden } from '@/test/readGolden';
import type { RecipeId } from '@/types/recipe';
import { generateDemoPage } from './demoPages';

const SLUG = 'customer-summary';
const NO_PAGE: readonly RecipeId[] = ['R1', 'R2', 'R3', 'R7', 'R8', 'R9', 'R10'];
const HOSTILE_SLUGS = [
  '</script><script>x</script>',
  '"><img onerror=x>',
  "a'b&c",
  '../x',
] as const;

function requirePage(id: 'R4' | 'R5' | 'R6', slug = SLUG): string {
  const page = generateDemoPage(id, slug);
  expect(page).not.toBeNull();
  if (page === null) throw new Error(`expected a ${id} page`);
  return page;
}

function countOf(text: string, needle: string): number {
  let count = 0;
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(needle, from);
    if (at === -1) return count;
    count += 1;
    from = at + needle.length;
  }
  return count;
}

/** Brace-match a `function name(` body. Page strings contain no braces. */
function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`missing function ${name}`);
  let depth = 0;
  let seen = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      seen = true;
    } else if (ch === '}') {
      depth -= 1;
      if (seen && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

type ResponseHandler = (resp: unknown, onSuccess: (payload: unknown) => void) => void;
type ShowEnvelope = (resp: unknown) => void;

it.each(['R4', 'R5'] as const)('%s rejects invalid envelopes before application success', (id) => {
  const handlerSource = extractFunction(requirePage(id), 'handleResponse');
  const alertSpy = vi.fn<(message: string) => void>();
  const handleResponse = runInNewContext(`(${handlerSource})`, {
    alert: alertSpy,
    errorText: () => 'Application response failed.',
  }) as unknown as ResponseHandler;
  const success = vi.fn<(payload: unknown) => void>();
  const invalidResponses: unknown[] = [
    null,
    {},
    { data: '{"status":"success"}' },
    { success: 'true', data: '{"status":"success"}' },
    { success: true, data: '{' },
    { success: true, data: 'null' },
    { success: true, data: '[]' },
    { success: true, data: '{}' },
    { success: true, data: '{"status":"error","message":"denied"}' },
  ];

  for (const response of invalidResponses) {
    expect(() => {
      handleResponse(response, success);
    }).not.toThrow();
    expect(success).not.toHaveBeenCalled();
  }
  expect(alertSpy).toHaveBeenCalledWith('The response could not be read.');
  expect(alertSpy).toHaveBeenCalledWith('Application response failed.');

  alertSpy.mockClear();
  handleResponse({ success: false, error: 'denied', data: '{"status":"success"}' }, success);
  expect(alertSpy).toHaveBeenCalledWith('denied');
  expect(success).not.toHaveBeenCalled();

  handleResponse({ success: true, data: '{"status":"success","data":[]}' }, success);
  expect(success).toHaveBeenCalledTimes(1);
});

it('R6 rejects invalid envelopes and only displays a valid application success as success', () => {
  const handlerSource = extractFunction(requirePage('R6'), 'showEnvelope');
  const showResult = vi.fn<(text: string, isError: boolean) => void>();
  const showEnvelope = runInNewContext(`(${handlerSource})`, {
    showResult,
    errorText: () => 'Application response failed.',
  }) as unknown as ShowEnvelope;
  const invalidResponses: readonly [unknown, string][] = [
    [null, 'The response could not be read.'],
    [{}, 'The response could not be read.'],
    [{ data: '{"status":"success"}' }, 'The response could not be read.'],
    [{ success: 'true', data: '{"status":"success"}' }, 'The response could not be read.'],
    [{ success: true, data: '{' }, 'The response could not be read.'],
    [{ success: true, data: 'null' }, 'The response could not be read.'],
    [{ success: true, data: '[]' }, 'The response could not be read.'],
    [{ success: true, data: '{}' }, 'Application response failed.'],
    [
      { success: true, data: '{"status":"error","message":"denied"}' },
      'Application response failed.',
    ],
  ];

  for (const [response, message] of invalidResponses) {
    expect(() => {
      showEnvelope(response);
    }).not.toThrow();
    expect(showResult).toHaveBeenLastCalledWith(message, true);
  }
  showEnvelope({ success: false, error: 'denied', data: '{"status":"success"}' });
  expect(showResult).toHaveBeenLastCalledWith('denied', true);
  showEnvelope({ success: true, data: '{"status":"success","message":"Hello"}' });
  expect(showResult).toHaveBeenLastCalledWith('Hello', false);
});

/** The ENDPOINT literal is parsed as a script, never evaluated. */
function readEndpoint(page: string): string {
  const line = page.split('\n').find((item) => item.includes('const ENDPOINT = '));
  if (line === undefined) throw new Error('ENDPOINT missing');
  const literal = /const ENDPOINT = (".*");/.exec(line)?.[1];
  if (literal === undefined) throw new Error('ENDPOINT literal missing');
  parse(`const ENDPOINT = ${literal};`, { ecmaVersion: 2023, sourceType: 'script' });
  const value: unknown = JSON.parse(literal);
  if (typeof value !== 'string') throw new Error('ENDPOINT is not a string');
  return value;
}

describe('generateDemoPage', () => {
  it('returns null for R1, R2, R3, R7, R8, R9, R10', () => {
    for (const id of NO_PAGE) expect(generateDemoPage(id, SLUG)).toBeNull();
  });

  it('same input gives the same output, LF only', () => {
    const first = requirePage('R6');
    const second = requirePage('R6');
    expect(first).toBe(second);
    expect(first.includes('\r')).toBe(false);
    expect(first.endsWith('\n')).toBe(true);
    expect(first.endsWith('\n\n')).toBe(false);
    expect(first.charCodeAt(0)).not.toBe(0xfeff);
    expect(readEndpoint(requirePage('R6', ''))).toBe('/_api/serverlogics/');
  });

  it('hostile slugs do not break out', () => {
    const goldenScripts = countOf(readGolden(import.meta.url, 'R6.page.html.txt'), '<script');
    const goldenCloses = countOf(readGolden(import.meta.url, 'R6.page.html.txt'), '</script>');
    for (const slug of HOSTILE_SLUGS) {
      for (const id of ['R4', 'R5', 'R6'] as const) {
        const page = requirePage(id, slug);
        expect(countOf(page, '<script')).toBe(goldenScripts);
        expect(countOf(page, '</script>')).toBe(goldenCloses);
        expect(page.includes('</script><script>')).toBe(false);
        expect(page.includes('<img')).toBe(false);
        expect(readEndpoint(page)).toBe(`/_api/serverlogics/${encodeURIComponent(slug)}`);
      }
    }
  });
});

describe('R6 demo page', () => {
  it('R6 page equals the golden for slug customer-summary', () => {
    const page = requirePage('R6');
    expect(page).toBe(readGolden(import.meta.url, 'R6.page.html.txt'));
  });

  it('endpoint appears as /_api/serverlogics/customer-summary', () => {
    const page = requirePage('R6');
    expect(readEndpoint(page)).toBe('/_api/serverlogics/customer-summary');
    expect(page).toContain('"/_api/serverlogics/customer-summary"');
    expect(countOf(page, 'const ENDPOINT = ')).toBe(1);
    expect(countOf(page, '<script')).toBe(1);
    expect(page).toContain('<script id="demo-page-script">');
    expect(page.includes('<html')).toBe(false);
    expect(page.includes('<!doctype')).toBe(false);
  });

  it('sends the __RequestVerificationToken from shell.getTokenDeferred', () => {
    const page = requirePage('R6');
    expect(page).toContain('shell.getTokenDeferred()');
    expect(page).toContain('"__RequestVerificationToken"');
    expect(page).toContain('fetch(');
    expect(page).toContain('Test Server Logic');
  });

  it('handles the envelope and never re-parses Body', () => {
    const page = requirePage('R6');
    const shown = extractFunction(page, 'showEnvelope');
    expect(shown).toContain('resp.success === false');
    expect(shown).toContain('resp.error');
    expect(shown).toMatch(/try \{[\s\S]*JSON\.parse\(resp\.data\)[\s\S]*\} catch \(e\)/);
    expect(shown).toContain('payload.status === "success"');
    expect(shown).toContain('payload.message');
    expect(shown).toContain('The response could not be read.');
    expect(page.includes('.Body')).toBe(false);
    expect(countOf(page, 'JSON.parse')).toBe(1);
  });
});

describe('R4 demo page', () => {
  it('R4 page equals the golden', () => {
    expect(requirePage('R4')).toBe(readGolden(import.meta.url, 'R4.page.html.txt'));
  });

  it('every record value is escaped before insertion', () => {
    const page = requirePage('R4');
    const render = extractFunction(page, 'render');
    expect(render).toContain('escapeHtml(col.label)');
    expect(render).toContain('escapeHtml(col.name)');
    expect(render).toContain('escapeHtml(raw)');
    expect(render).toContain('escapeHtml(row.id)');
    expect(render).toContain('escapeHtml(row.fullname)');
    const edit = extractFunction(page, 'beginEdit');
    expect(edit).toContain('escapeHtml(oldVal)');
    expect(edit).toContain('escapeHtml(attr)');
  });

  it('parses data in try/catch and never double-parses Body', () => {
    const page = requirePage('R4');
    const handler = extractFunction(page, 'handleResponse');
    expect(handler).toMatch(/try \{[\s\S]*JSON\.parse\(resp\.data\)[\s\S]*\} catch \(e\)/);
    expect(page.includes('.Body')).toBe(false);
    expect(countOf(page, 'JSON.parse')).toBe(1);
  });

  it('the table is refreshed only inside the status === success branch', () => {
    const page = requirePage('R4');
    const handler = extractFunction(page, 'handleResponse');
    const statusAt = handler.indexOf('payload.status === "success"');
    expect(statusAt).toBeGreaterThan(-1);
    expect(handler.slice(0, statusAt).includes('onSuccess(')).toBe(false);
    expect(handler.slice(statusAt)).toContain('onSuccess(payload)');
    expect(handler.includes('render(')).toBe(false);
    for (const name of ['applyRows', 'applyCreate', 'applyUpdate', 'applyDelete'] as const) {
      const body = extractFunction(page, name);
      const at = body.indexOf('payload.status === "success"');
      expect(at).toBeGreaterThan(-1);
      expect(body.slice(0, at).includes('render(')).toBe(false);
      expect(body.slice(at).includes('render(') || body.slice(at).includes('addRecord(')).toBe(
        true,
      );
    }
  });

  it('every call targets entitySetName=contacts', () => {
    expect(countOf(requirePage('R4'), 'entitySetName=contacts')).toBe(4);
  });

  it("the list call selects Learn's displayed columns", () => {
    const page = requirePage('R4');
    expect(page).toContain(
      '$select=contactid,fullname,firstname,lastname,emailaddress1,telephone1',
    );
    expect(page.includes('additionalParameters=$select=fullname,emailaddress1&')).toBe(false);
    expect(page.includes('additionalParameters=$select=fullname,emailaddress1"')).toBe(false);
  });

  it("create reads the new id from the payload's id, not from xhr.getResponseHeader('entityid')", () => {
    const page = requirePage('R4');
    const created = extractFunction(page, 'applyCreate');
    expect(created).toContain('payload.id');
    expect(page.includes('getResponseHeader')).toBe(false);
    expect(page.includes('entityid')).toBe(false);
    expect(page.includes('entityId')).toBe(false);
  });

  it('no code.jquery.com script', () => {
    const page = requirePage('R4');
    expect(page.includes('code.jquery.com')).toBe(false);
    expect(page.includes('jquery-3.6.0')).toBe(false);
  });
});

describe('R5 demo page', () => {
  it('R5 page equals the golden', () => {
    expect(requirePage('R5')).toBe(readGolden(import.meta.url, 'R5.page.html.txt'));
  });

  it('session parse is bounded, validated and falls back to empty', () => {
    const page = requirePage('R5');
    const session = extractFunction(page, 'sessionFromContext');
    expect(session).toContain('{0,62}');
    expect(session).toContain('{0,64}');
    expect(session).toContain('^[A-Za-z0-9()]{0,64}$');
    expect(session).toContain('return ""');
    expect(page).toContain('["@odata.context"]');
    expect(page).toContain('sessionFromContext(');
    expect(page).toContain('serviceSession');
    expect(page).toContain('username=');
    expect(page).toContain('UserName');
    expect(page).toContain('sectionBlockLayout');
    expect(page).toContain('columnBlockLayout');
    expect(page).toContain('class="container"');
  });

  it('both JSON.parse sites are guarded by try/catch', () => {
    const page = requirePage('R5');
    expect(countOf(page, 'JSON.parse')).toBe(2);
    expect(page.includes('.Body')).toBe(false);
    const handler = extractFunction(page, 'handleResponse');
    expect(handler).toMatch(/try \{[\s\S]*JSON\.parse\(resp\.data\)[\s\S]*\} catch \(e\)/);
    const load = extractFunction(page, 'applyPeople');
    expect(load).toMatch(/try \{[\s\S]*JSON\.parse\(body\)[\s\S]*\} catch \(e\)/);
  });

  it('values are escaped', () => {
    const page = requirePage('R5');
    const render = extractFunction(page, 'render');
    expect(render).toContain('escapeHtml(raw)');
    expect(render).toContain('escapeHtml(username)');
    expect(render).toContain('escapeHtml(col.name)');
    const edit = extractFunction(page, 'beginEdit');
    expect(edit).toContain('escapeHtml(oldVal)');
    expect(edit).toContain('escapeHtml(attr)');
  });

  it('the table changes only on application success', () => {
    const page = requirePage('R5');
    const handler = extractFunction(page, 'handleResponse');
    const statusAt = handler.indexOf('payload.status === "success"');
    expect(statusAt).toBeGreaterThan(-1);
    expect(handler.slice(0, statusAt).includes('onSuccess(')).toBe(false);
    expect(handler.slice(statusAt)).toContain('onSuccess(payload)');
    for (const name of ['applyPeople', 'applyCreate', 'applyUpdate', 'applyDelete'] as const) {
      const body = extractFunction(page, name);
      const at = body.indexOf('payload.status === "success"');
      expect(at).toBeGreaterThan(-1);
      expect(body.slice(0, at).includes('render(')).toBe(false);
      expect(body.slice(at)).toContain('render(');
    }
  });

  it('put/del read only status', () => {
    const page = requirePage('R5');
    for (const name of ['applyUpdate', 'applyDelete'] as const) {
      const body = extractFunction(page, name);
      expect(body).toContain('payload.status');
      expect(body.includes('payload.data')).toBe(false);
      expect(body.includes('Body')).toBe(false);
      expect(body.includes('JSON.parse')).toBe(false);
    }
  });

  it('no code.jquery.com script', () => {
    const page = requirePage('R5');
    expect(page.includes('code.jquery.com')).toBe(false);
    expect(page.includes('jquery-3.6.0')).toBe(false);
  });
});
