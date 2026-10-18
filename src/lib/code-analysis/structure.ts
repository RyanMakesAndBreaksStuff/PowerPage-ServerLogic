import type { ConnectorUse, InsertResult, TextChange } from './codeAnalysis.types';
import { nodeList, nodeName, nodeProp, parseScript, scanTokens, walk } from './structureAst';
import type { AstNode, Tok } from './structureAst';
import { applyChanges, buildInsertion } from './structureInsert';

// Code structure analysis (FR-4 "Code analysis"): one acorn tokenizer and parser, ECMAScript 2023 script, comments
// excluded from every rule, code never evaluated. Pure: no React, no host.

// ---------------------------------------------------------------------------------------------------------------------
// FR-7: connector detection
// ---------------------------------------------------------------------------------------------------------------------

/** True when the tokens at `index` continue a `Server` chain: `.` and a name, or `[`, a string and `]`. */
function continuesChain(tokens: readonly Tok[], index: number): boolean {
  const [a, b, c] = [tokens[index], tokens[index + 1], tokens[index + 2]];
  if (a?.kind === 'dot') return b?.kind === 'name';
  return a?.kind === 'bracketL' && b?.kind === 'string' && c?.kind === 'bracketR';
}

/**
 * FR-7 connector detection from tokens (comments excluded; the code only has to tokenize, not parse):
 * - `dataverse` / `httpClient`: a name or string-literal token `Dataverse` / `HttpClient` appears anywhere, so dotted,
 *   bracket, destructured and aliased uses all count.
 * - `undetermined`: a `Server` or `Connector` name token is followed by anything other than `.` and a name, or
 *   `[`, a string and `]` (`const c = Server.Connector;`, `const { Connector } = Server;`, `Server[k]`). It is a
 *   token rule, so it also fires for a property key named `Server`, and for `Server?.Connector`: both err towards
 *   "couldn't determine", which is the safe side.
 * Returns `null` when tokenizing fails (an unterminated string, template or comment).
 */
export function detectConnectorUse(code: string): ConnectorUse | null {
  const { tokens, failed } = scanTokens(code);
  if (failed) return null;
  const use: ConnectorUse = { dataverse: false, httpClient: false, undetermined: false };
  tokens.forEach((token, index) => {
    if (token.kind === 'name' || token.kind === 'string') {
      if (token.value === 'Dataverse') use.dataverse = true;
      if (token.value === 'HttpClient') use.httpClient = true;
    }
    if (
      token.kind === 'name' &&
      (token.value === 'Server' || token.value === 'Connector') &&
      !continuesChain(tokens, index + 1)
    ) {
      use.undetermined = true;
    }
  });
  return use;
}

// ---------------------------------------------------------------------------------------------------------------------
// FR-7: exported function names
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The names of the top-level `function name(` and `async function name(` declarations, in source order, without
 * duplicates. Helpers such as `getAccessToken` are included: the "exports only `get`" rule (which names are
 * HTTP-mapped) belongs to the Inspector rules engine (phase 11), not here.
 *
 * Not included: generator declarations, function expressions (`const get = function () {}`) and nested functions.
 * `null` when the code doesn't parse, or when it has no statements at all (empty, whitespace or comments only):
 * in both cases the function names are unknown.
 */
export function exportedFunctionNames(code: string): readonly string[] | null {
  const parsed = parseScript(code);
  if (parsed === null) return null;
  const statements = nodeList(parsed.program, 'body');
  if (statements.length === 0) return null;
  const names: string[] = [];
  for (const statement of statements) {
    if (statement.type !== 'FunctionDeclaration' || statement.generator === true) continue;
    const name = nodeName(nodeProp(statement, 'id'));
    if (name !== null && !names.includes(name)) names.push(name);
  }
  return names;
}

// ---------------------------------------------------------------------------------------------------------------------
// FR-6: used Server objects and members; AC-4.7 HTTP-only Context members
// ---------------------------------------------------------------------------------------------------------------------

// The nine objects of FR-6, split into path segments. Longest-prefix matching is unambiguous: none is a prefix of another.
const SERVER_OBJECTS = [
  'Server.Logger',
  'Server.Context',
  'Server.User',
  'Server.Website',
  'Server.SiteSetting',
  'Server.EnvironmentVariable',
  'Server.Connector.Dataverse',
  'Server.Connector.HttpClient',
  'Server.Connector.CloudFlow',
].map((path) => ({ path, segments: path.split('.') }));

/** Records one chain, for example `['Server', 'Logger', 'Log']`. Chains that don't start with a known object are ignored. */
function recordChain(used: Map<string, string[]>, chain: readonly string[]): void {
  const object = SERVER_OBJECTS.find(({ segments }) =>
    segments.every((segment, i) => chain[i] === segment),
  );
  if (object === undefined) return;
  const members = used.get(object.path) ?? [];
  const member = chain[object.segments.length];
  if (member !== undefined && !members.includes(member)) members.push(member);
  used.set(object.path, members);
}

