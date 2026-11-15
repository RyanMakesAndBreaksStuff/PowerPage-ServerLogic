import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { STARTER_DEPS } from '@/session/starterDeps';
import { EXAMPLE_GUID, RECIPES, getRecipe } from '@/services/catalogue/recipes';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import { CLIENT_PAYLOAD_KEYS, generateClient, requestPathSteps } from './client';

const call = (
  recipe: RecipeId,
  fn: string,
  method: HttpMethod | null,
  language: ClientLanguage,
  slug = 'sample',
): string => generateClient({ slug, recipe, fn, method, language });

describe('isLiquidAllowed', () => {
  const allowed = (id: RecipeId, serverText: string): boolean =>
    STARTER_DEPS.isLiquidAllowed(getRecipe(id), serverText);

  it('R1 with text reading no Context members is allowed', () => {
    const text = 'function get() { return JSON.stringify({ status: "success", contacts: [] }); }';
    expect(allowed('R1', text)).toBe(true);
  });

  it('R8 with text reading Server.Context.Input and ActivityId is allowed', () => {
    const text = [
      'function getSummary() {',
      '  const input = Server.Context.Input;',
      '  const activity = Server.Context.ActivityId;',
      '  return input + activity;',
      '}',
    ].join('\n');
    expect(allowed('R8', text)).toBe(true);
  });

  it('any recipe with liquid: false is refused even for clean text', () => {
    const clean = 'function get() { return JSON.stringify({ status: "success", data: {} }); }';
    expect(getRecipe('R3').liquid).toBe(false);
    expect(getRecipe('R4').liquid).toBe(false);
    expect(allowed('R3', clean)).toBe(false);
    expect(allowed('R4', clean)).toBe(false);
  });

  it('an allowed recipe is refused when the text reads Body, Headers, HttpMethod, QueryParameters or Url', () => {
    const clean = 'function get() { return JSON.stringify({ status: "success", contacts: [] }); }';
    expect(allowed('R1', clean)).toBe(true);
    for (const member of ['Body', 'Headers', 'HttpMethod', 'QueryParameters', 'Url']) {
      const edited = `function get() { return Server.Context.${member}; }`;
      expect(allowed('R1', edited), member).toBe(false);
      expect(allowed('R8', edited), member).toBe(false);
    }
  });

  it('an async function does not refuse it', () => {
    const text =
      'async function get() { return JSON.stringify({ status: "success", contacts: [] }); }';
    expect(allowed('R1', text)).toBe(true);
  });

  it('a comment or string mentioning Server.Context.Body does not refuse it', () => {
    const text = [
      'function get() {',
      '  // Server.Context.Body',
      '  const label = "Server.Context.Body";',
      '  return label;',
      '}',
    ].join('\n');
    expect(allowed('R1', text)).toBe(true);
  });

  it('STARTER_DEPS.isLiquidAllowed refuses a Body-reading R1 text', () => {
    const text = 'function get() { const body = Server.Context.Body; return body; }';
    expect(STARTER_DEPS.isLiquidAllowed(getRecipe('R1'), text)).toBe(false);
  });
});

describe('requestPathSteps', () => {
  it('fetch gives the five AC-4.8 steps in order with the slug and function get()', () => {
    expect(requestPathSteps('fetch', 'read-contacts', 'get')).toEqual([
      { label: 'Page script', value: 'fetch()' },
      { label: 'Token', value: '__RequestVerificationToken' },
      { label: 'Endpoint', value: '/_api/serverlogics/read-contacts' },
      { label: 'Handler', value: 'function get()' },
      { label: 'Returns', value: 'JSON string' },
    ]);
  });

  it('jquery differs only in the Page script value', () => {
    const fetchSteps = requestPathSteps('fetch', 'read-contacts', 'get');
    const jquerySteps = requestPathSteps('jquery', 'read-contacts', 'get');
    expect(jquerySteps.map((step) => step.label)).toEqual(fetchSteps.map((step) => step.label));
    expect(jquerySteps[0]).toEqual({ label: 'Page script', value: 'shell.ajaxSafePost()' });
    expect(jquerySteps.slice(1)).toEqual(fetchSteps.slice(1));
  });

  it('liquid gives four steps and no step labelled Token', () => {
    const steps = requestPathSteps('liquid', 'invoke-summary', 'getSummary');
    expect(steps).toEqual([
      { label: 'Page render', value: 'Liquid page' },
      { label: 'Tag', value: 'serverlogic' },
      { label: 'Handler', value: 'function getSummary()' },
      { label: 'Returns', value: 'result object' },
    ]);
    expect(steps.some((step) => step.label === 'Token')).toBe(false);
  });

  it('del and getSummary appear as function del() and function getSummary()', () => {
    const del = requestPathSteps('fetch', 'dataverse-crud', 'del').find(
      (step) => step.label === 'Handler',
    );
    const summary = requestPathSteps('liquid', 'invoke-summary', 'getSummary').find(
      (step) => step.label === 'Handler',
    );
    expect(del).toEqual({ label: 'Handler', value: 'function del()' });
    expect(summary).toEqual({ label: 'Handler', value: 'function getSummary()' });
  });

  it('an untitled slug is shown as given', () => {
    const endpoint = requestPathSteps('fetch', 'untitled', 'get').find(
      (step) => step.label === 'Endpoint',
    );
    expect(endpoint).toEqual({ label: 'Endpoint', value: '/_api/serverlogics/untitled' });
    const again = requestPathSteps('fetch', 'untitled', 'get');
    expect(again).toEqual(requestPathSteps('fetch', 'untitled', 'get'));
    expect(again).not.toBe(requestPathSteps('fetch', 'untitled', 'get'));
  });
});

