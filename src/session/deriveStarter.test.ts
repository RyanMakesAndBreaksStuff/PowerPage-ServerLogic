import { describe, expect, it } from 'vitest';
import type { StarterState } from '@/types/starter';
import { deriveStarter } from '@/session/deriveStarter';
import { FAKE_STARTER_DEPS } from '@/session/fakeStarterDeps';
import { createStarterReducer, initialStarterState } from '@/session/starterReducer';

const reduce = createStarterReducer(FAKE_STARTER_DEPS);
const start = (): StarterState => initialStarterState(FAKE_STARTER_DEPS);
const derive = (state: StarterState) => deriveStarter(state, FAKE_STARTER_DEPS);

describe('deriveStarter', () => {
  it('slugifies the name (AC-2.2) and reports when it differs', () => {
    const d = derive(reduce(start(), { type: 'setName', name: 'Customer Summary!' }));
    expect(d.slug).toBe('customer-summary');
    expect(d.slugDiffers).toBe(true);
    expect(derive(start()).slugDiffers).toBe(false);
  });

  it('maps the method to Learn function names (AC-2.6) and uses getSummary for R8', () => {
    const r4 = reduce(start(), { type: 'selectRecipe', recipe: 'R4' });
    expect(derive(r4).fn).toBe('get');
    expect(derive(reduce(r4, { type: 'setMethod', method: 'DELETE' })).fn).toBe('del');
    expect(derive(reduce(start(), { type: 'selectRecipe', recipe: 'R8' })).fn).toBe('getSummary');
  });

  it('reports edits against the generated text, and clears it when the text is restored (AC-2.9)', () => {
    const edited = reduce(start(), { type: 'editServer', text: 'x', cursor: null });
    expect(derive(edited).edited).toBe(true);
    const restored = reduce(edited, {
      type: 'editServer',
      text: start().generatedText,
      cursor: null,
    });
    expect(derive(restored).edited).toBe(false);
  });

  it('marks Browser checks complete only with no hits and a successful parse (AC-5.2)', () => {
    expect(derive(start()).readiness.browser).toBe(true);
    const blocked = reduce(start(), {
      type: 'editServer',
      text: 'function get() { return eval("1"); }',
      cursor: null,
    });
    expect(derive(blocked).checks.hits.length).toBeGreaterThan(0);
    expect(derive(blocked).readiness.browser).toBe(false);
    const unparsable = reduce(start(), {
      type: 'editServer',
      text: 'function get( {',
      cursor: null,
    });
    expect(derive(unparsable).checks.parseFailed).toBe(true);
    expect(derive(unparsable).readiness.browser).toBe(false);
  });

  it('keeps Validation complete, even after edits (AC-5.3)', () => {
    expect(
      derive(reduce(start(), { type: 'editServer', text: 'x', cursor: null })).readiness.validation,
    ).toBe(true);
  });

  it('marks Permissions reviewed only while the text equals the reviewed text (AC-5.4)', () => {
    const marked = reduce(start(), { type: 'markReviewed' });
    expect(derive(marked).readiness.permissions).toBe(true);
    const edited = reduce(marked, { type: 'editServer', text: 'x', cursor: null });
    expect(derive(edited).readiness.permissions).toBe(false);
    const back = reduce(edited, { type: 'editServer', text: marked.serverText, cursor: null });
    expect(derive(back).readiness.permissions).toBe(true);
  });

  it('counts K of 3 (AC-5.1)', () => {
    expect(derive(start()).ready).toBe(2);
    expect(derive(reduce(start(), { type: 'markReviewed' })).ready).toBe(3);
    const blocked = reduce(start(), { type: 'editServer', text: 'eval("1");', cursor: null });
    expect(derive(blocked).ready).toBe(1);
  });

  it('evaluates the Liquid rule and the used members on the current text (AC-4.7, FR-6)', () => {
    expect(derive(start()).liquidAllowed).toBe(true);
    const body = reduce(start(), {
      type: 'editServer',
      text: 'const b = Server.Context.Body;',
      cursor: null,
    });
    expect(derive(body).liquidAllowed).toBe(false);
    expect(derive(body).usedMembers.get('Server.Context')).toEqual(['Body']);
  });
});
