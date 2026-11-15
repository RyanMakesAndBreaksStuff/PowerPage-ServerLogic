// @vitest-environment node
import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { generateR4 } from './r4';

type Ast = {
  type: string;
  start: number;
  end: number;
  name?: string;
  value?: unknown;
  [key: string]: unknown;
};

function isAst(value: unknown): value is Ast {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    'start' in value &&
    typeof value.start === 'number' &&
    'end' in value &&
    typeof value.end === 'number'
  );
}

function walk(node: Ast, visit: (current: Ast) => void): void {
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isAst(item)) walk(item, visit);
      }
    } else if (isAst(value)) {
      walk(value, visit);
    }
  }
}

function parseHandler(text: string): Ast {
  const program: unknown = parse(text, { ecmaVersion: 2023, sourceType: 'script' });
  if (!isAst(program)) throw new Error('acorn did not return a program node');
  return program;
}

function regexPatterns(root: Ast): string[] {
  const patterns: string[] = [];
  walk(root, (node) => {
    const regex: unknown = node.regex;
    if (typeof regex !== 'object' || regex === null || !('pattern' in regex)) return;
    const pattern: unknown = regex.pattern;
    if (typeof pattern === 'string') patterns.push(pattern);
  });
  return patterns;
}

function numberLiterals(root: Ast): number[] {
  const numbers: number[] = [];
  walk(root, (node) => {
    if (node.type === 'Literal' && typeof node.value === 'number') numbers.push(node.value);
  });
  return numbers;
}

function functionNamed(root: Ast, name: string): Ast {
  let found: Ast | undefined;
  walk(root, (node) => {
    if (node.type !== 'FunctionDeclaration') return;
    const id: unknown = node.id;
    if (isAst(id) && id.name === name) found = node;
  });
  if (found === undefined) throw new Error(`missing function ${name}`);
  return found;
}

describe('R4 option rules', () => {
  const text = generateR4().text;
  const root = parseHandler(text);

  it('emits the five-option allowlist select/filter/top/orderby/expand', () => {
    const allow = regexPatterns(root).find(
      (pattern) =>
        pattern.includes('select') &&
        pattern.includes('filter') &&
        pattern.includes('top') &&
        pattern.includes('orderby') &&
        pattern.includes('expand'),
    );
    expect(allow).toBe(String.raw`^\$(select|filter|top|orderby|expand)=`);
    expect(text).not.toMatch(/\.startsWith\s*\(/i);
    expect(text).not.toMatch(/with\s*\(/i);
    expect(text).not.toMatch(/function\s*\(/i);
  });

  it('emits the $top pattern ^[1-9][0-9]?$ and the cap of 50', () => {
    expect(regexPatterns(root)).toContain(String.raw`^[1-9][0-9]?$`);
    expect(numberLiterals(root)).toContain(50);
    expect(text).toContain('Number(value) > 50');
  });

  it('emits the 500-character limit', () => {
    expect(numberLiterals(root)).toContain(500);
    expect(text).toContain('raw.length > 500');
  });

  it('applies the $top=10 default only on the list branch of get', () => {
    const getFn = functionNamed(root, 'get');
    const defaults: Ast[] = [];
    walk(root, (node) => {
      if (
        node.type === 'Literal' &&
        typeof node.value === 'string' &&
        node.value.includes('$top=10')
      ) {
        defaults.push(node);
      }
    });
    expect(defaults.length).toBeGreaterThan(0);
    for (const literal of defaults) {
      expect(literal.start).toBeGreaterThanOrEqual(getFn.start);
      expect(literal.end).toBeLessThanOrEqual(getFn.end);
    }

    let recordBranch: Ast | undefined;
    walk(getFn, (node) => {
      if (node.type !== 'IfStatement') return;
      const consequent: unknown = node.consequent;
      if (!isAst(consequent)) return;
      if (text.slice(consequent.start, consequent.end).includes('RetrieveRecord')) {
        recordBranch = consequent;
      }
    });
    if (recordBranch === undefined) throw new Error('missing single-record branch');
    const branch = recordBranch;
    const branchText = text.slice(branch.start, branch.end);
    expect(branchText).toContain('RetrieveRecord');
    expect(branchText).not.toContain('$top=10');
    expect(branchText).not.toContain('RetrieveMultipleRecords');
    expect(text.slice(getFn.start, getFn.end)).toContain('RetrieveMultipleRecords');
    for (const literal of defaults) {
      expect(literal.start >= branch.start && literal.end <= branch.end).toBe(false);
    }
  });

  it('reports errors under field additionalParameters', () => {
    let found = false;
    walk(root, (node) => {
      if (node.type !== 'Property') return;
      const key: unknown = node.key;
      const value: unknown = node.value;
      if (!isAst(key) || !isAst(value)) return;
      const keyName = key.name ?? (typeof key.value === 'string' ? key.value : undefined);
      if (
        keyName === 'field' &&
        value.type === 'Literal' &&
        value.value === 'additionalParameters'
      ) {
        found = true;
      }
    });
    expect(found).toBe(true);
  });
});
