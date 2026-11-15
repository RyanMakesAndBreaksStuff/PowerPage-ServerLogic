import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from './browserChecks';
import type { CheckHit } from './codeAnalysis.types';

// FR-4's table, one row per test. T1 (every generated recipe, any method or language, has no hits) is asserted
// against generated code by phases 07, 08, 09, 13 and 19, not here.
const blocked = (pattern: string, line = 1): CheckHit => ({ pattern, line, severity: 'blocked' });
const mayBe = (pattern: string, line = 1): CheckHit => ({
  pattern,
  line,
  severity: 'may-be-rejected',
});

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
  {
    id: 'T20',
    input: 'function get( { eval(x) }',
    expected: [blocked('eval(')],
    parseFailed: true,
  },
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
    expect(ROWS.map((r) => r.id)).toEqual(
      Array.from({ length: 21 }, (_, i) => `T${String(i + 2)}`),
    );
  });
});
