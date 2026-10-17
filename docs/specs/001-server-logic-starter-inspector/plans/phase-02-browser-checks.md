# Phase 02: Restricted-pattern and browser-API checks

**Implements:** FR-4 (restricted patterns, browser APIs, tokenizer fallback, table rows T2–T22; "re-run on every edit" holds because the check is one pure function), FR-4 Must (report line numbers) | **Satisfies:** AC-5.2 (the logic: hits plus 1-based lines), AC-3.2 (the check itself; the assertion over generated code lives in phases 07, 08, 09, 13 and 19), Error Scenario "Code can't be tokenized" (F23)
**Depends on:** 00
**Files:** replace `src/lib/code-analysis/browserChecks.ts` (Phase 00's stub); create `src/lib/code-analysis/browserChecks.table.test.ts` and `src/lib/code-analysis/browserChecks.test.ts`. No other file is touched.
**Interfaces:** Consumes: `CheckSeverity`, `CheckHit`, `BrowserCheckResult` from `src/lib/code-analysis/codeAnalysis.types.ts` (Phase 00, verbatim from plan.md Contracts); `tokenizer`, `parse`, `tokTypes` from `acorn` (installed in Phase 00; no `package.json` edit). Produces: `runBrowserChecks(code: string): BrowserCheckResult` (pinned signature) and `RESTRICTED_PATTERNS: readonly { readonly label: string; readonly regex: RegExp }[]`, both in `src/lib/code-analysis/browserChecks.ts`. Behaviour later phases may rely on:

- `CheckHit.pattern` is the label from FR-4 Must verbatim: a restricted pattern is one of `__dirname`, `__filename`, `import(`, `import from`, `eval(`, `Function(`, `setTimeout(`, `setInterval(`, `setImmediate(`, `process.exit`, `process.kill`, `child_process`, `fs.`, `require(`, `constructor.constructor`, `this.constructor`, `arguments.callee`, `with(`, `delete`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Proxy(`, `Reflect.`, `Symbol.for`, `__proto__`, `prototype`, `debugger`; a browser API is one of `fetch`, `XMLHttpRequest`, `window`, `document`, `localStorage`, `sessionStorage`.
- Every restricted hit is `'blocked'`. A browser API is `'blocked'` in code and `'may-be-rejected'` in a comment, string, regex literal or template text.
- `line` is 1-based. Line breaks are CRLF, CR, LF, U+2028 and U+2029, the set acorn uses. The app's server text is LF only (`normalizeLf`, Phase 05), so lines match the editor.
- `hits` are sorted by line, then pattern (code-unit order, so locale never matters), then severity, and de-duplicated per (pattern, line, severity). The result is deterministic.
- `parseFailed` is `true` when the code does not tokenize or does not parse as an ECMAScript 2023 script. A consumer deciding "Browser checks needs attention" (AC-5.2) must treat `hits.length > 0 || parseFailed` as needs attention, because a parse failure never passes (FR-4).
- The function never throws, never evaluates the code and has no React or host dependency.

The phase turns Phase 00's stub into the complete FR-4 check. Restricted patterns run as the runtime's case-insensitive regexes over the raw text (Spike S4), so they need no tokenizer. Browser APIs are classified with acorn's tokenizer, with a raw substring fallback when tokenizing fails.

> **T1 is not tested here.** T1 ("every generated recipe, any method or language, no matches") is asserted against generated code by phases 07, 08, 09, 13 and 19. This phase tests T2–T22.

---

- [ ] **Step 0: Preflight**

  Run from the repo root:

  ```bash
  git status --short
  ls src/lib/code-analysis/
  grep -n "not implemented: phase 02" src/lib/code-analysis/browserChecks.ts
  npm ls acorn
  ```

  Expect: `codeAnalysis.types.ts` and the stub `browserChecks.ts` are present, the grep prints the stub's `throw`, and `npm ls acorn` lists `acorn@8.x`. If Phase 00 left a test that asserts the stub throws (`grep -rn "not implemented: phase 02" src --include=*.test.ts`), delete that one assertion in this phase's commit; it is the stub's own test. Do not touch any other file.

- [ ] **Step 1: Write the FR-4 table test (T2–T22, one row each)**

  Create `src/lib/code-analysis/browserChecks.table.test.ts`. Each row's `expected` is the table's Expected column. Two rows need a note: T13's input also matches `prototype`, because the runtime's regex is case-insensitive and "getPrototypeOf" contains it (spec Learn correction 14), so that row lists it under `alsoMatches`. T20 also asserts `parseFailed` (the "Couldn't parse this code" note).

  ```ts file=src/lib/code-analysis/browserChecks.table.test.ts
  import { describe, expect, it } from 'vitest';
  import { runBrowserChecks } from './browserChecks';
  import type { CheckHit } from './codeAnalysis.types';

  // FR-4's table, one row per test. T1 (every generated recipe, any method or language, has no hits) is asserted
  // against generated code by phases 07, 08, 09, 13 and 19, not here.
  const blocked = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'blocked' });
  const mayBe = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'may-be-rejected' });

  type Row = {
    id: string;
    input: string;
    // The hits the spec's table lists, plus `alsoMatches`: hits the same input produces under other patterns.
    expected: readonly CheckHit[];
    alsoMatches?: readonly CheckHit[];
    parseFailed?: boolean;
  };

  const ROWS: readonly Row[] = [
    { id: 'T2', input: 'Server.Connector.Dataverse.DeleteRecord(a, b)', expected: [] },
    { id: 'T3', input: 'Server.Connector.HttpClient.DeleteAsync(u, h)', expected: [] },
    { id: 'T4', input: 'function del() {}', expected: [] },
    { id: 'T5', input: 'delete obj.x;', expected: [blocked('delete')] },
    { id: 'T6', input: '// never delete this', expected: [blocked('delete')] },
    { id: 'T7', input: 'const s = "fetch";', expected: [mayBe('fetch')] },
    { id: 'T8', input: 'fetch(url)', expected: [blocked('fetch')] },
    { id: 'T9', input: 'name.startsWith("a")', expected: [blocked('with(')] },
    { id: 'T10', input: 'getFunction(x)', expected: [blocked('Function(')] },
    { id: 'T11', input: 'const n = refs.length;', expected: [blocked('fs.')] },
    { id: 'T12', input: 'if (x) { with (o) {} }', expected: [blocked('with(')] },
    {
      id: 'T13',
      input: 'Object.getPrototypeOf(x)',
      expected: [blocked('Object.getPrototypeOf')],
      // The runtime's `prototype` regex is case-insensitive, so it also matches inside "getPrototypeOf".
      alsoMatches: [blocked('prototype')],
    },
    { id: 'T14', input: 'Server.Logger.Log("prototype")', expected: [blocked('prototype')] },
    { id: 'T15', input: `const q = "$filter=startswith(name,'a')";`, expected: [blocked('with(')] },
    { id: 'T16', input: 'import x from "y";', expected: [blocked('import from')] },
    { id: 'T17', input: 'const r = eval ("1");', expected: [blocked('eval(')] },
    { id: 'T18', input: 'const s = `${fetch(u)}`;', expected: [blocked('fetch')] },
    { id: 'T19', input: '/fetch/.test(s)', expected: [mayBe('fetch')] },
    { id: 'T20', input: 'function get( { eval(x) }', expected: [blocked('eval(')], parseFailed: true },
    { id: 'T21', input: 'list.forEach(function (k) {})', expected: [blocked('Function(')] },
    { id: 'T22', input: '// Delete after the spike', expected: [blocked('delete')] },
  ];

  function byPattern(a: CheckHit, b: CheckHit): number {
    return a.pattern < b.pattern ? -1 : a.pattern > b.pattern ? 1 : 0;
  }

  describe('FR-4 table T2 to T22', () => {
    it.each(ROWS)('$id: $input', ({ input, expected, alsoMatches, parseFailed }) => {
      const result = runBrowserChecks(input);
      expect(result.hits).toEqual([...expected, ...(alsoMatches ?? [])].sort(byPattern));
      if (parseFailed !== undefined) expect(result.parseFailed).toBe(parseFailed);
    });

    it('covers every row from T2 to T22 exactly once', () => {
      expect(ROWS.map((r) => r.id)).toEqual(Array.from({ length: 21 }, (_, i) => `T${String(i + 2)}`));
    });
  });
  ```

- [ ] **Step 2: Write the behaviour, line-number, CRLF, fallback and performance tests**

  Create `src/lib/code-analysis/browserChecks.test.ts`. It pins the 27 labels, one sample each (also upper- and lower-cased), whole-token and case rules, templates, regex versus division, the fallback, line numbers (multi-line comments and templates, CRLF, lone CR), ordering and de-duplication, and the NFR (300 ms for a 2 000-line file, plus a worst case for the `import from` regex).

  ```ts file=src/lib/code-analysis/browserChecks.test.ts
  import { describe, expect, it } from 'vitest';
  import { RESTRICTED_PATTERNS, runBrowserChecks } from './browserChecks';
  import type { CheckHit } from './codeAnalysis.types';

  const blocked = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'blocked' });
  const mayBe = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'may-be-rejected' });

  // One sample per entry of Learn's list (FR-4 Must), each chosen to match its own pattern.
  const LEARN_SAMPLES: readonly (readonly [label: string, sample: string])[] = [
    ['__dirname', 'const a = __dirname;'],
    ['__filename', 'const a = __filename;'],
    ['import(', 'const m = import ("x");'],
    ['import from', 'import { a } from "b";'],
    ['eval(', 'eval("1");'],
    ['Function(', 'const f = new Function ("return 1");'],
    ['setTimeout(', 'setTimeout (g, 1);'],
    ['setInterval(', 'setInterval (g, 1);'],
    ['setImmediate(', 'setImmediate (g);'],
    ['process.exit', 'process.exit(1);'],
    ['process.kill', 'process.kill(1);'],
    ['child_process', 'const c = "child_process";'],
    ['fs.', 'fs.readFile(p);'],
    ['require(', 'const r = require ("x");'],
    ['constructor.constructor', 'a.constructor.constructor("x");'],
    ['this.constructor', 'const c = this.constructor;'],
    ['arguments.callee', 'const c = arguments.callee;'],
    ['with(', 'with (o) {}'],
    ['delete', 'delete o.p;'],
    ['Object.getPrototypeOf', 'Object.getPrototypeOf(o);'],
    ['Object.setPrototypeOf', 'Object.setPrototypeOf(o, p);'],
    ['Proxy(', 'const p = new Proxy (a, b);'],
    ['Reflect.', 'Reflect.ownKeys(o);'],
    ['Symbol.for', 'Symbol.for("k");'],
    ['__proto__', 'const p = o.__proto__;'],
    ['prototype', 'const p = F.prototype;'],
    ['debugger', 'debugger;'],
  ];

  describe('RESTRICTED_PATTERNS', () => {
    it('lists the 27 patterns of Learn, in the spec order, with case-insensitive non-global regexes', () => {
      expect(RESTRICTED_PATTERNS.map((p) => p.label)).toEqual(LEARN_SAMPLES.map(([label]) => label));
      for (const { regex } of RESTRICTED_PATTERNS) {
        expect(regex.flags).toBe('i');
      }
    });

    it.each(LEARN_SAMPLES)('%s: a sample is Blocked under that label, ignoring case', (label, sample) => {
      for (const text of [sample, sample.toUpperCase(), sample.toLowerCase()]) {
        const found = runBrowserChecks(text).hits.filter((h) => h.pattern === label);
        expect(found, text).toEqual([blocked(label)]);
      }
    });

    it('needs a whole import statement: not "importer", and not a "from" after a semicolon', () => {
      expect(runBrowserChecks('const importer = 1;\nconst x = a from_b;').hits).toEqual([]);
      expect(runBrowserChecks('import a;\nconst from = 1;').hits.map((h) => h.pattern)).not.toContain(
        'import from',
      );
    });

    it('matches an import statement that spans lines, at the line where it starts', () => {
      const text = 'const a = 1;\nimport {\n  b,\n  c,\n} from "d";';
      expect(runBrowserChecks(text).hits).toContainEqual(blocked('import from', 2));
    });
  });

  describe('browser APIs', () => {
    it.each(['fetch', 'XMLHttpRequest', 'window', 'document', 'localStorage', 'sessionStorage'])(
      '%s: Blocked in code, may be rejected in a string, comment, regex or template text',
      (name) => {
        expect(runBrowserChecks(`${name}.go();`).hits).toEqual([blocked(name)]);
        expect(runBrowserChecks(`const s = '${name}';`).hits).toEqual([mayBe(name)]);
        expect(runBrowserChecks(`// ${name}`).hits).toEqual([mayBe(name)]);
        expect(runBrowserChecks(`/* ${name} */`).hits).toEqual([mayBe(name)]);
        expect(runBrowserChecks(`const r = /${name}/;`).hits).toEqual([mayBe(name)]);
        expect(runBrowserChecks(`const t = \`a ${name} b\`;`).hits).toEqual([mayBe(name)]);
      },
    );

    it('matches whole tokens only, and is case-sensitive', () => {
      const code = 'const a = fetchData(refetch, $fetch, fetch_, Fetch, WINDOW, windowing, mydocument);';
      expect(runBrowserChecks(code).hits).toEqual([]);
      expect(runBrowserChecks('const s = "documents refetch Document";').hits).toEqual([]);
    });

    it('treats a template interpolation as code and its quasis as strings, at any nesting depth', () => {
      const code = 'const s = `fetch ${window.x} ${`${document.y}`} tail`;';
      expect(runBrowserChecks(code).hits).toEqual([blocked('document'), mayBe('fetch'), blocked('window')]);
    });

    it('tells a regex literal from a division', () => {
      expect(runBrowserChecks('const q = a / fetch / b;').hits).toEqual([blocked('fetch')]);
      expect(runBrowserChecks('const q = /fetch/g.test(a);').hits).toEqual([mayBe('fetch')]);
    });

    it('reports both severities when a name appears as code and as text on one line', () => {
      expect(runBrowserChecks('fetch("fetch");').hits).toEqual([blocked('fetch'), mayBe('fetch')]);
    });
  });

  describe('tokenizer fallback (F23)', () => {
    it('uses raw substring matching, reports every hit as may-be-rejected and sets parseFailed', () => {
      const code = 'const s = "open;\nrefetch(window);\nconst t = 1;';
      const result = runBrowserChecks(code);
      expect(result.parseFailed).toBe(true);
      expect(result.hits).toEqual([mayBe('fetch', 2), mayBe('window', 2)]);
    });

    it.each([
      ['an unterminated template', 'const t = `abc fetch'],
      ['an unterminated regex', 'const r = /abc fetch'],
      ['an unterminated comment', '/* window'],
    ])('falls back for %s', (_name, code) => {
      const result = runBrowserChecks(code);
      expect(result.parseFailed).toBe(true);
      expect(result.hits.length).toBeGreaterThan(0);
      expect(result.hits.every((h) => h.severity === 'may-be-rejected')).toBe(true);
    });

    it('still matches restricted patterns in full when the code cannot be tokenized', () => {
      const result = runBrowserChecks('const s = "open;\neval(x);');
      expect(result.hits).toContainEqual(blocked('eval(', 2));
      expect(result.parseFailed).toBe(true);
    });

    it('keeps token-based severities when the code tokenizes but does not parse (T20 shape)', () => {
      const result = runBrowserChecks('function get( { fetch(x) }');
      expect(result.parseFailed).toBe(true);
      expect(result.hits).toEqual([blocked('fetch')]);
    });

    it('reports parseFailed false for clean code that parses', () => {
      const code = [
        'function get() {',
        '  const result = Server.Connector.Dataverse.RetrieveMultipleRecords("accounts", "$top=5");',
        '  Server.Logger.Log("ok");',
        '  return JSON.stringify({ status: "ok", data: result });',
        '}',
      ].join('\n');
      expect(runBrowserChecks(code)).toEqual({ hits: [], parseFailed: false });
      expect(runBrowserChecks('')).toEqual({ hits: [], parseFailed: false });
    });
  });

  describe('line numbers and ordering', () => {
    it('reports 1-based lines across restricted patterns and browser APIs', () => {
      const code = [
        'function get() {',
        '  const a = 1;',
        '  fetch(u); // delete me',
        '',
        '  return eval("1");',
        '}',
      ].join('\n');
      expect(runBrowserChecks(code).hits).toEqual([
        blocked('delete', 3),
        blocked('fetch', 3),
        blocked('eval(', 5),
      ]);
    });

    it('reports the line inside a multi-line block comment, string continuation and template', () => {
      const code = '/*\n * first\n * window here\n */\nconst t = `a\nb ${document.x}\nc fetch`;';
      expect(runBrowserChecks(code).hits).toEqual([
        mayBe('window', 3),
        blocked('document', 6),
        mayBe('fetch', 7),
      ]);
    });

    it('gives CRLF input the same lines as LF input', () => {
      const lf = 'a();\nfetch(u);\n\nwith (o) {}\n// Delete it\n';
      const crlf = lf.replaceAll('\n', '\r\n');
      expect(runBrowserChecks(crlf)).toEqual(runBrowserChecks(lf));
      expect(runBrowserChecks(crlf).hits).toEqual([
        blocked('fetch', 2),
        blocked('with(', 4),
        blocked('delete', 5),
      ]);
    });

    it('counts a lone CR as a line break, as the tokenizer does', () => {
      expect(runBrowserChecks('a();\rfetch(u);').hits).toEqual([blocked('fetch', 2)]);
    });

    it('sorts by line, then pattern, then severity, and de-duplicates per pattern, line and severity', () => {
      const code = 'fetch(a); fetch(b); // fetch fetch\nwindow.x; with (o) {} with (p) {}';
      expect(runBrowserChecks(code).hits).toEqual([
        blocked('fetch', 1),
        mayBe('fetch', 1),
        blocked('window', 2),
        blocked('with(', 2),
      ]);
    });

    it('is deterministic', () => {
      const code = 'delete a.b; fetch(u); const s = "window"; // prototype';
      expect(runBrowserChecks(code)).toEqual(runBrowserChecks(code));
    });
  });

  describe('performance (NFR: 300 ms for a 2 000-line file)', () => {
    const lines = Array.from({ length: 2000 }, (_, i) =>
      i % 100 === 0
        ? `  const v${String(i)} = fetch(u${String(i)}); // window ${String(i)}`
        : `  const v${String(i)} = Server.Connector.Dataverse.RetrieveRecord("accounts", id${String(i)}, "$select=name"); // note ${String(i)}`,
    );
    const code = `function get() {\n${lines.join('\n')}\n}`;

    it('checks a 2 000-line file well inside the budget', () => {
      runBrowserChecks(code); // warm-up: regex compilation and JIT
      const started = performance.now();
      const result = runBrowserChecks(code);
      const elapsed = performance.now() - started;
      expect(result.hits.filter((h) => h.severity === 'blocked')).toHaveLength(20);
      expect(elapsed).toBeLessThan(300);
    });

    it('stays inside the budget when "import" is repeated on every line without a closing "from"', () => {
      const worst = Array.from({ length: 2000 }, (_, i) => `// import note ${String(i)}`).join('\n');
      runBrowserChecks(worst);
      const started = performance.now();
      runBrowserChecks(worst);
      expect(performance.now() - started).toBeLessThan(300);
    });
  });
  ```

- [ ] **Step 3: Run the tests and confirm they FAIL**

  ```bash
  npx vitest run src/lib/code-analysis/browserChecks
  ```

  Expect: FAIL. Every test that calls `runBrowserChecks` fails with `not implemented: phase 02`, and the tests that use `RESTRICTED_PATTERNS` fail because the stub doesn't export it. Only "covers every row from T2 to T22 exactly once" passes. If any other test passes, the stub is not the one this plan assumes: stop and check Step 0.

- [ ] **Step 4: Implement `browserChecks.ts`**

  Replace the whole file. The design in brief:

  - `RESTRICTED_PATTERNS` holds the 27 labels with the regex forms of FR-4 (`name\s*\(` for patterns ending in `(`, `delete\s+[a-zA-Z_$]`, an `import … from` regex limited to one statement, and literal text with `.` escaped). The matcher builds a global copy of each regex and scans the raw text, so a file that doesn't parse is still checked in full.
  - The tokenizer pass (`tokenHits`) reports a `name` token equal to a browser API as Blocked. It scans each string, regex-literal, template-text and comment region for the whole-token name and reports those as May be rejected. Template interpolations arrive as ordinary name tokens, so they are code (T18).
  - If the tokenizer throws, `substringHits` reports every case-sensitive substring occurrence as May be rejected and `parseFailed` is `true`. If tokenizing works, `parses` also asks acorn to parse the text as a 2023 script. T20 (`function get( { eval(x) }`) tokenizes fine but doesn't parse, and the spec wants "Couldn't parse this code" for it, so a parse failure sets `parseFailed` too while keeping the token-based severities.
  - Offsets become 1-based lines through one line-start table, so a hit inside a multi-line comment or template reports its own line.

  ```ts file=src/lib/code-analysis/browserChecks.ts
  import { parse, tokenizer, tokTypes } from 'acorn';
  import type { BrowserCheckResult, CheckHit, CheckSeverity } from './codeAnalysis.types';

  const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** `name`, optional whitespace, then `(`: the runtime's form for every pattern ending in `(`. */
  const call = (name: string): RegExp => new RegExp(`${name}\\s*\\(`, 'i');
  /** The pattern's literal text, with `.` matched literally. */
  const literal = (text: string): RegExp => new RegExp(escapeRegExp(text), 'i');

  /**
   * Learn's restricted list (FR-4 Must), as the runtime matches it (Spike S4): case-insensitive regexes over
   * the raw text. Do not add the `g` flag here; the matcher builds its own global copies.
   */
  export const RESTRICTED_PATTERNS: readonly { readonly label: string; readonly regex: RegExp }[] = [
    { label: '__dirname', regex: literal('__dirname') },
    { label: '__filename', regex: literal('__filename') },
    { label: 'import(', regex: call('import') },
    // `import`, whitespace, then `from` as a word later in the same statement (no `;` in between).
    // shortcut: looks at most 2 000 characters ahead so repeated "import" text stays linear; raise it if a real import list is longer.
    { label: 'import from', regex: /import\s+[^;]{0,2000}?\s+from\b/i },
    { label: 'eval(', regex: call('eval') },
    { label: 'Function(', regex: call('Function') },
    { label: 'setTimeout(', regex: call('setTimeout') },
    { label: 'setInterval(', regex: call('setInterval') },
    { label: 'setImmediate(', regex: call('setImmediate') },
    { label: 'process.exit', regex: literal('process.exit') },
    { label: 'process.kill', regex: literal('process.kill') },
    { label: 'child_process', regex: literal('child_process') },
    { label: 'fs.', regex: literal('fs.') },
    { label: 'require(', regex: call('require') },
    { label: 'constructor.constructor', regex: literal('constructor.constructor') },
    { label: 'this.constructor', regex: literal('this.constructor') },
    { label: 'arguments.callee', regex: literal('arguments.callee') },
    { label: 'with(', regex: call('with') },
    // `DeleteRecord(` must not match: `delete` needs whitespace and then a name character.
    { label: 'delete', regex: /delete\s+[a-zA-Z_$]/i },
    { label: 'Object.getPrototypeOf', regex: literal('Object.getPrototypeOf') },
    { label: 'Object.setPrototypeOf', regex: literal('Object.setPrototypeOf') },
    { label: 'Proxy(', regex: call('Proxy') },
    { label: 'Reflect.', regex: literal('Reflect.') },
    { label: 'Symbol.for', regex: literal('Symbol.for') },
    { label: '__proto__', regex: literal('__proto__') },
    { label: 'prototype', regex: literal('prototype') },
    { label: 'debugger', regex: literal('debugger') },
  ];

  const BROWSER_APIS: readonly string[] = [
    'fetch',
    'XMLHttpRequest',
    'window',
    'document',
    'localStorage',
    'sessionStorage',
  ];
  const IDENT_CHAR = '[A-Za-z0-9_$]';
  const WHOLE_TOKEN = BROWSER_APIS.map(
    (name) => [name, new RegExp(`(?<!${IDENT_CHAR})${name}(?!${IDENT_CHAR})`, 'g')] as const,
  );

  type Found = { pattern: string; offset: number; severity: CheckSeverity };

  /** Offsets at which each line starts. Line breaks are the ones acorn uses: CRLF, CR, LF, U+2028, U+2029. */
  function lineStarts(code: string): number[] {
    const starts = [0];
    for (let i = 0; i < code.length; i++) {
      const c = code.charCodeAt(i);
      if (c === 13 && code.charCodeAt(i + 1) === 10) i++;
      else if (c !== 10 && c !== 13 && c !== 0x2028 && c !== 0x2029) continue;
      starts.push(i + 1);
    }
    return starts;
  }

  /** 1-based line of an offset (binary search). */
  function lineAt(starts: readonly number[], offset: number): number {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  function restrictedHits(code: string): Found[] {
    const found: Found[] = [];
    for (const { label, regex } of RESTRICTED_PATTERNS) {
      const re = new RegExp(regex.source, 'gi');
      // No pattern matches the empty string, so the loop always advances.
      for (let m = re.exec(code); m; m = re.exec(code)) {
        found.push({ pattern: label, offset: m.index, severity: 'blocked' });
      }
    }
    return found;
  }

  /** Whole-token names inside one string, comment, regex or template chunk: every hit may be rejected. */
  function textHits(code: string, start: number, end: number): Found[] {
    const text = code.slice(start, end);
    const found: Found[] = [];
    for (const [name, re] of WHOLE_TOKEN) {
      for (const m of text.matchAll(re)) {
        found.push({ pattern: name, offset: start + m.index, severity: 'may-be-rejected' });
      }
    }
    return found;
  }

  /** Classifies with acorn's tokenizer. Throws when the code can't be tokenized (the caller falls back). */
  function tokenHits(code: string): Found[] {
    const found: Found[] = [];
    const regions: { start: number; end: number }[] = [];
    const tokens = tokenizer(code, {
      ecmaVersion: 2023,
      onComment: (_isBlock, _text, start, end) => regions.push({ start, end }),
    });
    for (const t of tokens) {
      if (t.type === tokTypes.name) {
        // shortcut: raw token text, so an identifier written with \u escapes isn't matched; upgrade if that matters.
        const name = code.slice(t.start, t.end);
        if (BROWSER_APIS.includes(name)) found.push({ pattern: name, offset: t.start, severity: 'blocked' });
      } else if (t.type === tokTypes.string || t.type === tokTypes.regexp || t.type === tokTypes.template) {
        regions.push({ start: t.start, end: t.end });
      }
    }
    for (const r of regions) found.push(...textHits(code, r.start, r.end));
    return found;
  }

  /** F23 fallback: raw, case-sensitive substring matching; every hit may be rejected. */
  function substringHits(code: string): Found[] {
    const found: Found[] = [];
    for (const name of BROWSER_APIS) {
      for (let i = code.indexOf(name); i !== -1; i = code.indexOf(name, i + name.length)) {
        found.push({ pattern: name, offset: i, severity: 'may-be-rejected' });
      }
    }
    return found;
  }

  /** Only asks whether the code is valid ECMAScript 2023; the parse error carries no extra signal here. */
  function parses(code: string): boolean {
    try {
      parse(code, { ecmaVersion: 2023, sourceType: 'script' });
      return true;
    } catch {
      return false;
    }
  }

  const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

  export function runBrowserChecks(code: string): BrowserCheckResult {
    let browser: Found[];
    let parseFailed: boolean;
    try {
      browser = tokenHits(code);
      parseFailed = !parses(code);
    } catch {
      // Tokenizing failed (unterminated string, template or regex, bad character): fall back, and never pass.
      browser = substringHits(code);
      parseFailed = true;
    }
    const starts = lineStarts(code);
    const unique = new Map<string, CheckHit>();
    for (const { pattern, offset, severity } of [...restrictedHits(code), ...browser]) {
      const line = lineAt(starts, offset);
      unique.set(`${pattern}|${String(line)}|${severity}`, { pattern, line, severity });
    }
    const hits = [...unique.values()].sort(
      (a, b) => a.line - b.line || compare(a.pattern, b.pattern) || compare(a.severity, b.severity),
    );
    return { hits, parseFailed };
  }
  ```

- [ ] **Step 5: Run the tests and confirm they PASS**

  ```bash
  npx vitest run src/lib/code-analysis/browserChecks
  ```

  Expect: PASS, 2 test files and 77 tests (22 in `browserChecks.table.test.ts`, 55 in `browserChecks.test.ts`). The two performance tests finish well under 300 ms (about 50 ms and 30 ms on a developer machine). If a table row fails, fix the implementation, never the row: the rows are the spec.

- [ ] **Step 6: Typecheck, lint and format**

  ```bash
  npx prettier --write src/lib/code-analysis/browserChecks.ts src/lib/code-analysis/browserChecks.test.ts src/lib/code-analysis/browserChecks.table.test.ts
  npx tsc -b
  npx eslint src/lib/code-analysis --max-warnings=0
  npx prettier --check .
  ```

  Expect: all four succeed with no output other than Prettier's "All matched files use Prettier code style!". If ESLint reports a rule, fix the code at that line (for example wrap a number in `String(...)` for `restrict-template-expressions`). Do not add `eslint-disable` or `@ts-ignore`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/lib/code-analysis/browserChecks.ts src/lib/code-analysis/browserChecks.test.ts src/lib/code-analysis/browserChecks.table.test.ts
  git commit -m "feat(code-analysis): add restricted-pattern and browser-API checks"
  ```

  If Step 0 found a stub test to delete, add that file to the `git add`. Do not commit anything else.

---

## Phase verification

- [ ] `npx vitest run src/lib/code-analysis/browserChecks` passes: 77 tests, including every FR-4 row T2–T22 (one `it.each` case each, plus the coverage check that names T2…T22 once).
- [ ] The gate set passes: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run`.
- [ ] The module stays pure: `grep -n "^import" src/lib/code-analysis/browserChecks.ts` lists only `acorn` and `./codeAnalysis.types`.
- [ ] Only this phase's files changed: `git show --stat HEAD` lists `browserChecks.ts` and the two test files (plus a stub test, if Step 0 removed one).
- [ ] The label list is the Learn list: the first test in `browserChecks.test.ts` compares `RESTRICTED_PATTERNS` labels with the 27 FR-4 Must entries in order.
- [ ] The hand-off to T1 is recorded: no test here asserts "zero hits for generated code". Phases 07, 08, 09, 13 and 19 each import `runBrowserChecks` and assert `{ hits: [], parseFailed: false }` for their output.

## Done when

- `runBrowserChecks(code)` returns Blocked hits for all 27 restricted patterns (any case, any place in the text, including comments, strings and inside longer identifiers) and for browser APIs in code, May be rejected hits for browser APIs in comments, strings, regex literals and template text, and falls back to substring matching with `parseFailed: true` when tokenizing fails.
- T2–T22 each pass as a table row exactly as the spec states them, with the T13 side hit and the T20 `parseFailed` flag documented in the test.
- Line numbers are correct for multi-line comments and templates, and CRLF input gives the same hits as LF input.
- A 2 000-line file checks in under 300 ms (NFR), and a worst case for the `import from` regex does too.
- `tsc -b`, ESLint with zero warnings, Prettier and the whole Vitest suite pass, and the commit contains only this phase's files.