describe('generateClient guards and body rule', () => {
  it('GET and DELETE contain no body: and no JSON.stringify( (AC-2.7)', () => {
    const samples = [
      ['R1', 'get', 'GET'],
      ['R3', 'get', 'GET'],
      ['R4', 'get', 'GET'],
      ['R4', 'del', 'DELETE'],
      ['R5', 'del', 'DELETE'],
      ['R6', 'get', 'GET'],
      ['R10', 'get', 'GET'],
    ] as const;
    for (const [recipe, fn, method] of samples) {
      const text = call(recipe, fn, method, 'fetch');
      expect(text, `${recipe} ${fn}`).not.toContain('body:');
      expect(text, `${recipe} ${fn}`).not.toContain('JSON.stringify(');
    }
  });

  it('POST, PUT and PATCH contain JSON.stringify( (AC-2.7)', () => {
    const samples = [
      ['R2', 'post', 'POST'],
      ['R4', 'post', 'POST'],
      ['R4', 'put', 'PUT'],
      ['R5', 'post', 'POST'],
      ['R5', 'put', 'PUT'],
      ['R7', 'post', 'POST'],
      ['R9', 'post', 'POST'],
      ['R10', 'post', 'POST'],
      ['R10', 'patch', 'PATCH'],
    ] as const;
    for (const [recipe, fn, method] of samples) {
      const text = call(recipe, fn, method, 'fetch');
      expect(text, `${recipe} ${fn}`).toContain('body:');
      expect(text, `${recipe} ${fn}`).toContain('JSON.stringify(');
    }
  });

  it('every verb sends the __RequestVerificationToken header, GET included', () => {
    const samples = [
      ['R1', 'get', 'GET'],
      ['R2', 'post', 'POST'],
      ['R4', 'put', 'PUT'],
      ['R10', 'patch', 'PATCH'],
      ['R5', 'del', 'DELETE'],
    ] as const;
    for (const [recipe, fn, method] of samples) {
      expect(call(recipe, fn, method, 'fetch'), method).toContain('__RequestVerificationToken');
    }
  });

  it('method null with fetch throws', () => {
    expect(() => call('R8', 'getSummary', null, 'fetch')).toThrow(Error);
    expect(() => call('R8', 'getSummary', null, 'fetch')).toThrow(/not callable over HTTP/);
    expect(() => call('R8', 'getSummary', null, 'jquery')).toThrow(/not callable over HTTP/);
  });

  it('method and fn mismatch throws', () => {
    expect(() => call('R4', 'get', 'POST', 'fetch')).toThrow(Error);
    expect(() => call('R4', 'del', 'GET', 'jquery')).toThrow(Error);
  });

  it('unknown fn throws', () => {
    expect(() => call('R1', 'post', 'POST', 'fetch')).toThrow(Error);
    expect(() => call('R1', 'missing', null, 'liquid')).toThrow(Error);
  });

  it('R7 post emits the column-aware example body', () => {
    expect(getRecipe('R7').examples.post?.body).toEqual({
      fullname: 'Alton Stott',
      email: 'alton@contoso.com',
      phone: '555-123-4567',
      event: 197360000,
      eventText: 'Tech Summit - General Admission',
      date: '2026-11-05',
    });
    const text = call('R7', 'post', 'POST', 'fetch', 'graph-sharepoint');
    expect(text).toContain('JSON.stringify(');
    expect(text).toContain('"fullname": "Alton Stott"');
    expect(text).toContain('"event": 197360000');
    expect(text).toContain('"date": "2026-11-05"');
  });

  it('the $select text survives unchanged in the output', () => {
    const text = call('R4', 'get', 'GET', 'fetch', 'dataverse-crud');
    expect(text).toContain('"$select=fullname,emailaddress1"');
    expect(text).toContain('new URLSearchParams(');
    const deleted = call('R5', 'del', 'DELETE', 'fetch', 'external-service');
    expect(deleted).toContain('"(S(abc123))"');
    const updated = call('R4', 'put', 'PUT', 'fetch', 'dataverse-crud');
    expect(updated).toContain(EXAMPLE_GUID);
  });

  it('output is LF only and ends with one newline', () => {
    for (const text of [
      call('R1', 'get', 'GET', 'fetch', 'read-contacts'),
      call('R4', 'put', 'PUT', 'jquery', 'dataverse-crud'),
      call('R8', 'getSummary', null, 'liquid', 'invoke-summary'),
    ]) {
      expect(text.includes('\r')).toBe(false);
      expect(text.endsWith('\n')).toBe(true);
      expect(text.endsWith('\n\n')).toBe(false);
    }
  });

  it('same input twice gives the same string', () => {
    const input = {
      slug: 'read-contacts',
      recipe: 'R1',
      fn: 'get',
      method: 'GET',
      language: 'fetch',
    } as const;
    expect(generateClient(input)).toBe(generateClient(input));
  });

  it('CLIENT_PAYLOAD_KEYS has an entry for every recipe function and matches the FR-3 contract table', () => {
    const contract: Readonly<Record<string, readonly string[]>> = {
      'R1.get': ['contacts'],
      'R2.post': ['name', 'email'],
      'R3.get': ['data'],
      'R4.get': ['data'],
      'R4.post': ['id'],
      'R4.put': [],
      'R4.del': [],
      'R5.get': ['data'],
      'R5.post': ['data'],
      'R5.put': [],
      'R5.del': [],
      'R6.get': ['message'],
      'R7.post': ['id'],
      'R8.getSummary': [
        'category',
        'maximumResults',
        'activityId',
        'functionName',
        'serverLogicName',
      ],
      'R9.post': ['flowResponse'],
      'R10.get': ['data'],
      'R10.post': ['data'],
      'R10.patch': ['data'],
    };
    expect(CLIENT_PAYLOAD_KEYS).toEqual(contract);
    const names = RECIPES.flatMap((recipe) => recipe.functions.map((fn) => `${recipe.id}.${fn}`));
    expect(Object.keys(CLIENT_PAYLOAD_KEYS).sort()).toEqual([...names].sort());
  });
});

