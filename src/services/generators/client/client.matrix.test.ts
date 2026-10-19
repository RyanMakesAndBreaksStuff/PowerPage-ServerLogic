import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { RECIPES } from '@/services/catalogue/recipes';
import { HTTP_METHODS, METHOD_FUNCTION } from '@/types/http';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import { generateClient } from './client';
import { checkLiquidSyntax } from './liquidCheck';

type Config = {
  slug: string;
  recipe: RecipeId;
  fn: string;
  method: HttpMethod | null;
  language: ClientLanguage;
};

function methodFor(fn: string): HttpMethod | null {
  for (const method of HTTP_METHODS) {
    if (METHOD_FUNCTION[method] === fn) return method;
  }
  return null;
}

/** Fetch and jQuery for HTTP functions; Liquid only where the recipe allows it; R8 is Liquid only. */
function enabledConfigs(): Config[] {
  const configs: Config[] = [];
  for (const recipe of RECIPES) {
    for (const fn of recipe.functions) {
      const method = methodFor(fn);
      if (method !== null) {
        configs.push({ slug: 'sample', recipe: recipe.id, fn, method, language: 'fetch' });
        configs.push({ slug: 'sample', recipe: recipe.id, fn, method, language: 'jquery' });
      }
      if (recipe.liquid) {
        configs.push({ slug: 'sample', recipe: recipe.id, fn, method, language: 'liquid' });
      }
    }
  }
  return configs;
}

function stripVarying(source: string): string {
  const lines = source.split('\n');
  const kept: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.startsWith('//')) {
      index += 1;
      continue;
    }
    if (line.startsWith('const params')) {
      while (index < lines.length && !(lines[index] ?? '').startsWith('const url')) index += 1;
      index += 1;
      continue;
    }
    if (line.startsWith('const url')) {
      index += 1;
      continue;
    }
    if (/^\s*(method|type):/.test(line)) {
      index += 1;
      continue;
    }
    if (/^\s*(body|data): JSON\.stringify\(/.test(line)) {
      index += 1;
      while (index < lines.length && !/^\s*\),?$/.test(lines[index] ?? '')) index += 1;
      index += 1;
      continue;
    }
    if (line.includes('console.log(')) {
      index += 1;
      continue;
    }
    kept.push(line);
    index += 1;
  }
  return kept.join('\n');
}

function envelopeBlock(source: string): string {
  const start = source.indexOf('function handleEnvelope(envelope) {');
  const end = source.indexOf('\n}\n\nshell.', start);
  if (start < 0 || end < 0) throw new Error('missing shared envelope');
  return source
    .slice(start, end + 2)
    .split('\n')
    .filter((line) => !line.includes('console.log('))
    .join('\n');
}

describe('enabled configurations', () => {
  it('the enumeration yields 36 configurations (AC-4.12 count)', () => {
    const configs = enabledConfigs();
    expect(configs).toHaveLength(36);
    expect(configs.filter((config) => config.language === 'fetch')).toHaveLength(17);
    expect(configs.filter((config) => config.language === 'jquery')).toHaveLength(17);
    expect(configs.filter((config) => config.language === 'liquid')).toHaveLength(2);
    expect(configs.some((config) => config.recipe === 'R8' && config.language !== 'liquid')).toBe(
      false,
    );
  });

  it('every fetch and jQuery output parses with acorn at ecmaVersion 2023, DELETE included', () => {
    for (const config of enabledConfigs()) {
      if (config.language === 'liquid') continue;
      const text = generateClient(config);
      expect(() => {
        parse(text, { ecmaVersion: 2023, sourceType: 'script' });
      }, `${config.language} ${config.recipe} ${config.fn}`).not.toThrow();
    }
  });

  it('every Liquid output passes the tag checker', () => {
    for (const config of enabledConfigs()) {
      if (config.language !== 'liquid') continue;
      expect(() => {
        checkLiquidSyntax(generateClient(config));
      }, `${config.recipe} ${config.fn}`).not.toThrow();
    }
  });

  it('removing URL, verb, body and payload lines leaves one envelope per language', () => {
    const http = enabledConfigs().filter((config) => config.language !== 'liquid');
    const blocks = http.map((config) => envelopeBlock(generateClient(config)));
    expect(new Set(blocks).size).toBe(1);
    const shared = blocks[0];
    if (shared === undefined) throw new Error('no http output');
    expect(shared).toContain('envelope.success === false');
    expect(shared).toContain('JSON.parse(envelope.data)');
    expect(shared).toContain('parsed.status !== "success"');

    for (const language of ['fetch', 'jquery'] as const) {
      const remainders = http
        .filter((config) => config.language === language)
        .map((config) => stripVarying(generateClient(config)));
      expect(new Set(remainders).size, language).toBe(1);
    }
  });

  it('no output contains $pages.ajax', () => {
    for (const config of enabledConfigs()) {
      expect(generateClient(config)).not.toContain('$pages.ajax');
    }
  });

  it('no output contains CRLF', () => {
    for (const config of enabledConfigs()) {
      expect(generateClient(config)).not.toContain('\r');
    }
  });
});
