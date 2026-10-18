import { describe, expect, it } from 'vitest';
import { exportedFunctionNames } from './structure';

describe('exportedFunctionNames', () => {
  it.each<readonly [string, string, readonly string[]]>([
    ['one handler', 'function get() { return "{}"; }', ['get']],
    ['async declarations', 'async function post() {}\nfunction put() {}', ['post', 'put']],
    [
      'all five handler names, in source order',
      'function get(){}\nfunction post(){}\nfunction put(){}\nfunction patch(){}\nfunction del(){}',
      ['get', 'post', 'put', 'patch', 'del'],
    ],
    [
      "helpers are listed too; which names are HTTP-mapped is the rules engine's decision",
      'async function getAccessToken() {}\nasync function post() {}\nfunction get() {}',
      ['getAccessToken', 'post', 'get'],
    ],
    ['R8 operation name', 'function getSummary() { return "{}"; }', ['getSummary']],
    ['a duplicate declaration is listed once', 'function get() {}\nfunction get() {}', ['get']],
    ['a directive before the functions', '"use strict";\nfunction get() {}', ['get']],
    ['functions after other statements', 'const base = 1;\nfunction get() {}', ['get']],
    [
      'ES2023 syntax parses',
      'async function get() { const a = [1].at(-1); return a?.b ?? 1; }',
      ['get'],
    ],
    ['no functions at all', 'const a = 1;', []],
  ])('%s', (_name, code, expected) => {
    expect(exportedFunctionNames(code)).toEqual(expected);
  });

  it('ignores comments and strings', () => {
    const code = [
      '// function get() {}',
      '/* async function post() {} */',
      'const s = "function put() {}";',
      'function patch() {}',
    ].join('\n');
    expect(exportedFunctionNames(code)).toEqual(['patch']);
  });

  it('lists only top-level declarations', () => {
    const code = [
      'function get() { function inner() {} const f = function named() {}; }',
      'const post = function () {};',
      'const put = () => {};',
      'if (flag) { function conditional() {} }',
      'function* generator() {}',
    ].join('\n');
    expect(exportedFunctionNames(code)).toEqual(['get']);
  });

  it('is null when the code does not parse', () => {
    expect(exportedFunctionNames('function get( {')).toBeNull();
    expect(exportedFunctionNames('function get() { const a = ; }')).toBeNull();
    expect(exportedFunctionNames('export function get() {}')).toBeNull();
    expect(exportedFunctionNames('const s = "unterminated')).toBeNull();
  });

  it('is null when the code has no statements: empty, whitespace or comments only', () => {
    expect(exportedFunctionNames('')).toBeNull();
    expect(exportedFunctionNames('  \n\t ')).toBeNull();
    expect(exportedFunctionNames('// nothing yet')).toBeNull();
    expect(exportedFunctionNames('/* nothing yet */')).toBeNull();
  });
});