describe('jquery', () => {
  it('jquery uses shell.ajaxSafePost and never shell.safeAjax or $.ajax (correction 9)', () => {
    for (const text of [
      call('R1', 'get', 'GET', 'jquery'),
      call('R2', 'post', 'POST', 'jquery'),
      call('R4', 'del', 'DELETE', 'jquery'),
      call('R10', 'patch', 'PATCH', 'jquery'),
    ]) {
      expect(text).toContain('shell.ajaxSafePost');
      expect(text).not.toContain('shell.safeAjax');
      expect(text).not.toContain('$.ajax');
    }
  });

  it('jquery has exactly one .fail( and no error: option (AC-4.6)', () => {
    for (const text of [
      call('R1', 'get', 'GET', 'jquery'),
      call('R4', 'del', 'DELETE', 'jquery'),
      call('R10', 'patch', 'PATCH', 'jquery'),
    ]) {
      expect(text.match(/\.fail\(/g)).toEqual(['.fail(']);
      expect(text).not.toMatch(/^\s*error\s*:/m);
    }
  });

  it('jquery DELETE output parses with acorn and has contentType followed by a comma (correction 15)', () => {
    const text = call('R4', 'del', 'DELETE', 'jquery', 'dataverse-crud');
    expect(() => {
      parse(text, { ecmaVersion: 2023, sourceType: 'script' });
    }).not.toThrow();
    expect(text).toMatch(/contentType:\s*"application\/json",/);
  });

  it('jquery GET and DELETE have no data: key, POST, PUT, PATCH have one (AC-2.7)', () => {
    expect(call('R1', 'get', 'GET', 'jquery')).not.toMatch(/\bdata\s*:/);
    expect(call('R5', 'del', 'DELETE', 'jquery')).not.toMatch(/\bdata\s*:/);
    expect(call('R2', 'post', 'POST', 'jquery')).toMatch(/\bdata\s*:/);
    expect(call('R4', 'put', 'PUT', 'jquery')).toMatch(/\bdata\s*:/);
    expect(call('R10', 'patch', 'PATCH', 'jquery')).toMatch(/\bdata\s*:/);
  });
});
