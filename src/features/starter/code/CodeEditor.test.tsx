// @vitest-environment jsdom
import { undo } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CodeEditorProps } from './CodeEditor';
import { CodeEditor } from './CodeEditor';

const TEXT = 'function get() {\n  return 1;\n}';

function mount(props: Partial<CodeEditorProps> = {}, readOnly = false) {
  const onEdit = vi.fn();
  const onCursor = vi.fn();
  const all: CodeEditorProps = {
    label: 'Server code',
    value: TEXT,
    syntax: 'javascript',
    ...(readOnly ? {} : { onEdit }),
    onCursor,
    ...props,
  };
  const { rerender } = render(<CodeEditor {...all} />);
  const content = screen.getByRole('textbox', { name: all.label });
  const view = EditorView.findFromDOM(content);
  if (view === null) throw new Error('no editor');
  return {
    content,
    view,
    ...(readOnly ? {} : { onEdit }),
    onCursor,
    update: (next: Partial<CodeEditorProps>) => {
      rerender(<CodeEditor {...all} {...next} />);
    },
  };
}

const lines = (): Element[] => Array.from(document.querySelectorAll('.cm-line'));

describe('CodeEditor', () => {
  it('shows the text with line numbers outside the text (AC-4.9 plain text)', () => {
    const { view } = mount();
    expect(lines().map((l) => l.textContent)).toEqual(['function get() {', '  return 1;', '}']);
    expect(document.querySelector('.cm-gutters')).toHaveTextContent('123');
    expect(view.state.doc.toString()).toBe(TEXT);
  });

  it('reports typing with the cursor (AC-4.3)', async () => {
    const user = userEvent.setup();
    const { content, onEdit } = mount();
    content.focus();
    await user.keyboard('X');
    expect(onEdit).toHaveBeenLastCalledWith(`X${TEXT}`, 1);
  });

  it('keeps an LF-only model: pasted CRLF and CR become LF (AC-4.10)', () => {
    const { view, onEdit } = mount();
    view.dispatch({
      changes: { from: 0, insert: 'a\r\nb\rc\n' },
      selection: { anchor: 6 },
      userEvent: 'input.paste',
    });
    expect(view.state.doc.toString()).toBe(`a\nb\nc\n${TEXT}`);
    expect(onEdit).toHaveBeenLastCalledWith(`a\nb\nc\n${TEXT}`, 6);
  });

  it('takes an outside change as one undo step and does not report it back', () => {
    const { view, onEdit, update } = mount();
    update({ value: `// inserted\n${TEXT}`, cursor: 12 });
    expect(view.state.doc.toString()).toBe(`// inserted\n${TEXT}`);
    expect(view.state.selection.main.head).toBe(12);
    expect(onEdit).not.toHaveBeenCalled();
    undo(view);
    expect(view.state.doc.toString()).toBe(TEXT);
    expect(onEdit).toHaveBeenLastCalledWith(TEXT, expect.any(Number));
  });

  it('reports cursor moves on their own (Server Objects insert target)', () => {
    const { view, onCursor, onEdit } = mount();
    view.dispatch({ selection: { anchor: 5 } });
    expect(onCursor).toHaveBeenLastCalledWith(5);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('marks highlighted and flagged lines and follows prop changes (AC-4.2, AC-5.2)', () => {
    const { update } = mount({ highlightLines: [2], flagLines: [3] });
    expect(lines().map((l) => l.className.includes('ui-code-highlight'))).toEqual([
      false,
      true,
      false,
    ]);
    expect(lines().map((l) => l.className.includes('starter-code__flag'))).toEqual([
      false,
      false,
      true,
    ]);
    update({ highlightLines: [], flagLines: [1] });
    expect(document.querySelectorAll('.ui-code-highlight')).toHaveLength(0);
    expect(lines()[0]).toHaveClass('starter-code__flag');
  });

  describe('highlights follow their code through edits (AC-4.2)', () => {
    const highlighted = (): number[] =>
      lines().flatMap((line, index) => (line.classList.contains('ui-code-highlight') ? [index + 1] : []));
    // An edit made the way a keystroke makes it, then the session's echo with highlightLines null.
    function edit(
      editor: ReturnType<typeof mount>,
      changes: { from: number; to?: number; insert?: string },
    ): void {
      editor.view.dispatch({ changes, userEvent: 'input' });
      editor.update({ value: editor.view.state.doc.toString(), highlightLines: null });
    }

    it('moves a highlight down one when a line is typed above it', () => {
      const editor = mount({ highlightLines: [2] });
      edit(editor, { from: 0, insert: '// mine\n' });
      expect(highlighted()).toEqual([3]);
      expect(lines()[2]).toHaveTextContent('return 1;');
    });

    it('drops the highlight of a deleted line rather than moving it to a neighbour', () => {
      const line2 = (e: ReturnType<typeof mount>) => e.view.state.doc.line(2);
      // Deleted from its start through its line break (the next line moves up into its place).
      const forward = mount({ highlightLines: [2] });
      edit(forward, { from: line2(forward).from, to: line2(forward).to + 1 });
      expect(forward.view.state.doc.toString()).toBe('function get() {\n}');
      expect(highlighted()).toEqual([]);
      forward.update({ value: TEXT, highlightLines: [2] });
      expect(highlighted()).toEqual([2]);
      // Deleted from the line break before it through its end.
      edit(forward, { from: line2(forward).from - 1, to: line2(forward).to });
      expect(highlighted()).toEqual([]);
    });

    it('keeps the highlight on the merged line when two lines are joined', () => {
      const editor = mount({ highlightLines: [2] });
      const line2 = editor.view.state.doc.line(2);
      // Backspace at the start of the highlighted line joins it to the line above.
      edit(editor, { from: line2.from - 1, to: line2.from });
      expect(lines().map((l) => l.textContent)).toEqual(['function get() {  return 1;', '}']);
      expect(highlighted()).toEqual([1]);
      // Delete at its end joins the next line onto it.
      const line1 = editor.view.state.doc.line(1);
      edit(editor, { from: line1.to, to: line1.to + 1 });
      expect(highlighted()).toEqual([1]);
    });

    it('does not spill onto the next line when a split line loses its second half', () => {
      const editor = mount({ highlightLines: [2] });
      const line2 = editor.view.state.doc.line(2);
      // Enter inside the highlighted line: both halves carry its code.
      edit(editor, { from: line2.from + 4, insert: '\n' });
      expect(highlighted()).toEqual([2, 3]);
      // Deleting the second half's text leaves an empty line that is not part of the highlighted code.
      const line3 = editor.view.state.doc.line(3);
      edit(editor, { from: line3.from, to: line3.to });
      expect(lines().map((l) => l.textContent)).toEqual(['function get() {', '  re', '', '}']);
      expect(highlighted()).toEqual([2]);
    });

    it('moves highlights with an outside insert (Server Objects) and resets them on a new text', () => {
      const { update } = mount({ highlightLines: [2] });
      update({ value: `const x = 1;\n${TEXT}`, cursor: 13, highlightLines: null });
      expect(highlighted()).toEqual([3]);
      // A replaced text with its own lines takes those lines; the old ones are not carried over.
      update({ value: `// recipe\n${TEXT}`, cursor: null, highlightLines: [1] });
      expect(highlighted()).toEqual([1]);
    });
  });

  it('lets Esc then Tab leave the editor; plain Tab indents (F48)', () => {
    const { content } = mount();
    content.focus();
    // fireEvent returns false when CodeMirror handled the key (preventDefault), true when the browser moves focus.
    expect(fireEvent.keyDown(content, { key: 'Tab', keyCode: 9 })).toBe(false);
    fireEvent.keyDown(content, { key: 'Escape', keyCode: 27 });
    expect(fireEvent.keyDown(content, { key: 'Tab', keyCode: 9 })).toBe(true);
  });

  it('is read-only without onEdit, and stays focusable for screen readers', () => {
    const { content, view } = mount({ label: 'Client call code' }, true);
    expect(content).toHaveAttribute('aria-readonly', 'true');
    expect(view.state.readOnly).toBe(true);
    expect(fireEvent.keyDown(content, { key: 'Tab', keyCode: 9 })).toBe(true);
  });
});