/** The static key of a property: `.name`, `["name"]` or a quoted pattern key. `null` for any other computed key. */
function staticKey(property: AstNode, computed: boolean): string | null {
  if (!computed && property.type === 'Identifier') return nodeName(property);
  return property.type === 'Literal' && typeof property.value === 'string' ? property.value : null;
}

/** `Server.Connector["HttpClient"].GetAsync` as `['Server', 'Connector', 'HttpClient', 'GetAsync']`; `null` when not a static chain. */
function chainOf(node: AstNode): readonly string[] | null {
  if (node.type === 'Identifier') {
    const name = nodeName(node);
    return name === null ? null : [name];
  }
  if (node.type !== 'MemberExpression') return null;
  const object = nodeProp(node, 'object');
  const property = nodeProp(node, 'property');
  if (object === null || property === null) return null;
  const head = chainOf(object);
  const key = staticKey(property, node.computed === true);
  return head === null || key === null ? null : [...head, key];
}

/** `const { Body, Url: u } = Server.Context;` reads `Body` and `Url`. */
function recordDestructuring(used: Map<string, string[]>, declarator: AstNode): void {
  const pattern = nodeProp(declarator, 'id');
  const init = nodeProp(declarator, 'init');
  if (pattern?.type !== 'ObjectPattern' || init === null) return;
  const head = chainOf(init);
  if (head === null) return;
  for (const property of nodeList(pattern, 'properties')) {
    const key = property.type === 'Property' ? nodeProp(property, 'key') : null;
    const name = key === null ? null : staticKey(key, property.computed === true);
    if (name !== null) recordChain(used, [...head, name]);
  }
}

/** The fallback for code that doesn't parse: every `Server` token followed by `.name` and `["name"]` steps. */
function recordFromTokens(used: Map<string, string[]>, tokens: readonly Tok[]): void {
  tokens.forEach((token, index) => {
    if (token.kind !== 'name' || token.value !== 'Server' || tokens[index - 1]?.kind === 'dot')
      return;
    const chain = ['Server'];
    for (let next = index + 1; ;) {
      const [a, b, c] = [tokens[next], tokens[next + 1], tokens[next + 2]];
      if (a?.kind === 'dot' && b?.kind === 'name') {
        chain.push(b.value);
        next += 2;
      } else if (a?.kind === 'bracketL' && b?.kind === 'string' && c?.kind === 'bracketR') {
        chain.push(b.value);
        next += 3;
      } else {
        break;
      }
    }
    recordChain(used, chain);
  });
}

/**
 * The `Server.*` objects the code references, keyed by object path (`Server.Connector.Dataverse`, `Server.Logger`,
 * `Server.Context`, ...), each with the members referenced, in first-use order. An object that is referenced without
 * a member (`if (Server.User)`) has an empty list.
 *
 * Parsed code: from `MemberExpression` chains in the AST (so comments, strings and templates never count), plus
 * object-pattern destructuring of a chain. There is no alias tracking (`const c = Server.Context; c.Body` records
 * `Server.Context` only), and a chain with a computed non-literal key (`Server.Context[k]`) stops at the key.
 * Unparseable code: the same chains read from the tokens that tokenize, without destructuring. Never throws.
 */
export function usedServerMembers(code: string): ReadonlyMap<string, readonly string[]> {
  const used = new Map<string, string[]>();
  const parsed = parseScript(code);
  if (parsed === null) {
    recordFromTokens(used, scanTokens(code).tokens);
    return used;
  }
  walk(parsed.program, (node) => {
    if (node.type === 'MemberExpression') {
      const chain = chainOf(node);
      if (chain !== null) recordChain(used, chain);
    } else if (node.type === 'VariableDeclarator') {
      recordDestructuring(used, node);
    }
  });
  return used;
}

const HTTP_ONLY_CONTEXT_MEMBERS: ReadonlySet<string> = new Set([
  'Body',
  'Headers',
  'HttpMethod',
  'QueryParameters',
  'Url',
]);

/**
 * AC-4.7: true when the code references a `Server.Context` member that FR-6 marks HTTP only (`Body`, `Headers`,
 * `HttpMethod`, `QueryParameters`, `Url`). It reads `usedServerMembers`, so the same rules apply: comments and strings
 * don't count, and unparseable code is read from its tokens. Referencing `Server.Context` as a whole doesn't count.
 */
export function readsHttpOnlyContext(code: string): boolean {
  const members = usedServerMembers(code).get('Server.Context') ?? [];
  return members.some((member) => HTTP_ONLY_CONTEXT_MEMBERS.has(member));
}

