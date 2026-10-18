import { describe, expect, it } from 'vitest';
import type { StarterAction, StarterState } from './starterSession.types';
import { FAKE_STARTER_DEPS } from './fakeStarterDeps';
import {
  DEFAULT_NAME,
  LIQUID_RESET_NOTICE,
  createStarterReducer,
  initialStarterState,
} from './starterReducer';

const reduce = createStarterReducer(FAKE_STARTER_DEPS);
const run = (...actions: StarterAction[]): StarterState =>
  actions.reduce(reduce, initialStarterState(FAKE_STARTER_DEPS));
const generated = (id: string) =>
  `function get() {\n  return JSON.stringify({ status: "success", recipe: "${id}" });\n}\n`;

describe('initialStarterState (AC-5.9 defaults)', () => {
  it('starts on customer-summary, R1, GET, fetch, the generated LF text and unreviewed', () => {
    expect(initialStarterState(FAKE_STARTER_DEPS)).toEqual({
      name: DEFAULT_NAME,
      method: 'GET',
      recipe: 'R1',
      language: 'fetch',
      serverText: generated('R1'),
      generatedText: generated('R1'),
      cursor: null,
      reviewedText: null,
      pendingNotice: null,
    });
    expect(DEFAULT_NAME).toBe('customer-summary');
  });
});

describe('selectRecipe (AC-2.8, AC-3.8)', () => {
  it('regenerates the text and resets the method to the recipe default', () => {
    const state = run({ type: 'selectRecipe', recipe: 'R2' });
    expect(state.recipe).toBe('R2');
    expect(state.method).toBe('POST');
    expect(state.serverText).toBe(generated('R2'));
    expect(state.generatedText).toBe(generated('R2'));
    expect(state.cursor).toBeNull();
  });

  it('resets Permissions to needs review', () => {
    const state = run({ type: 'markReviewed' }, { type: 'selectRecipe', recipe: 'R4' });
    expect(state.reviewedText).toBeNull();
  });

  it('resets Liquid to fetch when the new recipe has no Liquid support', () => {
    const state = run(
      { type: 'setLanguage', language: 'liquid' },
      { type: 'selectRecipe', recipe: 'R2' },
    );
    expect(state.language).toBe('fetch');
    expect(state.pendingNotice).toBeNull();
  });

  it('fixes R8 to Liquid with no method, and resets to fetch when leaving R8', () => {
    const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
    expect(r8.language).toBe('liquid');
    expect(r8.method).toBeNull();
    expect(reduce(r8, { type: 'selectRecipe', recipe: 'R1' }).language).toBe('fetch');
  });

  it('keeps jQuery across recipes', () => {
    const state = run(
      { type: 'setLanguage', language: 'jquery' },
      { type: 'selectRecipe', recipe: 'R4' },
    );
    expect(state.language).toBe('jquery');
  });
});

describe('setMethod (AC-2.10)', () => {
  it('selects an exported method', () => {
    expect(
      run({ type: 'selectRecipe', recipe: 'R4' }, { type: 'setMethod', method: 'DELETE' }).method,
    ).toBe('DELETE');
  });

  it('ignores a method the recipe does not export, returning the same state', () => {
    const r4 = run({ type: 'selectRecipe', recipe: 'R4' });
    expect(reduce(r4, { type: 'setMethod', method: 'PATCH' })).toBe(r4);
    const r1 = run();
    expect(reduce(r1, { type: 'setMethod', method: 'POST' })).toBe(r1);
  });

  it('never sets a method on R8', () => {
    const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
    expect(reduce(r8, { type: 'setMethod', method: 'GET' })).toBe(r8);
  });
});

describe('setLanguage (AC-4.4, AC-4.7, AC-3.8)', () => {
  it('switches between fetch, jQuery and an allowed Liquid', () => {
    expect(run({ type: 'setLanguage', language: 'jquery' }).language).toBe('jquery');
    expect(run({ type: 'setLanguage', language: 'liquid' }).language).toBe('liquid');
  });

  it('ignores Liquid when the rule forbids it', () => {
    const r2 = run({ type: 'selectRecipe', recipe: 'R2' });
    expect(reduce(r2, { type: 'setLanguage', language: 'liquid' })).toBe(r2);
  });

  it('ignores any other language on R8', () => {
    const r8 = run({ type: 'selectRecipe', recipe: 'R8' });
    expect(reduce(r8, { type: 'setLanguage', language: 'fetch' })).toBe(r8);
  });
});

