# Phase 03: Code structure analysis

**Implements:** FR-4 "Code analysis" (one tokenizer and parser at ECMAScript 2023, comments excluded, code never evaluated), FR-6 (used-object and used-member detection from the current server text; the `Server.Context` member marks), FR-7 (exported function names, connector detection and its fixtures table) | **Satisfies:** AC-4.7 (the HTTP-only `Server.Context` rule; the pill and the auto-reset are phases 10 and 18), AC-6.8 (target, async, trial parse, copy-fallback reasons, and the `function get(){ /* cursor */ return "{}"; }` fixture; the Insert button and the editor dispatch are phases 21 and 22), Error Scenario "A record's code is empty or can't be parsed" (the `null` contracts), Learn corrections 13 and 22
**Depends on:** 00
**Files:** replace `src/lib/code-analysis/structure.ts` (Phase 00's stub). Create the private helpers `src/lib/code-analysis/structureAst.ts` and `src/lib/code-analysis/structureInsert.ts`, and the tests `src/lib/code-analysis/structure.connector.test.ts`, `structure.names.test.ts`, `structure.members.test.ts` and `structure.insertion.test.ts`. No other file is touched.
**Interfaces:** Consumes: `ConnectorUse`, `InsertResult`, `TextChange` from `src/lib/code-analysis/codeAnalysis.types.ts` (Phase 00, verbatim from plan-starter.md Contracts); `parse`, `tokenizer`, `tokTypes` and the types `Comment`, `Options`, `Token` from `acorn` (installed in Phase 00; no `package.json` edit). Produces: the five pinned signatures in `src/lib/code-analysis/structure.ts`, verbatim:

- `detectConnectorUse(code: string): ConnectorUse | null`
- `exportedFunctionNames(code: string): readonly string[] | null`
- `usedServerMembers(code: string): ReadonlyMap<string, readonly string[]>`
- `readsHttpOnlyContext(code: string): boolean`
- `planInsertion(code: string, sample: string, cursor: number | null, targetFn: string): InsertResult`

No new cross-phase name is introduced. `structureAst.ts` and `structureInsert.ts` are private to this phase: no other phase imports them. Behaviour later phases may rely on:

- **All five functions are pure and never throw.** They never evaluate the code, and they have no React or host dependency. Offsets are UTF-16 code-unit offsets into the LF-only server text (`normalizeLf`, Phase 05, AC-4.10), which is what CodeMirror uses.
- **`detectConnectorUse`** (consumed by phase 11, FR-9 O0/O1 and AC-8.8) works from tokens, so it needs the code to tokenize but not to parse. It returns `null` only when tokenizing fails (an unterminated string, template or comment). Code that tokenizes but does not parse still gets a result. Phase 11 must therefore decide "couldn't read handler code" from `exportedFunctionNames(code) === null`, not from this function.
- **`exportedFunctionNames`** (phase 11) lists every top-level `function name(` and `async function name(` declaration, in source order, once each, **helpers included** (`getAccessToken`). Deciding which names are HTTP-mapped, and the "exports only `get`" rule (FR-7, AC-8.8), is phase 11's job: it filters with `METHOD_FUNCTION`. It returns `null` when the code does not parse (as a script, so `export function` is a parse failure) or has no statements at all (empty, whitespace or comments only); both mean "function names unknown".
- **`usedServerMembers`** (phases 13, 18, 22) returns object path to members, in first-use order, without duplicates. The nine paths are `Server.Logger`, `Server.Context`, `Server.User`, `Server.Website`, `Server.SiteSetting`, `Server.EnvironmentVariable`, `Server.Connector.Dataverse`, `Server.Connector.HttpClient` and `Server.Connector.CloudFlow`. An object that is referenced without a member (`if (Server.User)`) has an empty list. A member the catalogue does not know is still reported as written (`Server.Logger.Debug`), so the consumer filters. The path list is private to `structure.ts`; phase 13's catalogue test should assert that its nine object paths equal it. Parsed code is read from `MemberExpression` chains and object-pattern destructuring, so comments, strings and template text never count. There is no alias tracking. Code that does not parse falls back to the tokens (without destructuring), so the Used pills keep working while the user types.
- **`readsHttpOnlyContext`** (phase 10 `isLiquidAllowed`, phase 18 auto-reset) is true when `Server.Context.Body`, `Headers`, `HttpMethod`, `QueryParameters` or `Url` is referenced. It is `usedServerMembers` plus a set lookup, so it follows the same rules, including the token fallback for unparseable code. `Input`, `ActivityId`, `FunctionName` and `ServerLogicName` do not count, and neither does referencing `Server.Context` as a whole.
- **`planInsertion`** (phases 21 and 22) returns `{ ok: true, changes, text }` or `{ ok: false, reason }`. `changes` is ordered by `from`, with the optional `async ` change first, and every offset refers to the **original** text, so `view.dispatch({ changes })` applies the insertion and the `async` as one transaction and one undo reverses both. `text` is the result of the trial parse. The `reason` to tooltip mapping is AC-6.8's: `no-target` is "No function to insert into; use Copy", `not-statement` is "Move the cursor between statements inside a function, or use Copy", and `breaks-code` is "Inserting here would break the code; use Copy".

Insertion rules, as built (AC-6.8 plus the choices it leaves open):

- **Parse first.** Code that does not parse is `no-target`. With a cursor, code that declares no top-level function is also `no-target`; with no cursor, a `targetFn` that is not a top-level declaration is `no-target`. With several declarations of one name, the last wins, as in the runtime.
- **Statement position.** The cursor must lie strictly between the braces of a block that sits inside a top-level function's body (the body itself, or an `if`, loop or callback block within it), outside every statement of that block, and outside every comment. A position at the edge of a comment is outside it. Strings, templates, regex literals and expressions are inside a statement, so they fail. A `switch` case body is not a block, so it fails. A cursor that is not an integer in `0..code.length` is `not-statement`.
- **No cursor.** The sample goes before the target's last top-level `return`, else just before the closing brace of its body.
- **Async.** `await` is looked for in the sample's tokens, so a comment or string that says "await" does not count. If the sample awaits and the top-level function that receives it is not `async`, `async ` is added before that declaration. An `await` that lands in a nested callback that is not `async` is caught by the trial parse (`breaks-code`).
- **Layout.** The sample is moved to the target block's indentation (its first statement that starts a line, else one level in from the line of its `{`, with a tab if that line uses tabs), keeping its own relative indentation, and always lands on its own lines, so it can never be swallowed by a `//` comment that runs to the end of the line.
- **Trial parse.** The changes are applied to a copy, which must parse as ECMAScript 2023. A duplicate `let` or `const` fails here, because acorn checks redeclarations. A blank sample is `breaks-code`.
- **Not done, on purpose.** No snippet-form, variable-conflict or reachability analysis (AC-6.8). An insertion after a statement that has no semicolon, before a sample that starts with `(` or `[`, is not detected.

The phase turns Phase 00's stub into the complete code-structure analysis. All five functions read code through one acorn tokenizer and parser, so a rule never disagrees with another about what is a comment, a string or a template.

---

- [ ] **Step 0: Preflight**

  Run from the repo root:

  ```bash
  git status --short
  ls src/lib/code-analysis/
  grep -n "not implemented: phase 03" src/lib/code-analysis/structure.ts
  npm ls acorn
  ```

  Expect: `codeAnalysis.types.ts` and the stub `structure.ts` are present, the grep prints the stub's `throw` lines (one per function), and `npm ls acorn` lists `acorn@8.x`. If Phase 00 left a test that asserts the stub throws (`grep -rn "not implemented: phase 03" src --include=*.test.ts`), delete that one assertion in this phase's commit; it is the stub's own test. Do not touch any other file.

- [ ] **Step 1: Write the connector detection test (FR-7 fixtures, plus bracket, destructure and alias cases)**

  Create `src/lib/code-analysis/structure.connector.test.ts`. The first block is FR-7's fixtures table, one row each. The spec writes the arguments of the first and third rows as an ellipsis; the test uses real ones, because detection reads tokens and an ellipsis would not tokenize.

  ```ts file=src/lib/code-analysis/structure.connector.test.ts
  import { describe, expect, it } from 'vitest';
  import type { ConnectorUse } from './codeAnalysis.types';
  import { detectConnectorUse } from './structure';

  const use = (dataverse: boolean, httpClient: boolean, undetermined: boolean): ConnectorUse => ({
    dataverse,
    httpClient,
    undetermined,
  });

  // FR-7's fixtures table, row by row. The spec writes the arguments as an ellipsis; these use real ones.
  const FIXTURES: readonly { row: string; code: string; expected: ConnectorUse }[] = [
    {
      row: 'Server.Connector.Dataverse.RetrieveRecord(...)',
      code: 'Server.Connector.Dataverse.RetrieveRecord("accounts", id, "$select=name");',
      expected: use(true, false, false),
    },
    {
      row: 'Server.Connector["HttpClient"]',
      code: 'Server.Connector["HttpClient"].GetAsync(url, headers);',
      expected: use(false, true, false),
    },
    {
      row: 'const c = Server.Connector; c[name](...)',
      code: 'const c = Server.Connector; c[name](url);',
      expected: use(false, false, true),
    },
    {
      row: 'const { Connector } = Server;',
      code: 'const { Connector } = Server;',
      expected: use(false, false, true),
    },
    {
      row: '// Server.Connector.Dataverse only',
      code: '// Server.Connector.Dataverse',
      expected: use(false, false, false),
    },
  ];

  describe('detectConnectorUse: the FR-7 fixtures table', () => {
    it.each(FIXTURES)('$row', ({ code, expected }) => {
      expect(detectConnectorUse(code)).toEqual(expected);
    });
  });

  describe('detectConnectorUse: uses', () => {
    it.each<readonly [string, string, ConnectorUse]>([
      ['empty code', '', use(false, false, false)],
      ['HttpClient, dotted', 'Server.Connector.HttpClient.GetAsync(u, h);', use(false, true, false)],
      [
        'both connectors in one file',
        'Server.Connector.Dataverse.X(); Server.Connector.HttpClient.Y();',
        use(true, true, false),
      ],
      ['single-quoted bracket', "Server.Connector['Dataverse'].X();", use(true, false, false)],
      ['bracket at both steps', 'Server["Connector"]["HttpClient"].GetAsync(u, h);', use(false, true, false)],
      [
        'alias of a dotted path',
        'const d = Server.Connector.Dataverse; d.RetrieveRecord("a", i);',
        use(true, false, false),
      ],
      [
        'destructured name; Connector ends the chain',
        'const { Dataverse } = Server.Connector;',
        use(true, false, true),
      ],
      [
        'name held in a string; computed key',
        'const k = "HttpClient"; Server.Connector[k].GetAsync(u, h);',
        use(false, true, true),
      ],
      ['Server[k]', 'Server[k].Dataverse.X();', use(true, false, true)],
      ['Server.Connector[name]', 'Server.Connector[name](u);', use(false, false, true)],
      ['Server on its own', 'const s = Server;', use(false, false, true)],
      ['optional chaining is not a plain dot', 'Server?.Connector?.Dataverse.X();', use(true, false, true)],
      [
        'template literal in brackets is not a string literal',
        'Server.Connector[`Dataverse`].X();',
        use(false, false, true),
      ],
      ['Dataverse in a string argument', 'Server.Logger.Log("Dataverse");', use(true, false, false)],
    ])('%s', (_name, code, expected) => {
      expect(detectConnectorUse(code)).toEqual(expected);
    });

    it('ignores line comments, block comments and regex literals', () => {
      const code = [
        '/* Server.Connector.Dataverse */',
        '// Server.Connector.HttpClient',
        'const r = /Dataverse|HttpClient/;',
        'const n = 1;',
      ].join('\n');
      expect(detectConnectorUse(code)).toEqual(use(false, false, false));
    });

    it('needs the whole token: longer identifiers and property-less text do not count', () => {
      expect(detectConnectorUse('DataverseHelper(); myHttpClient.go(); const s = "HttpClients";')).toEqual(
        use(false, false, false),
      );
    });

    it('counts a Server or Connector token anywhere, including a property key', () => {
      expect(detectConnectorUse('const o = { Server: 1 };')).toEqual(use(false, false, true));
    });

    it('reads code that tokenizes but does not parse', () => {
      expect(detectConnectorUse('function get( { Server.Connector.Dataverse.X() }')).toEqual(
        use(true, false, false),
      );
    });

    it('is null when tokenizing fails', () => {
      expect(detectConnectorUse('const s = "Dataverse')).toBeNull();
      expect(detectConnectorUse('/* Dataverse')).toBeNull();
      expect(detectConnectorUse('const t = `Dataverse')).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Write the exported-function-names test**

  Create `src/lib/code-analysis/structure.names.test.ts`. It pins that helpers are included (the HTTP-mapped filter is phase 11's), that only top-level declarations count, and the `null` cases.

  ```ts file=src/lib/code-analysis/structure.names.test.ts
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
      ['ES2023 syntax parses', 'async function get() { const a = [1].at(-1); return a?.b ?? 1; }', ['get']],
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
  ```

- [ ] **Step 3: Write the used-members and HTTP-only-context test**

  Create `src/lib/code-analysis/structure.members.test.ts`. It covers the nine objects, first-use order, comments and strings excluded, bracket access, optional chaining, destructuring, the no-alias limit, the token fallback for code that does not parse, and the AC-4.7 rule.

  ```ts file=src/lib/code-analysis/structure.members.test.ts
  import { describe, expect, it } from 'vitest';
  import { readsHttpOnlyContext, usedServerMembers } from './structure';

  /** The map as sorted-by-first-use entries, so a failure shows the whole picture. */
  const used = (code: string): [string, readonly string[]][] => [...usedServerMembers(code)];

  describe('usedServerMembers', () => {
    it('records the members of all nine FR-6 objects, in first-use order', () => {
      const code = [
        'async function get() {',
        'Server.Logger.Log("a");',
        'const c = JSON.parse(Server.Context.Input || "{}");',
        'const name = Server.User ? Server.User.fullname : "";',
        'const d = Server.Website.adx_primarydomain;',
        'const s = Server.SiteSetting.Get("Key");',
        'const e = Server.EnvironmentVariable.get("Name");',
        'Server.Connector.Dataverse.RetrieveRecord("accounts", id);',
        'await Server.Connector.HttpClient.GetAsync(url, headers);',
        'await Server.Connector.CloudFlow.TriggerAsync(url, body);',
        '}',
      ].join('\n');
      expect(used(code)).toEqual([
        ['Server.Logger', ['Log']],
        ['Server.Context', ['Input']],
        ['Server.User', ['fullname']],
        ['Server.Website', ['adx_primarydomain']],
        ['Server.SiteSetting', ['Get']],
        ['Server.EnvironmentVariable', ['get']],
        ['Server.Connector.Dataverse', ['RetrieveRecord']],
        ['Server.Connector.HttpClient', ['GetAsync']],
        ['Server.Connector.CloudFlow', ['TriggerAsync']],
      ]);
    });

    it('lists a member once and keeps first-use order', () => {
      const code = 'Server.Logger.Log(a); Server.Logger.Error(b); Server.Logger.Log(c); Server.Logger.Warn(d);';
      expect(used(code)).toEqual([['Server.Logger', ['Log', 'Error', 'Warn']]]);
    });

    it('records an object referenced without a member, with an empty list', () => {
      expect(used('if (Server.User) { go(); }')).toEqual([['Server.User', []]]);
      expect(used('const d = Server.Connector.Dataverse;')).toEqual([['Server.Connector.Dataverse', []]]);
    });

    it('ignores comments, strings, template text and regex literals, but not template interpolations', () => {
      const code = [
        '// Server.Logger.Log("x");',
        '/* Server.Context.Body */',
        'const a = "Server.Context.Url";',
        'const b = `Server.Context.Headers`;',
        'const r = /Server.Context.Body/;',
        'const c = `${Server.Context.HttpMethod}`;',
      ].join('\n');
      expect(used(code)).toEqual([['Server.Context', ['HttpMethod']]]);
    });

    it('reads bracket access with a string literal, and optional chaining', () => {
      expect(used('Server.Connector["HttpClient"].GetAsync(u, h);')).toEqual([
        ['Server.Connector.HttpClient', ['GetAsync']],
      ]);
      expect(used("Server['Logger']['Log'](a);")).toEqual([['Server.Logger', ['Log']]]);
      expect(used('const n = Server.User?.fullname; const q = Server?.Context?.QueryParameters;')).toEqual([
        ['Server.User', ['fullname']],
        ['Server.Context', ['QueryParameters']],
      ]);
    });

    it('stops at a computed key that is not a string literal', () => {
      expect(used('const v = Server.Context[key];')).toEqual([['Server.Context', []]]);
      expect(used('const v = Server.Context[key].Body;')).toEqual([['Server.Context', []]]);
    });

    it('keeps members the catalogue does not know, and ignores unknown objects', () => {
      expect(used('Server.Logger.Debug(a);')).toEqual([['Server.Logger', ['Debug']]]);
      expect(
        used('Server.Foo.Bar(); Server.Connector.Other.X(); other.Server.Logger.Log(a); Logger.Log(a);'),
      ).toEqual([]);
    });

    it('reads object-pattern destructuring of an object', () => {
      expect(used('const { Body, Url: u, "Headers": h } = Server.Context;')).toEqual([
        ['Server.Context', ['Body', 'Url', 'Headers']],
      ]);
      expect(used('const { Dataverse } = Server.Connector;')).toEqual([['Server.Connector.Dataverse', []]]);
      expect(used('const { Logger } = Server;')).toEqual([['Server.Logger', []]]);
    });

    it('does not follow aliases', () => {
      expect(used('const c = Server.Context; const b = c.Body;')).toEqual([['Server.Context', []]]);
    });

    it('is empty for code with no Server object', () => {
      expect(used('')).toEqual([]);
      expect(used('function get() { return "{}"; }')).toEqual([]);
      expect(used('const c = Server.Connector;')).toEqual([]);
    });

    describe('code that does not parse (read from its tokens)', () => {
      it('finds the same chains, with comments and strings still excluded', () => {
        const code = [
          'function get( {',
          '  // Server.Logger.Warn("x")',
          '  const a = "Server.Context.Url";',
          '  Server.Logger.Log(1); Server.Context.Body;',
          '  Server.Connector["HttpClient"].GetAsync(u, h);',
        ].join('\n');
        expect(used(code)).toEqual([
          ['Server.Logger', ['Log']],
          ['Server.Context', ['Body']],
          ['Server.Connector.HttpClient', ['GetAsync']],
        ]);
      });

      it('skips a Server that is a property of something else, and stops at a computed key', () => {
        expect(used('function get( { x.Server.Logger.Log(1); Server.Context[k].Body; }')).toEqual([
          ['Server.Context', []],
        ]);
      });

      it('uses the tokens read before a tokenizing failure', () => {
        expect(used('Server.Logger.Log("ok"); const s = "unterminated')).toEqual([['Server.Logger', ['Log']]]);
      });

      it('does not read destructured members', () => {
        expect(used('function get( { const { Body } = Server.Context; }')).toEqual([['Server.Context', []]]);
      });
    });
  });

  describe('readsHttpOnlyContext (AC-4.7)', () => {
    it.each(['Body', 'Headers', 'HttpMethod', 'QueryParameters', 'Url'])('%s is HTTP only', (member) => {
      expect(readsHttpOnlyContext(`const v = Server.Context.${member};`)).toBe(true);
    });

    it.each(['Input', 'ActivityId', 'FunctionName', 'ServerLogicName'])('%s is not HTTP only', (member) => {
      expect(readsHttpOnlyContext(`const v = Server.Context.${member};`)).toBe(false);
    });

    it('is false for the Liquid-style Input read', () => {
      expect(readsHttpOnlyContext('const input = JSON.parse(Server.Context.Input || "{}");')).toBe(false);
    });

    it('counts every way of referencing a member in code', () => {
      expect(readsHttpOnlyContext('const v = Server.Context["Body"];')).toBe(true);
      expect(readsHttpOnlyContext('const v = Server?.Context?.QueryParameters;')).toBe(true);
      expect(readsHttpOnlyContext('const { Url } = Server.Context;')).toBe(true);
      expect(readsHttpOnlyContext('function get() { return JSON.parse(Server.Context.Body); }')).toBe(true);
    });

    it('does not count comments, strings or other objects', () => {
      expect(readsHttpOnlyContext('// Server.Context.Body')).toBe(false);
      expect(readsHttpOnlyContext('/* Server.Context.Url */ const a = 1;')).toBe(false);
      expect(readsHttpOnlyContext('const s = "Server.Context.Headers";')).toBe(false);
      expect(readsHttpOnlyContext('const b = Server.User.Body; const c = Other.Context.Body;')).toBe(false);
      expect(readsHttpOnlyContext('const v = Server.Context.body;')).toBe(false);
    });

    it('does not count the whole object or a computed key', () => {
      expect(readsHttpOnlyContext('log(Server.Context);')).toBe(false);
      expect(readsHttpOnlyContext('const v = Server.Context[key];')).toBe(false);
    });

    it('reads code that does not parse from its tokens', () => {
      expect(readsHttpOnlyContext('function get( { return Server.Context.QueryParameters; }')).toBe(true);
      expect(readsHttpOnlyContext('function get( { // Server.Context.Url\n return 1; }')).toBe(false);
    });

    it('is false for empty code', () => {
      expect(readsHttpOnlyContext('')).toBe(false);
    });
  });
  ```

- [ ] **Step 4: Write the insertion test (AC-6.8)**

  Create `src/lib/code-analysis/structure.insertion.test.ts`. A `§` in a test source marks the cursor. `expectOk` checks every successful plan twice: the changes applied together (an independent implementation, with offsets into the original text) must equal `text`, and `text` must parse. The first test is the spec fixture.

  ```ts file=src/lib/code-analysis/structure.insertion.test.ts
  import { describe, expect, it } from 'vitest';
  import type { InsertResult, TextChange } from './codeAnalysis.types';
  import { exportedFunctionNames, planInsertion } from './structure';

  const SAMPLE = 'Server.Logger.Log("hello");';
  const AWAIT_SAMPLE = 'const r = await Server.Connector.HttpClient.GetAsync(url, headers);';
  const MARK = '§';

  const lines = (...parts: string[]): string => parts.join('\n');

  /** Code with a `§` marking the cursor. */
  function marked(source: string): { code: string; cursor: number } {
    return { code: source.replace(MARK, ''), cursor: source.indexOf(MARK) };
  }

  /** All changes refer to the original text, the way one CodeMirror transaction applies them. Written independently of the implementation. */
  function applyTogether(code: string, changes: readonly TextChange[]): string {
    const ordered = [...changes].sort((a, b) => a.from - b.from);
    let out = '';
    let position = 0;
    for (const change of ordered) {
      expect(change.from).toBeGreaterThanOrEqual(position);
      out += code.slice(position, change.from) + change.insert;
      position = change.to;
    }
    return out + code.slice(position);
  }

  function expectOk(result: InsertResult, code: string): { changes: readonly TextChange[]; text: string } {
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(applyTogether(code, result.changes)).toBe(result.text);
    expect(exportedFunctionNames(result.text)).not.toBeNull();
    return result;
  }

  function insertAtMark(source: string, sample = SAMPLE, targetFn = 'get'): InsertResult {
    const { code, cursor } = marked(source);
    return planInsertion(code, sample, cursor, targetFn);
  }

  function textAtMark(source: string, sample = SAMPLE): string {
    return expectOk(insertAtMark(source, sample), marked(source).code).text;
  }

  describe('planInsertion: the cursor must be at a statement position', () => {
    it('rejects the spec fixture: the cursor inside the comment of function get(){ /* cursor */ return "{}"; }', () => {
      const code = 'function get(){ /* cursor */ return "{}"; }';
      expect(planInsertion(code, SAMPLE, code.indexOf('cursor') + 2, 'get')).toEqual({
        ok: false,
        reason: 'not-statement',
      });
    });

    it('accepts the same fixture with the cursor just before or just after the comment', () => {
      const code = 'function get(){ /* cursor */ return "{}"; }';
      for (const cursor of [code.indexOf('/*'), code.indexOf('*/') + 2]) {
        expect(planInsertion(code, SAMPLE, cursor, 'get').ok).toBe(true);
      }
    });

    const BODY = lines('function get() {', '  const a = 1;', '  const b = 2;', '  return a + b;', '}');
    const EXPECTED_BETWEEN = lines(
      'function get() {',
      '  const a = 1;',
      '  Server.Logger.Log("hello");',
      '  const b = 2;',
      '  return a + b;',
      '}',
    );

    it.each([
      ['at the start of the next line', BODY.replace('  const b', `${MARK}  const b`)],
      ["inside the next line's indentation", BODY.replace('  const b', ` ${MARK} const b`)],
      ['at the end of the previous statement', BODY.replace('const a = 1;', `const a = 1;${MARK}`)],
    ])('between two statements, %s', (_name, source) => {
      expect(textAtMark(source)).toBe(EXPECTED_BETWEEN);
    });

    it('just after the opening brace', () => {
      expect(textAtMark(lines(`function get() {${MARK}`, '  return 1;', '}'))).toBe(
        lines('function get() {', '  Server.Logger.Log("hello");', '  return 1;', '}'),
      );
    });

    it('just before the closing brace', () => {
      expect(textAtMark(lines('function get() {', '  return 1;', `${MARK}}`))).toBe(
        lines('function get() {', '  return 1;', '  Server.Logger.Log("hello");', '}'),
      );
      expect(textAtMark(lines('function get() {', '  doIt();', `  ${MARK}}`))).toBe(
        lines('function get() {', '  doIt();', '  Server.Logger.Log("hello");', '  }'),
      );
    });

    it('inside an empty body on one line', () => {
      expect(textAtMark(`function get() {${MARK}}`)).toBe(
        lines('function get() {', '  Server.Logger.Log("hello");', '}'),
      );
    });

    it("inside a nested block, at that block's indentation", () => {
      const source = lines(
        'function get() {',
        '  if (ok) {',
        '    a();',
        `${MARK}    b();`,
        '  }',
        '  return 1;',
        '}',
      );
      expect(textAtMark(source)).toBe(
        lines(
          'function get() {',
          '  if (ok) {',
          '    a();',
          '    Server.Logger.Log("hello");',
          '    b();',
          '  }',
          '  return 1;',
          '}',
        ),
      );
    });

    it('after a statement that is followed by another on the same line', () => {
      expect(textAtMark(`function get() {\n  a();${MARK} b();\n}`)).toBe(
        lines('function get() {', '  a();', '  Server.Logger.Log("hello");', '   b();', '}'),
      );
    });

    it('at the end of a line comment: the sample starts on its own line, so the comment cannot swallow it', () => {
      expect(textAtMark(lines('function get() {', `  a(); // note${MARK}`, '  return 1;', '}'))).toBe(
        lines('function get() {', '  a(); // note', '  Server.Logger.Log("hello");', '  return 1;', '}'),
      );
    });

    it.each([
      ['inside a string', 'function get() {\n  const s = "he§llo";\n  return s;\n}'],
      ['inside a template literal', 'function get() {\n  const s = `he§llo`;\n  return s;\n}'],
      ['inside a regex literal', 'function get() {\n  const r = /he§llo/;\n  return r;\n}'],
      ['inside an expression', 'function get() {\n  return foo(1, §2);\n}'],
      ['inside a template interpolation', 'function get() {\n  return `${§a}`;\n}'],
      ['inside a line comment', 'function get() {\n  // no§te\n  return 1;\n}'],
      ['inside a block comment', 'function get() {\n  /* one\n  tw§o */\n  return 1;\n}'],
      ['in the parameter list', 'function get(a§, b) {\n  return 1;\n}'],
      ['inside a statement without braces', 'function get() {\n  if (ok) §run();\n}'],
      ['inside a switch case', 'function get() {\n  switch (k) {\n    case 1:\n      §run();\n  }\n}'],
      ['between two top-level functions', 'function get() {}\n§\nfunction post() {}'],
      ['at top level, before the function', '§function get() {}'],
      ['at the very start of the function body brace', 'function get() §{}'],
      ['after the closing brace', 'function get() {}§'],
      ['inside a top-level statement', 'const a = [1,§ 2];\nfunction get() {}'],
      ['inside a class static block', 'function get() {\n  class A { static { § } }\n}'],
    ])('rejects %s', (_name, source) => {
      expect(insertAtMark(source)).toEqual({ ok: false, reason: 'not-statement' });
    });

    it.each([-1, 1.5, Number.NaN, 10_000])(
      'rejects the cursor %s that is not an offset into the code',
      (cursor) => {
        expect(planInsertion('function get() {}', SAMPLE, cursor, 'get')).toEqual({
          ok: false,
          reason: 'not-statement',
        });
      },
    );
  });

  describe('planInsertion: no cursor, so the target function', () => {
    it('goes before the last top-level return', () => {
      const code = lines(
        'function get() {',
        '  if (empty) { return "{}"; }',
        '  const a = 1;',
        '  return JSON.stringify({ a });',
        '}',
      );
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines(
          'function get() {',
          '  if (empty) { return "{}"; }',
          '  const a = 1;',
          '  Server.Logger.Log("hello");',
          '  return JSON.stringify({ a });',
          '}',
        ),
      );
    });

    it('uses the last of several top-level returns', () => {
      const code = lines('function get() {', '  return 1;', '  return 2;', '}');
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines('function get() {', '  return 1;', '  Server.Logger.Log("hello");', '  return 2;', '}'),
      );
    });

    it('goes at the end of the body when there is no return', () => {
      const code = lines('function get() {', '  const a = 1;', '  doIt(a);', '}');
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines('function get() {', '  const a = 1;', '  doIt(a);', '  Server.Logger.Log("hello");', '}'),
      );
    });

    it('goes into an empty body', () => {
      const code = 'function get() {}';
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines('function get() {', '  Server.Logger.Log("hello");', '}'),
      );
    });

    it('works for a one-line function: the spec fixture without a cursor', () => {
      const code = 'function get(){ /* cursor */ return "{}"; }';
      const text = expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text;
      expect(text).toBe(
        lines('function get(){ /* cursor */ ', '  Server.Logger.Log("hello");', '  return "{}"; }'),
      );
    });

    it('picks the function by name: R8 getSummary, not the helper before it', () => {
      const code = lines(
        'function helper() {',
        '  return 0;',
        '}',
        'function getSummary() {',
        '  const input = JSON.parse(Server.Context.Input || "{}");',
        '  return JSON.stringify({ status: "success", input });',
        '}',
      );
      expect(expectOk(planInsertion(code, SAMPLE, null, 'getSummary'), code).text).toBe(
        lines(
          'function helper() {',
          '  return 0;',
          '}',
          'function getSummary() {',
          '  const input = JSON.parse(Server.Context.Input || "{}");',
          '  Server.Logger.Log("hello");',
          '  return JSON.stringify({ status: "success", input });',
          '}',
        ),
      );
    });

    it('uses the last declaration when a name is declared twice, as the runtime does', () => {
      const code = lines('function get() {', '  return 1;', '}', 'function get() {', '  return 2;', '}');
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines(
          'function get() {',
          '  return 1;',
          '}',
          'function get() {',
          '  Server.Logger.Log("hello");',
          '  return 2;',
          '}',
        ),
      );
    });

    it('is no-target when the function is not declared at the top level', () => {
      expect(planInsertion('function post() {}', SAMPLE, null, 'get')).toEqual({
        ok: false,
        reason: 'no-target',
      });
      expect(planInsertion('const get = function () {};', SAMPLE, null, 'get')).toEqual({
        ok: false,
        reason: 'no-target',
      });
      expect(planInsertion('function outer() { function get() {} }', SAMPLE, null, 'get')).toEqual({
        ok: false,
        reason: 'no-target',
      });
    });
  });

  describe('planInsertion: no target at all', () => {
    it('is no-target when the code does not parse, with or without a cursor', () => {
      expect(planInsertion('function get( {', SAMPLE, null, 'get')).toEqual({ ok: false, reason: 'no-target' });
      expect(planInsertion('function get( {', SAMPLE, 14, 'get')).toEqual({ ok: false, reason: 'no-target' });
      expect(planInsertion('const s = "open', SAMPLE, null, 'get')).toEqual({ ok: false, reason: 'no-target' });
    });

    it('is no-target when the code has no function to insert into, even with a cursor', () => {
      expect(planInsertion('', SAMPLE, null, 'get')).toEqual({ ok: false, reason: 'no-target' });
      expect(planInsertion('', SAMPLE, 0, 'get')).toEqual({ ok: false, reason: 'no-target' });
      expect(planInsertion('const a = 1;', SAMPLE, 6, 'get')).toEqual({ ok: false, reason: 'no-target' });
    });
  });

  describe('planInsertion: async', () => {
    const GET = lines('function get() {', '  return "{}";', '}');

    it('adds async to the declaration when the sample awaits and the function is not async', () => {
      const result = expectOk(planInsertion(GET, AWAIT_SAMPLE, null, 'get'), GET);
      expect(result.changes).toEqual([
        { from: 0, to: 0, insert: 'async ' },
        { from: GET.indexOf('  return'), to: GET.indexOf('  return'), insert: `  ${AWAIT_SAMPLE}\n` },
      ]);
      expect(result.text).toBe(lines('async function get() {', `  ${AWAIT_SAMPLE}`, '  return "{}";', '}'));
    });

    it('keeps every offset in the original text, async change first, so one transaction applies them together', () => {
      const code = lines('function helper() {}', 'function get() {', '  return "{}";', '}');
      const result = expectOk(planInsertion(code, AWAIT_SAMPLE, null, 'get'), code);
      expect(result.changes.map((c) => c.from)).toEqual([
        code.indexOf('function get'),
        code.indexOf('  return'),
      ]);
      expect(result.changes[0]).toEqual({
        from: code.indexOf('function get'),
        to: code.indexOf('function get'),
        insert: 'async ',
      });
    });

    it('also adds it for a cursor insert, to the top-level function that holds the cursor', () => {
      const { code, cursor } = marked(
        lines('function other() {}', 'function get() {', `  ${MARK}`, '  return "{}";', '}'),
      );
      const result = expectOk(planInsertion(code, AWAIT_SAMPLE, cursor, 'other'), code);
      expect(result.changes[0]).toEqual({
        from: code.indexOf('function get'),
        to: code.indexOf('function get'),
        insert: 'async ',
      });
      expect(result.text).toContain('async function get()');
      expect(result.text).not.toContain('async function other()');
    });

    it('adds nothing when the function is already async', () => {
      const code = lines('async function get() {', '  return "{}";', '}');
      const result = expectOk(planInsertion(code, AWAIT_SAMPLE, null, 'get'), code);
      expect(result.changes).toHaveLength(1);
      expect(result.text.startsWith('async function get()')).toBe(true);
      expect(result.text).not.toContain('async async');
    });

    it('adds nothing when the sample does not await, or only mentions await in a comment or string', () => {
      for (const sample of [SAMPLE, '// await later\nServer.Logger.Log("await");']) {
        const result = expectOk(planInsertion(GET, sample, null, 'get'), GET);
        expect(result.changes).toHaveLength(1);
        expect(result.text).not.toContain('async');
      }
    });

    it('is breaks-code when the await lands in a nested callback that is not async', () => {
      const { code, cursor } = marked(
        lines('function get() {', '  items.forEach((i) => {', `    ${MARK}`, '  });', '}'),
      );
      expect(planInsertion(code, AWAIT_SAMPLE, cursor, 'get')).toEqual({ ok: false, reason: 'breaks-code' });
      expectOk(planInsertion(code, SAMPLE, cursor, 'get'), code);
    });
  });

  describe('planInsertion: the trial parse', () => {
    it.each([
      [
        'a duplicate const',
        'const result = 2;',
        lines('function get() {', '  const result = 1;', '  return result;', '}'),
      ],
      [
        'a duplicate let',
        'let result = 2;',
        lines('function get() {', '  let result = 1;', '  return result;', '}'),
      ],
      ['a sample that is not a statement', 'const = ;', lines('function get() {', '  return 1;', '}')],
      ['a sample with an unbalanced brace', 'if (a) {', lines('function get() {', '  return 1;', '}')],
      ['a sample that closes the function', '}', lines('function get() {', '  return 1;', '}')],
    ])('%s is breaks-code, with and without a cursor', (_name, sample, code) => {
      expect(planInsertion(code, sample, null, 'get')).toEqual({ ok: false, reason: 'breaks-code' });
      const cursor = code.indexOf('  return');
      expect(planInsertion(code, sample, cursor, 'get')).toEqual({ ok: false, reason: 'breaks-code' });
    });

    it('accepts a sample that declares a name the function does not have', () => {
      const code = lines('function get() {', '  const a = 1;', '  return a;', '}');
      expect(expectOk(planInsertion(code, 'const b = 2;', null, 'get'), code).text).toContain(
        '  const b = 2;\n  return a;',
      );
    });

    it('is breaks-code for a blank sample', () => {
      expect(planInsertion('function get() {}', '  \n ', null, 'get')).toEqual({
        ok: false,
        reason: 'breaks-code',
      });
    });
  });

  describe('planInsertion: layout', () => {
    it('moves a multi-line sample to the block indentation and keeps its relative indentation', () => {
      const sample = lines(
        '',
        '    const r = Server.Connector.Dataverse.RetrieveMultipleRecords(',
        '      "accounts",',
        '      "$top=5",',
        '    );',
        '',
      );
      const code = lines('function get() {', '  return 1;', '}');
      expect(expectOk(planInsertion(code, sample, null, 'get'), code).text).toBe(
        lines(
          'function get() {',
          '  const r = Server.Connector.Dataverse.RetrieveMultipleRecords(',
          '    "accounts",',
          '    "$top=5",',
          '  );',
          '  return 1;',
          '}',
        ),
      );
    });

    it('normalises CRLF in the sample to LF', () => {
      const code = lines('function get() {', '  return 1;', '}');
      const text = expectOk(planInsertion(code, 'a();\r\nb();', null, 'get'), code).text;
      expect(text).toBe(lines('function get() {', '  a();', '  b();', '  return 1;', '}'));
    });

    it('follows tab indentation', () => {
      const code = lines('function get() {', '\treturn 1;', '}');
      expect(expectOk(planInsertion(code, SAMPLE, null, 'get'), code).text).toBe(
        lines('function get() {', '\tServer.Logger.Log("hello");', '\treturn 1;', '}'),
      );
    });

    it('indents an empty indented block one level in from its own line', () => {
      const code = lines('function get() {', '  if (ok) {', '  }', '  return 1;', '}');
      const cursor = code.indexOf('{', code.indexOf('if')) + 1;
      expect(expectOk(planInsertion(code, SAMPLE, cursor, 'get'), code).text).toBe(
        lines('function get() {', '  if (ok) {', '    Server.Logger.Log("hello");', '  }', '  return 1;', '}'),
      );
    });
  });
  ```

- [ ] **Step 5: Run the tests and confirm they FAIL**

  ```bash
  npx vitest run src/lib/code-analysis/structure
  ```

  Expect: FAIL. 4 test files, 125 tests, all failing with `not implemented: phase 03` (24 in `structure.connector.test.ts`, 14 in `structure.names.test.ts`, 29 in `structure.members.test.ts`, 58 in `structure.insertion.test.ts`). If any test passes, the stub is not the one this plan assumes: stop and check Step 0.

- [ ] **Step 6: Implement `structureAst.ts` (private parser and tokenizer helpers)**

  Create the file. It is the only place that touches acorn. `AstNode` is an acorn node seen as plain data (every property `unknown` until an accessor narrows it), so no cast is needed. `scanTokens` keeps the tokens read before a failure, which the used-members fallback uses. acorn's `Token` type omits `value`, so `toTok` reads it behind an `in` check.

  ```ts file=src/lib/code-analysis/structureAst.ts
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

  /** Visits `node` and every descendant, parents before children, in source order. */
  export function walk(node: AstNode, visit: (n: AstNode) => void): void {
    visit(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value.filter(isAstNode)) walk(item, visit);
      } else if (isAstNode(value)) {
        walk(value, visit);
      }
    }
  }

  function isSyntaxError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'SyntaxError';
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
    if (token.type === tokTypes.name || token.type.keyword !== undefined) return { kind: 'name', value };
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
  ```

- [ ] **Step 7: Implement `structureInsert.ts` (private layout helpers)**

  Create the file. `buildInsertion` returns the one `TextChange` that places the sample, and `applyChanges` applies a change list the way a single editor transaction does (all offsets against the original text). Neither reads or decides anything about the code's meaning; that is `planInsertion`'s job.

  ```ts file=src/lib/code-analysis/structureInsert.ts
  import type { TextChange } from './codeAnalysis.types';
  import { nodeList } from './structureAst';
  import type { AstNode } from './structureAst';

  // Private to planInsertion (structure.ts): where and how the sample text goes in. The text is LF-only (normalizeLf).

  function lineStartOf(code: string, offset: number): number {
    return offset === 0 ? 0 : code.lastIndexOf('\n', offset - 1) + 1;
  }

  function lineEndOf(code: string, offset: number): number {
    const end = code.indexOf('\n', offset);
    return end === -1 ? code.length : end;
  }

  /** The leading whitespace of the line that holds `offset`. */
  function indentOf(code: string, offset: number): string {
    const start = lineStartOf(code, offset);
    let end = start;
    while (code[end] === ' ' || code[end] === '\t') end++;
    return code.slice(start, end);
  }

  /** The indentation of the block's statements: its first statement that starts a line, else one level in. */
  function blockIndent(code: string, block: AstNode): string {
    for (const statement of nodeList(block, 'body')) {
      const lineStart = lineStartOf(code, statement.start);
      const before = code.slice(lineStart, statement.start);
      if (before.trim() === '') return before;
    }
    const outer = indentOf(code, block.start);
    return outer + (outer.includes('\t') ? '\t' : '  ');
  }

  /**
   * The sample's lines, trimmed of blank lines at both ends, moved to `indent` and keeping their relative indentation.
   * shortcut: continuation lines of a multi-line template literal in a sample would be re-indented too; no catalogue
   * sample has one, so revisit this if one gains one.
   */
  function indentSample(sample: string, indent: string): string {
    const lines = sample.replace(/\r\n?/g, '\n').split('\n');
    while (lines[0]?.trim() === '') lines.shift();
    while (lines.at(-1)?.trim() === '') lines.pop();
    const margin = Math.min(
      ...lines.filter((l) => l.trim() !== '').map((l) => l.length - l.trimStart().length),
    );
    return lines.map((l) => (l.trim() === '' ? '' : indent + l.slice(margin))).join('\n');
  }

  /**
   * The change that puts `sample` at `at`, a statement boundary inside `block`. The sample always lands on its own
   * lines, so it can't end up inside a `//` comment that runs to the end of the line.
   */
  export function buildInsertion(code: string, block: AstNode, at: number, sample: string): TextChange {
    const indent = blockIndent(code, block);
    const body = indentSample(sample, indent);
    const lineStart = lineStartOf(code, at);
    if (code.slice(lineStart, at).trim() === '') {
      // Only whitespace before `at` on its line: put the sample on the lines above it.
      return { from: lineStart, to: lineStart, insert: `${body}\n` };
    }
    const rest = code.slice(at, lineEndOf(code, at));
    const tail =
      rest.trim() === '' ? '' : `\n${rest.trimStart().startsWith('}') ? indentOf(code, block.start) : indent}`;
    return { from: at, to: at, insert: `\n${body}${tail}` };
  }

  /** Applies changes whose offsets all refer to `code`, the way one CodeMirror transaction does. */
  export function applyChanges(code: string, changes: readonly TextChange[]): string {
    let text = code;
    for (const change of [...changes].sort((a, b) => b.from - a.from)) {
      text = text.slice(0, change.from) + change.insert + text.slice(change.to);
    }
    return text;
  }
  ```

- [ ] **Step 8: Implement `structure.ts`**

  Replace the whole file (it is Phase 00's stub). The design in brief:

  - `detectConnectorUse` is a single pass over the tokens: a `Dataverse` or `HttpClient` name or string token sets its flag, and a `Server` or `Connector` name token that does not continue as `.name` or `["string"]` sets `undetermined`.
  - `exportedFunctionNames` parses and returns the top-level `FunctionDeclaration` names.
  - `usedServerMembers` walks the AST once. A `MemberExpression` is flattened into a static chain (`['Server', 'Connector', 'HttpClient', 'GetAsync']`), and the chain is matched against the nine object paths by prefix. Object-pattern destructuring of a chain adds its keys. If the code does not parse, the same matcher runs over the tokens.
  - `readsHttpOnlyContext` is a set lookup over `usedServerMembers(code).get('Server.Context')`.
  - `planInsertion` finds the spot (cursor or target function), builds the change list, applies it to a copy and parses the copy.

  ```ts file=src/lib/code-analysis/structure.ts
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
    const object = SERVER_OBJECTS.find(({ segments }) => segments.every((segment, i) => chain[i] === segment));
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
      if (token.kind !== 'name' || token.value !== 'Server' || tokens[index - 1]?.kind === 'dot') return;
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
    const inside = (node: { start: number; end: number }): boolean => node.start < cursor && cursor < node.end;
    for (const fn of functions) {
      const body = nodeProp(fn, 'body');
      if (body === null || !inside(body)) continue;
      let block = body;
      walk(body, (node) => {
        if (node.type === 'BlockStatement' && inside(node) && node.end - node.start < block.end - block.start) {
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
    return parseScript(text) === null ? { ok: false, reason: 'breaks-code' } : { ok: true, changes, text };
  }
  ```

- [ ] **Step 9: Run the tests and confirm they PASS**

  ```bash
  npx vitest run src/lib/code-analysis/structure
  ```

  Expect: PASS, 4 test files and 125 tests (24, 14, 29 and 58). If a test fails, fix the implementation, never the fixture: the FR-7 rows, the AC-4.7 member list and the AC-6.8 fixture are the spec.

- [ ] **Step 10: Typecheck, lint and format**

  ```bash
  npx prettier --write src/lib/code-analysis/structure.ts src/lib/code-analysis/structureAst.ts src/lib/code-analysis/structureInsert.ts src/lib/code-analysis/structure.connector.test.ts src/lib/code-analysis/structure.names.test.ts src/lib/code-analysis/structure.members.test.ts src/lib/code-analysis/structure.insertion.test.ts
  npx tsc -b
  npx eslint src/lib/code-analysis --max-warnings=0
  npx prettier --check .
  npx vitest run src/lib/code-analysis/structure
  ```

  Expect: all succeed with no output other than Prettier's "All matched files use Prettier code style!" and the test summary (125 passed). The files were checked with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` and typescript-eslint `strictTypeChecked` plus `stylisticTypeChecked` with `consistent-type-definitions` set to `type` (the project prefers `type` aliases, `.claude/rules/typescript.md`). If ESLint reports `consistent-type-definitions` for a `type` alias, that is a defect in Phase 00's `eslint.config.ts`: stop and report it to the orchestrator instead of converting the aliases or adding `eslint-disable`. For any other rule, fix the code at that line. Do not add `eslint-disable` or `@ts-ignore`.

- [ ] **Step 11: Commit**

  ```bash
  git add src/lib/code-analysis/structure.ts src/lib/code-analysis/structureAst.ts src/lib/code-analysis/structureInsert.ts src/lib/code-analysis/structure.connector.test.ts src/lib/code-analysis/structure.names.test.ts src/lib/code-analysis/structure.members.test.ts src/lib/code-analysis/structure.insertion.test.ts
  git commit -m "feat(code-analysis): add code structure analysis"
  ```

  If Step 0 found a stub test to delete, add that file to the `git add`. Do not commit anything else.

---

## Phase verification

- [ ] `npx vitest run src/lib/code-analysis/structure` passes: 4 files and 125 tests, including all five FR-7 fixture rows (one `it.each` case each) and the AC-6.8 fixture (the first insertion test).
- [ ] The gate set passes: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run`.
- [ ] The module stays pure: `grep -n "^import" src/lib/code-analysis/structure.ts src/lib/code-analysis/structureAst.ts src/lib/code-analysis/structureInsert.ts` lists only `acorn`, `./codeAnalysis.types`, `./structureAst` and `./structureInsert`.
- [ ] The helpers stay private: `grep -rln "structureAst\|structureInsert" src` lists only `structure.ts`, `structureAst.ts` and `structureInsert.ts`.
- [ ] Nothing evaluates code: `grep -rnE "eval\(|new Function|\bvm\b" src/lib/code-analysis/structure*.ts` prints nothing.
- [ ] Only this phase's files changed: `git show --stat HEAD` lists the seven files above (plus a stub test, if Step 0 removed one).
- [ ] The hand-offs are recorded in this plan's Interfaces: phase 11 filters HTTP-mapped names and decides "couldn't read handler code" from `exportedFunctionNames`; phase 13 asserts its nine object paths against `usedServerMembers`'s; phases 21 and 22 dispatch `result.changes` as one transaction.

## Done when

- `detectConnectorUse` returns the expected flags for every row of FR-7's fixtures table and for bracket, destructured and aliased uses, ignores comments, and returns `null` only when tokenizing fails.
- `exportedFunctionNames` lists top-level function names (helpers included) in source order, and is `null` for code that does not parse or has no statements.
- `usedServerMembers` and `readsHttpOnlyContext` read the nine `Server.*` objects from the AST (comments, strings and template text excluded), fall back to tokens for unparseable code, and flag exactly `Body`, `Headers`, `HttpMethod`, `QueryParameters` and `Url` as HTTP only.
- `planInsertion` rejects the spec fixture's cursor with `not-statement`, inserts at statement positions and at the target function, adds `async` when needed as a separate change with offsets into the original text, returns `breaks-code` on a failed trial parse and `no-target` for unparseable code or a missing function, and works for R8's `getSummary`.
- `tsc -b`, ESLint with zero warnings, Prettier and the whole Vitest suite pass, and the commit contains only this phase's files.
