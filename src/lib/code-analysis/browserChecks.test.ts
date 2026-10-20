import { describe, expect, it } from 'vitest';
import { RESTRICTED_PATTERNS, runBrowserChecks } from './browserChecks';
import type { CheckHit } from './codeAnalysis.types';

const blocked = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'blocked' });
const mayBe = (pattern: string, line = 1): CheckHit => ({
  pattern,
  line,
  severity: 'may-be-rejected',
});

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

  it.each(LEARN_SAMPLES)(
    '%s: a sample is Blocked under that label, ignoring case',
    (label, sample) => {
      for (const text of [sample, sample.toUpperCase(), sample.toLowerCase()]) {
        const found = runBrowserChecks(text).hits.filter((h) => h.pattern === label);
        expect(found, text).toEqual([blocked(label)]);
      }
    },
  );

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
    const code =
      'const a = fetchData(refetch, $fetch, fetch_, Fetch, WINDOW, windowing, mydocument);';
    expect(runBrowserChecks(code).hits).toEqual([]);
    expect(runBrowserChecks('const s = "documents refetch Document";').hits).toEqual([]);
  });

  it('treats a template interpolation as code and its quasis as strings, at any nesting depth', () => {
    const code = 'const s = `fetch ${window.x} ${`${document.y}`} tail`;';
    expect(runBrowserChecks(code).hits).toEqual([
      blocked('document'),
      mayBe('fetch'),
      blocked('window'),
    ]);
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

  // Best of 5 runs: the full suite runs files in parallel, so a single run measures CPU contention, not the checker.
  const fastestRun = (input: string): number => {
    runBrowserChecks(input); // warm-up: regex compilation and JIT
    let best = Infinity;
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      runBrowserChecks(input);
      best = Math.min(best, performance.now() - started);
    }
    return best;
  };

  it('checks a 2 000-line file well inside the budget', () => {
    expect(runBrowserChecks(code).hits.filter((h) => h.severity === 'blocked')).toHaveLength(20);
    expect(fastestRun(code)).toBeLessThan(300);
  });

  it('stays inside the budget when "import" is repeated on every line without a closing "from"', () => {
    const worst = Array.from({ length: 2000 }, (_, i) => `// import note ${String(i)}`).join('\n');
    expect(fastestRun(worst)).toBeLessThan(300);
  });
});
