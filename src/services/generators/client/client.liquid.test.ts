import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { LIQUID_SERVER_NOTE, generateClient } from './client';
import { checkLiquidSyntax } from './liquidCheck.testkit';

const KNOWN_GOOD = [
  '{% assign inputData = \'{"category":"news"}\' %}',
  "{% serverlogic name: 'slug', operation: 'getSummary', input: inputData, output: result %}",
  '{% if result.success %}',
  '{{ result.data.message | escape }}',
  '{% elsif result.success %}',
  '{{ result.data.message | escape }}',
  '{% else %}',
  '{{ result.status_code }}',
  '{% endif %}',
  '{% comment %}',
  'result.raw_result holds the unparsed output when the handler returns non-JSON.',
  '{% endcomment %}',
].join('\n');

describe('liquid syntax checker', () => {
  it('accepts a known-good tag', () => {
    expect(() => {
      checkLiquidSyntax(KNOWN_GOOD);
    }).not.toThrow();
  });

  it('rejects an unclosed {%', () => {
    expect(() => {
      checkLiquidSyntax("{% serverlogic name: 'a', operation: 'b', output: result");
    }).toThrow(/unclosed/);
  });

  it('rejects an unbalanced if', () => {
    expect(() => {
      checkLiquidSyntax('{% if result.success %}{% endif %}{% endif %}');
    }).toThrow(/unbalanced if/);
  });

  it('rejects an unknown attribute key', () => {
    expect(() => {
      checkLiquidSyntax("{% serverlogic name: 'a', operation: 'b', output: result, extra: nope %}");
    }).toThrow(/unknown attribute/);
  });

  it('rejects a missing output', () => {
    expect(() => {
      checkLiquidSyntax("{% serverlogic name: 'a', operation: 'b' %}");
    }).toThrow(/missing output/);
  });

  it('rejects an input variable with no earlier assign', () => {
    expect(() => {
      checkLiquidSyntax(
        "{% serverlogic name: 'a', operation: 'b', input: inputData, output: result %}",
      );
    }).toThrow(/no earlier assign/);
  });
});

describe('liquid client', () => {
  const r1 = (): string =>
    generateClient({
      slug: 'read-contacts',
      recipe: 'R1',
      fn: 'get',
      method: 'GET',
      language: 'liquid',
    });

  it('R1 output matches liquid-r1-get', () => {
    const text = r1();
    expect(text).toBe(readGolden(import.meta.url, 'liquid-r1-get.liquid.txt'));
    expect(() => {
      checkLiquidSyntax(text);
    }).not.toThrow();
  });

  it('R8 output matches liquid-r8-getsummary and has two tags, only the second with input', () => {
    const text = generateClient({
      slug: 'invoke-summary',
      recipe: 'R8',
      fn: 'getSummary',
      method: null,
      language: 'liquid',
    });
    expect(text).toBe(readGolden(import.meta.url, 'liquid-r8-getsummary.liquid.txt'));
    expect(() => {
      checkLiquidSyntax(text);
    }).not.toThrow();
    const tags = [...text.matchAll(/\{%\s*serverlogic\b[^%]*%\}/g)].map((match) => match[0]);
    expect(tags).toHaveLength(2);
    const first = tags[0];
    const second = tags[1];
    if (first === undefined || second === undefined)
      throw new Error('expected two serverlogic tags');
    expect(first).not.toContain('input:');
    expect(second).toContain('input: inputData');
    const assign = '{% assign inputData = \'{"category":"news","maximumResults":5}\' %}';
    expect(text).toContain(assign);
    expect(text.indexOf(assign)).toBeLessThan(text.lastIndexOf('{% serverlogic'));
    expect(text.slice(0, text.indexOf('{% serverlogic'))).not.toContain('{% assign');
  });

  it('the three branches appear in order and every result.data read is piped through escape', () => {
    for (const text of [
      r1(),
      generateClient({
        slug: 'invoke-summary',
        recipe: 'R8',
        fn: 'getSummary',
        method: null,
        language: 'liquid',
      }),
    ]) {
      const success = text.indexOf("{% if result.success and result.data.status == 'success' %}");
      const handlerError = text.indexOf('{% elsif result.success %}');
      const transport = text.indexOf('{% else %}');
      const end = text.indexOf('{% endif %}');
      expect(success).toBeGreaterThanOrEqual(0);
      expect(success).toBeLessThan(handlerError);
      expect(handlerError).toBeLessThan(transport);
      expect(transport).toBeLessThan(end);
      for (const block of text.match(/\{\{[^}]+\}\}/g) ?? []) {
        if (block.includes('result.data')) expect(block).toContain('| escape');
      }
    }
  });

  it('the raw_result note is present', () => {
    expect(r1()).toContain('result.raw_result');
    expect(
      generateClient({
        slug: 'invoke-summary',
        recipe: 'R8',
        fn: 'getSummary',
        method: null,
        language: 'liquid',
      }),
    ).toContain('result.raw_result');
  });

  it('method is ignored for Liquid', () => {
    const base = {
      slug: 'read-contacts',
      recipe: 'R1',
      fn: 'get',
      language: 'liquid',
    } as const;
    expect(generateClient({ ...base, method: 'POST' })).toBe(
      generateClient({ ...base, method: null }),
    );
    expect(generateClient({ ...base, method: 'GET' })).toBe(
      generateClient({ ...base, method: 'DELETE' }),
    );
  });

  it('an R3 Liquid request throws', () => {
    expect(() =>
      generateClient({
        slug: 'external',
        recipe: 'R3',
        fn: 'get',
        method: 'GET',
        language: 'liquid',
      }),
    ).toThrow(/Liquid is not available/);
  });

  it('LIQUID_SERVER_NOTE mentions no token, Server.Context.Input, and delayed rendering', () => {
    expect(LIQUID_SERVER_NOTE).toContain('no token');
    expect(LIQUID_SERVER_NOTE).toContain('Server.Context.Input');
    expect(LIQUID_SERVER_NOTE).toContain('delayed rendering');
    expect(LIQUID_SERVER_NOTE).toContain('Body');
    expect(LIQUID_SERVER_NOTE).toContain('QueryParameters');
  });
});
