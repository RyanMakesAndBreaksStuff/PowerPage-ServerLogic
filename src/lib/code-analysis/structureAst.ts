import { parse, tokenizer, tokTypes } from 'acorn';
import type { Comment, Options, Token } from 'acorn';

// Private to the code-structure analysis (structure.ts, structureInsert.ts). Nothing here is a cross-phase name.
// Every rule that reads code structure uses this one parser and tokenizer at ECMAScript 2023 (FR-4 code analysis).
// Code is only parsed or tokenized, never evaluated.

const ACORN_OPTIONS = { ecmaVersion: 2023, sourceType: 'script' } as const satisfies Options;

/** An acorn node seen as plain data: every property is `unknown` until a typed accessor narrows it. */
export type AstNode = {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly [key: string]: unknown;
};

export function isAstNode(value: unknown): value is AstNode {
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

export function nodeProp(node: AstNode, key: string): AstNode | null {
  const value = node[key];
  return isAstNode(value) ? value : null;
}

export function nodeList(node: AstNode, key: string): readonly AstNode[] {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isAstNode) : [];
}

export function nodeName(node: AstNode | null): string | null {
  const name = node?.name;
  return typeof name === 'string' ? name : null;
}

/**
 * Visits `node` and every descendant, parents before children, in source order. Iterative (an explicit stack), so a
 * very deep tree can't overflow the call stack.
 */
export function walk(node: AstNode, visit: (n: AstNode) => void): void {
  const stack: AstNode[] = [node];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    visit(current);
    const children: AstNode[] = [];
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isAstNode(item)) children.push(item);
      } else if (isAstNode(value)) {
        children.push(value);
      }
    }
    // Pushed in reverse, so they pop in source order.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child !== undefined) stack.push(child);
    }
  }
}

function isSyntaxError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'SyntaxError'
  );
}

export type ParsedScript = { program: AstNode; comments: readonly Comment[] };

/** Parses as an ECMAScript 2023 script. `null` when it doesn't parse. */
export function parseScript(code: string): ParsedScript | null {
  const comments: Comment[] = [];
  try {
    const program: unknown = parse(code, { ...ACORN_OPTIONS, onComment: comments });
    return isAstNode(program) ? { program, comments } : null;
  } catch (error: unknown) {
    if (isSyntaxError(error)) return null;
    throw error;
  }
}

export type Tok = {
  kind: 'name' | 'string' | 'dot' | 'bracketL' | 'bracketR' | 'other';
  value: string;
};

function toTok(token: Token): Tok {
  // acorn's Token type omits `value`, but every token carries it: the cooked name, keyword or string text.
  const value = 'value' in token && typeof token.value === 'string' ? token.value : '';
  // Keywords count as names, so `Server.default` is `Server`, `.`, name.
  if (token.type === tokTypes.name || token.type.keyword !== undefined)
    return { kind: 'name', value };
  if (token.type === tokTypes.string) return { kind: 'string', value };
  if (token.type === tokTypes.dot) return { kind: 'dot', value: '' };
  if (token.type === tokTypes.bracketL) return { kind: 'bracketL', value: '' };
  if (token.type === tokTypes.bracketR) return { kind: 'bracketR', value: '' };
  return { kind: 'other', value: '' };
}

/**
 * Tokens with comments excluded. When tokenizing fails (for example an unterminated string), `failed` is true and
 * `tokens` holds everything read before the failure.
 */
export function scanTokens(code: string): { tokens: readonly Tok[]; failed: boolean } {
  const tokens: Tok[] = [];
  try {
    for (const token of tokenizer(code, ACORN_OPTIONS)) tokens.push(toTok(token));
    return { tokens, failed: false };
  } catch (error: unknown) {
    if (isSyntaxError(error)) return { tokens, failed: true };
    throw error;
  }
}
