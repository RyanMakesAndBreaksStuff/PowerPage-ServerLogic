import { describe, expect, it } from 'vitest';
import { planInsertion } from '@/lib/code-analysis/structure';
import { INSERT_REASONS, cursorAfter } from './insertion';

describe('INSERT_REASONS (AC-6.8)', () => {
  it("uses the spec's tooltip text", () => {
    expect(INSERT_REASONS).toEqual({
      'no-target': 'No function to insert into; use Copy',
      'not-statement': 'Move the cursor between statements inside a function, or use Copy',
      'breaks-code': 'Inserting here would break the code; use Copy',
    });
  });
});

describe('cursorAfter (AC-6.8: the insertion point is kept)', () => {
  it('lands after the inserted sample', () => {
    const code = 'function get() {\n  return "{}";\n}\n';
    const plan = planInsertion(code, 'Server.Logger.Log("x");', null, 'get');
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.text.slice(0, cursorAfter(plan.changes))).toBe(
      'function get() {\n  Server.Logger.Log("x");\n',
    );
  });

  it('counts the async change before the sample', () => {
    const code = 'function get() {\n  return "{}";\n}\n';
    const plan = planInsertion(code, 'const r = await f();', null, 'get');
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.changes).toHaveLength(2);
    expect(plan.text.slice(0, cursorAfter(plan.changes))).toBe(
      'async function get() {\n  const r = await f();\n',
    );
  });
});