// ---------------------------------------------------------------------------------------------------------------------
// AC-6.8: insertion
// ---------------------------------------------------------------------------------------------------------------------

type Spot = { fn: AstNode; block: AstNode; at: number };
type Miss = 'no-target' | 'not-statement';

/** The top-level function declarations, in source order. */
function topLevelFunctions(program: AstNode): readonly AstNode[] {
  return nodeList(program, 'body').filter((statement) => statement.type === 'FunctionDeclaration');
}

/** No cursor: before the target function's last top-level `return`, else at the end of its body. */
function spotForTarget(functions: readonly AstNode[], targetFn: string): Spot | Miss {
  const fn = functions.filter((f) => nodeName(nodeProp(f, 'id')) === targetFn).at(-1);
  const block = fn === undefined ? null : nodeProp(fn, 'body');
  if (fn === undefined || block === null) return 'no-target';
  const lastReturn = nodeList(block, 'body')
    .filter((statement) => statement.type === 'ReturnStatement')
    .at(-1);
  return { fn, block, at: lastReturn?.start ?? block.end - 1 };
}

/**
 * A cursor must be at a statement boundary of a block inside a top-level function's body: strictly between the
 * block's braces, outside every statement of that block, and outside every comment.
 */
function spotForCursor(
  functions: readonly AstNode[],
  comments: readonly { start: number; end: number }[],
  cursor: number,
): Spot | Miss {
  if (functions.length === 0) return 'no-target';
  const inside = (node: { start: number; end: number }): boolean =>
    node.start < cursor && cursor < node.end;
  for (const fn of functions) {
    const body = nodeProp(fn, 'body');
    if (body === null || !inside(body)) continue;
    let block = body;
    walk(body, (node) => {
      if (
        node.type === 'BlockStatement' &&
        inside(node) &&
        node.end - node.start < block.end - block.start
      ) {
        block = node;
      }
    });
    const insideStatement = nodeList(block, 'body').some(inside);
    return insideStatement || comments.some(inside) ? 'not-statement' : { fn, block, at: cursor };
  }
  return 'not-statement';
}

/**
 * AC-6.8, as a pure plan: where `sample` goes, and the changes that put it there. The caller applies `changes` as one
 * editor transaction (offsets all refer to the original `code`), so one undo reverses the insertion and the `async`.
 *
 * - Target: `cursor` when not `null` (it must be a statement position, see `spotForCursor`), else the function
 *   `targetFn`: before its last top-level `return`, or at the end of its body. A `cursor` outside `0..code.length`
 *   isn't a statement position.
 * - Async: when the sample uses `await` and the top-level function that receives it isn't `async`, a second change adds
 *   `async ` before that declaration.
 * - Trial parse: the changes are applied to a copy, which must parse as ECMAScript 2023 (a duplicate `let` or
 *   `const`, or `await` in a nested non-async callback, fails here).
 * - The sample goes on its own lines, at the indentation of the target block. A blank sample is `breaks-code`.
 * - Reasons: `no-target` (the code doesn't parse, there is no function for a cursor, or `targetFn` isn't declared),
 *   `not-statement` (the cursor isn't at a statement position), `breaks-code` (the trial parse fails).
 * There is no snippet-form, variable-conflict or reachability analysis beyond these rules (AC-6.8).
 */
export function planInsertion(
  code: string,
  sample: string,
  cursor: number | null,
  targetFn: string,
): InsertResult {
  const parsed = parseScript(code);
  if (parsed === null) return { ok: false, reason: 'no-target' };
  const functions = topLevelFunctions(parsed.program);
  let spot: Spot | Miss;
  if (cursor === null) {
    spot = spotForTarget(functions, targetFn);
  } else if (Number.isInteger(cursor) && cursor >= 0 && cursor <= code.length) {
    spot = spotForCursor(functions, parsed.comments, cursor);
  } else {
    spot = functions.length === 0 ? 'no-target' : 'not-statement';
  }
  if (typeof spot === 'string') return { ok: false, reason: spot };
  if (sample.trim() === '') return { ok: false, reason: 'breaks-code' };

  const sampleTokens = scanTokens(sample);
  const usesAwait = sampleTokens.failed
    ? /\bawait\b/.test(sample)
    : sampleTokens.tokens.some((token) => token.kind === 'name' && token.value === 'await');
  const changes: TextChange[] = [];
  if (usesAwait && spot.fn.async !== true) {
    changes.push({ from: spot.fn.start, to: spot.fn.start, insert: 'async ' });
  }
  changes.push(buildInsertion(code, spot.block, spot.at, sample));

  const text = applyChanges(code, changes);
  return parseScript(text) === null
    ? { ok: false, reason: 'breaks-code' }
    : { ok: true, changes, text };
}
