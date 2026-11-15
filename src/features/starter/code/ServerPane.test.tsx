// @vitest-environment jsdom
import { undo } from '@codemirror/commands';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STARTER_DEPS } from '@/session/starterDeps';
import { generateHandler } from '@/services/generators/handlers';
import { editorView, renderStarter } from '@/test/starterTestHarness';
import { ServerPane } from './ServerPane';

const serverText = (): string => editorView('Server code').state.doc.toString();
const linesWith = (cls: string): number[] =>
  Array.from(document.querySelectorAll('.cm-line')).flatMap((line, index) =>
    line.classList.contains(cls) ? [index + 1] : [],
  );

// A CodeMirror change made the way a keystroke makes it; act() flushes the session update it causes.
function typeAtStart(text: string): void {
  act(() => {
    editorView('Server code').dispatch({
      changes: { from: 0, insert: text },
      userEvent: 'input.type',
    });
  });
}

describe('ServerPane', () => {
  it('shows <slug>.js, the Server pill, the session text and the footer (AC-4.2, AC-2.4, AC-4.10)', () => {
    const h = renderStarter(<ServerPane />, { deps: STARTER_DEPS });
    const pane = screen.getByRole('region', { name: 'Server handler' });
    expect(pane).toHaveTextContent('customer-summary.js');
    expect(within(pane).getByText('customer-summary.js')).toHaveAttribute('title', 'customer-summary.js');
    expect(within(pane).getByText('Server')).toHaveClass('ui-pill--server');
    expect(pane).toHaveTextContent("Runs on Power Pages with the caller's permissions");
    expect(serverText()).toBe(h.session().state.serverText);
    h.dispatch({ type: 'setName', name: 'Orders' });
    expect(pane).toHaveTextContent('orders.js');
  });

  it("highlights the recipe's data-access lines and keeps them on their code through edits (AC-4.2)", () => {
    const h = renderStarter(<ServerPane />, { deps: STARTER_DEPS });
    const r1 = [...generateHandler('R1').highlightLines];
    expect(r1.length).toBeGreaterThan(0);
    expect(linesWith('ui-code-highlight')).toEqual(r1);
    typeAtStart('// mine\n');
    expect(linesWith('ui-code-highlight')).toEqual(r1.map((n) => n + 1));
    h.dispatch({ type: 'selectRecipe', recipe: 'R2' });
    expect(linesWith('ui-code-highlight')).toEqual([...generateHandler('R2').highlightLines]);

    // Start over on the same recipe brings back a highlight whose line was deleted.
    h.dispatch({ type: 'selectRecipe', recipe: 'R1' });
    const doc = editorView('Server code').state.doc;
    const first = doc.line(r1[0] ?? 1);
    act(() => {
      editorView('Server code').dispatch({
        changes: { from: first.from, to: Math.min(first.to + 1, doc.length) },
        userEvent: 'delete',
      });
    });
    expect(linesWith('ui-code-highlight')).toEqual(r1.slice(1).map((n) => n - 1));
    h.dispatch({ type: 'startOver' });
    expect(linesWith('ui-code-highlight')).toEqual(r1);
  });

  it('sends edits to the session, which re-runs the browser checks and flags the line (AC-4.3, AC-5.2)', () => {
    const h = renderStarter(<ServerPane />);
    typeAtStart('eval("x");\n');
    expect(h.session().state.serverText.startsWith('eval("x");\n')).toBe(true);
    expect(h.session().derived.readiness.browser).toBe(false);
    expect(linesWith('starter-code__flag')).toEqual([1]);
    expect(screen.getByRole('list', { name: 'Browser check findings' })).toHaveTextContent(
      'Line 1: eval( (Blocked)',
    );
  });

  it('keeps edits across name changes and replaces them on a recipe change (AC-4.1, AC-4.3)', () => {
    const h = renderStarter(<ServerPane />);
    typeAtStart('// mine\n');
    h.dispatch({ type: 'setName', name: 'Orders' });
    expect(serverText().startsWith('// mine\n')).toBe(true);
    h.dispatch({ type: 'selectRecipe', recipe: 'R2' });
    expect(serverText()).toBe(h.session().state.generatedText);
  });

  it('takes a Server Objects insert as one undo step and moves the cursor (AC-6.8)', () => {
    const h = renderStarter(<ServerPane />, { deps: STARTER_DEPS });
    const before = h.session().state.serverText;
    const r1 = [...generateHandler('R1').highlightLines];
    expect(linesWith('ui-code-highlight')).toEqual(r1);
    h.dispatch({
      type: 'applyChanges',
      changes: [{ from: 0, to: 0, insert: 'const x = 1;\n' }],
      cursor: 13,
    });
    const view = editorView('Server code');
    expect(serverText()).toBe(`const x = 1;\n${before}`);
    expect(view.state.selection.main.head).toBe(13);
    expect(linesWith('ui-code-highlight')).toEqual(r1.map((n) => n + 1));
    act(() => {
      undo(view);
    });
    expect(h.session().state.serverText).toBe(before);
  });

  it('records cursor moves for Server Objects inserts', () => {
    const h = renderStarter(<ServerPane />);
    act(() => {
      editorView('Server code').dispatch({ selection: { anchor: 4 } });
    });
    expect(h.session().state.cursor).toBe(4);
  });

  it('shows the Liquid note when Liquid is selected (AC-4.7)', () => {
    const h = renderStarter(<ServerPane />);
    expect(screen.queryByText(/Liquid invocation needs no token/)).toBeNull();
    h.dispatch({ type: 'setLanguage', language: 'liquid' });
    expect(
      screen.getByText(
        'Liquid invocation needs no token and reads Server.Context.Input rather than Body or QueryParameters. Long operations cause delayed rendering.',
      ),
    ).toBeInTheDocument();
  });
});
