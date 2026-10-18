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

function expectOk(
  result: InsertResult,
  code: string,
): { changes: readonly TextChange[]; text: string } {
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

  const BODY = lines(
    'function get() {',
    '  const a = 1;',
    '  const b = 2;',
    '  return a + b;',
    '}',
  );
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
      lines(
        'function get() {',
        '  a(); // note',
        '  Server.Logger.Log("hello");',
        '  return 1;',
        '}',
      ),
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
    [
      'inside a switch case',
      'function get() {\n  switch (k) {\n    case 1:\n      §run();\n  }\n}',
    ],
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
      lines(
        'function get() {',
        '  const a = 1;',
        '  doIt(a);',
        '  Server.Logger.Log("hello");',
        '}',
      ),
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
    const code = lines(
      'function get() {',
      '  return 1;',
      '}',
      'function get() {',
      '  return 2;',
      '}',
    );
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
    expect(planInsertion('function get( {', SAMPLE, null, 'get')).toEqual({
      ok: false,
      reason: 'no-target',
    });
    expect(planInsertion('function get( {', SAMPLE, 14, 'get')).toEqual({
      ok: false,
      reason: 'no-target',
    });
    expect(planInsertion('const s = "open', SAMPLE, null, 'get')).toEqual({
      ok: false,
      reason: 'no-target',
    });
  });

  it('is no-target when the code has no function to insert into, even with a cursor', () => {
    expect(planInsertion('', SAMPLE, null, 'get')).toEqual({ ok: false, reason: 'no-target' });
    expect(planInsertion('', SAMPLE, 0, 'get')).toEqual({ ok: false, reason: 'no-target' });
    expect(planInsertion('const a = 1;', SAMPLE, 6, 'get')).toEqual({
      ok: false,
      reason: 'no-target',
    });
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
    expect(result.text).toBe(
      lines('async function get() {', `  ${AWAIT_SAMPLE}`, '  return "{}";', '}'),
    );
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
    expect(planInsertion(code, AWAIT_SAMPLE, cursor, 'get')).toEqual({
      ok: false,
      reason: 'breaks-code',
    });
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
    [
      'a sample that is not a statement',
      'const = ;',
      lines('function get() {', '  return 1;', '}'),
    ],
    [
      'a sample with an unbalanced brace',
      'if (a) {',
      lines('function get() {', '  return 1;', '}'),
    ],
    ['a sample that closes the function', '}', lines('function get() {', '  return 1;', '}')],
  ])('%s is breaks-code, with and without a cursor', (_name, sample, code) => {
    expect(planInsertion(code, sample, null, 'get')).toEqual({ ok: false, reason: 'breaks-code' });
    const cursor = code.indexOf('  return');
    expect(planInsertion(code, sample, cursor, 'get')).toEqual({
      ok: false,
      reason: 'breaks-code',
    });
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
      lines(
        'function get() {',
        '  if (ok) {',
        '    Server.Logger.Log("hello");',
        '  }',
        '  return 1;',
        '}',
      ),
    );
  });
});