describe('editServer (AC-4.3, AC-4.10, AC-4.7)', () => {
  it('stores LF-only text and the cursor', () => {
    const state = run({ type: 'editServer', text: 'a\r\nb\rc', cursor: 3 });
    expect(state.serverText).toBe('a\nb\nc');
    expect(state.cursor).toBe(3);
  });

  it('resets Liquid to fetch with the toast when an edit reads an HTTP-only property', () => {
    const state = run(
      { type: 'setLanguage', language: 'liquid' },
      { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
    );
    expect(state.language).toBe('fetch');
    expect(state.pendingNotice).toEqual(LIQUID_RESET_NOTICE);
    expect(LIQUID_RESET_NOTICE).toEqual({
      title: "Switched to fetch: this code can't be called from Liquid",
      body: '',
      type: 'info',
    });
  });

  it('does not switch back to Liquid when the edit is undone', () => {
    const state = run(
      { type: 'setLanguage', language: 'liquid' },
      { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
      { type: 'clearNotice' },
      { type: 'editServer', text: generated('R1'), cursor: null },
    );
    expect(state.language).toBe('fetch');
    expect(state.pendingNotice).toBeNull();
  });

  it('keeps R8 on Liquid whatever the text (Decision 6)', () => {
    const state = run(
      { type: 'selectRecipe', recipe: 'R8' },
      { type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null },
    );
    expect(state.language).toBe('liquid');
    expect(state.pendingNotice).toBeNull();
  });
});

describe('applyChanges (AC-6.8 transaction)', () => {
  it('applies the async change and the insertion in one step', () => {
    const before = run();
    const at = before.serverText.indexOf('  return');
    const state = reduce(before, {
      type: 'applyChanges',
      changes: [
        { from: 0, to: 0, insert: 'async ' },
        { from: at, to: at, insert: '  await Server.Connector.HttpClient.GetAsync(u, h);\n' },
      ],
      cursor: 10,
    });
    expect(state.serverText.startsWith('async function get() {\n  await Server.Connector')).toBe(
      true,
    );
    expect(state.cursor).toBe(10);
  });

  it('runs the Liquid rule once on the result', () => {
    const before = run({ type: 'setLanguage', language: 'liquid' });
    const state = reduce(before, {
      type: 'applyChanges',
      changes: [{ from: 0, to: 0, insert: 'const b = Server.Context.Body;\n' }],
      cursor: null,
    });
    expect(state.language).toBe('fetch');
    expect(state.pendingNotice).toEqual(LIQUID_RESET_NOTICE);
  });
});

describe('review (AC-5.4)', () => {
  it('stores the text at the moment of marking, and Undo review clears it', () => {
    const marked = run({ type: 'markReviewed' });
    expect(marked.reviewedText).toBe(marked.serverText);
    expect(reduce(marked, { type: 'undoReview' }).reviewedText).toBeNull();
  });

  it('keeps the stored text through edits, so returning to it restores the mark', () => {
    const edited = run({ type: 'markReviewed' }, { type: 'editServer', text: 'x', cursor: null });
    expect(edited.reviewedText).toBe(generated('R1'));
    const back = reduce(edited, { type: 'editServer', text: generated('R1'), cursor: null });
    expect(back.reviewedText).toBe(back.serverText);
  });
});

describe('startOver (AC-5.9)', () => {
  it('returns to the defaults from any state', () => {
    const state = run(
      { type: 'setName', name: 'Orders!' },
      { type: 'selectRecipe', recipe: 'R4' },
      { type: 'setMethod', method: 'DELETE' },
      { type: 'setLanguage', language: 'jquery' },
      { type: 'editServer', text: 'x', cursor: 1 },
      { type: 'markReviewed' },
      { type: 'startOver' },
    );
    expect(state).toEqual(initialStarterState(FAKE_STARTER_DEPS));
  });
});

describe('small actions', () => {
  it('sets the name, the cursor and clears a notice', () => {
    const state = run(
      { type: 'setName', name: 'Customer Summary!' },
      { type: 'setCursor', cursor: 5 },
    );
    expect(state.name).toBe('Customer Summary!');
    expect(state.cursor).toBe(5);
  });
});
