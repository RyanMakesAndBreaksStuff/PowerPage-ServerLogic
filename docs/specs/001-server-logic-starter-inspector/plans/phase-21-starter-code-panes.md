# Phase 21: Starter Code Panes Implementation Plan

**Goal:** Fill Create Logic's code row with the request path strip, an editable CodeMirror server pane and a read-only client pane, each with Copy, so edits, highlights, line flags and the client call follow the Phase 18a session.

**Architecture:** One `CodeEditor` component wraps CodeMirror 6 for both panes; the session text stays the source of truth: the editor reports edits and cursor moves, and takes outside changes (recipe switch, Start over, Server Objects insert) as one minimal, undoable change computed by `src/lib/minimalChange.ts`. Line highlights and FR-4 flags are CodeMirror line decorations rebuilt from props through a compartment. The panes are thin session readers: `ServerPane` shows `state.serverText`, `ClientPane` shows `generateClient(...)` with the call shape Phase 14's download uses, and `RequestPathStrip` shows Phase 10's `requestPathSteps`.

**Tech stack:** React 19.2 with the Compiler (`useEffectEvent`, `useTransition`), TypeScript ~6.0 strict, CodeMirror 6 as installed by Phase 00 (`@codemirror/state` 6.7.6, `view` 6.43.14, `commands` 6.11.1, `language`, `lang-javascript`, `@lezer/highlight`), Phase 04 primitives, Phase 10 client generator, Phase 07–09 handler registry, Vitest 5 + Testing Library + user-event 14 on jsdom.

**Scope:** `plan-starter.md` Part C, wave C2. AC-4.1 (both panes update in the same render as any input change; the server text changes only with the recipe or Start over), AC-4.2 (header `<slug>.js`, `Server` pill, data-access highlights, footer), AC-4.3 (editable, browser checks re-run, edits persist), AC-4.4 (language pills, footers), AC-4.7 (Liquid pill state from Phase 18's `languageOptions`, the server-pane Liquid note), AC-4.8 (strip rendering), AC-4.9 (Copy, toasts), AC-4.10 (LF-only editor model), AC-5.2 (offending lines flagged), AC-2.4 (pane header, endpoint and client URL follow the slug), F48 (Esc then Tab leaves the editor), the cursor tracking that Server Objects' Insert needs (AC-6.8 via Phase 18a's `applyChanges`), and Phase 14 Risk 2 (the pane's client text equals the zip's client file). NFR: accessibility of both panes. **Depends on:** 04, 07, 10, 18, 18a (Phase 18 must be merged: this phase reuses its harness, `languageOptions` and page grid).

**Out of scope:** Server Objects' Insert button and its placement rules (Phase 22 dispatches `applyChanges`; this phase only shows the result and tracks the cursor). Colouring `Server.*` identifiers in the editor (no AC asks for it). The Download button (Phase 14). Any change to the session reducer or its types (Phase 18a).

---

**Baseline:** Phase 18's end state: `npx vitest run` 72 files and 1,037 tests passing from `5953503` (Phases 14 and 19 merged; Phase 17 not yet, and its test files add to every total when it lands), tsc and ESLint clean, `npx prettier --check . --end-of-line auto` clean (plain `--check .` reports CRLF files on this `core.autocrlf=true` checkout). `browserChecks.test.ts > performance` is load-sensitive and can fail once in a full parallel run; it passes when rerun.

**Verified while planning (2026-10-19):** every file in this plan was drafted at its path on top of Phase 18's drafted code and run against the repository: first on `026f7d2`, then again on `5953503` after Phases 14 and 19 merged. On `5953503`, tsc, ESLint and Prettier were clean, and two consecutive full Vitest runs passed with 78 files and 1,068 tests. Findings that shaped the plan:

1. jsdom has no `Range.getClientRects`, and CodeMirror's measure pass throws `TypeError: textRange(...).getClientRects is not a function` as an unhandled error. Task 2 polyfills it in `src/test/setup.ts`, guarded, because node-environment test files (handlers, build shape, probe) have no `Range` and 15 of them failed to load with an unguarded polyfill.
2. `@codemirror/view` 6.43.14 already implements F48: Escape arms a 2-second "tab focus mode" in which Tab is not handled, so the browser moves focus. With `indentWithTab` bound, a Tab keydown is `preventDefault`ed before Esc and not after it, which `fireEvent.keyDown` (with `keyCode` set) observes directly.
3. A CodeMirror dispatch made outside `act()` doesn't flush the session update it triggers, so pane tests wrap editor dispatches in `act()`.
4. A wall-clock 300 ms assertion fails under the parallel suite in the same way the existing FR-4 performance test does. AC-4.1 is tested structurally (same render, no debounce) and the 300 ms budget becomes a ◆ release-smoke item.

### Task 1: An outside text change becomes one minimal replacement

**Owns:** `minimalChange(before, after): TextChange | null`: the single `{ from, to, insert }` (offsets in `before`) that keeps the common prefix and suffix. One change means one CodeMirror transaction, so an outside update is one undo step (Phase 18a Decision 1) and the caret maps sensibly.

**Files:**

- Create: `src/lib/minimalChange.ts` — the prefix/suffix diff, pure.
- Signal: `src/lib/minimalChange.test.ts` — exact changes and round-trip rebuilds.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/lib/minimalChange.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { minimalChange } from './minimalChange';

describe('minimalChange', () => {
  it('returns null for equal text', () => {
    expect(minimalChange('abc', 'abc')).toBeNull();
  });

  it.each([
    [
      'insert in the middle',
      'function get() {}',
      'function get() { x; }',
      { from: 16, to: 16, insert: ' x; ' },
    ],
    ['delete at the end', 'abc;\n', 'abc', { from: 3, to: 5, insert: '' }],
    ['replace everything', 'abc', 'xyz', { from: 0, to: 3, insert: 'xyz' }],
    ['repeated characters', 'aaa', 'aaaa', { from: 3, to: 3, insert: 'a' }],
    ['from empty', '', 'abc', { from: 0, to: 0, insert: 'abc' }],
  ])('%s', (_name, before, after, change) => {
    expect(minimalChange(before, after)).toEqual(change);
  });

  it('always rebuilds the target text', () => {
    const pairs = [
      ['const a = 1;\nconst b = 2;\n', 'const a = 1;\nlet c;\nconst b = 2;\n'],
      ['x', ''],
      ['ab', 'ba'],
    ] as const;
    for (const [before, after] of pairs) {
      const change = minimalChange(before, after);
      const rebuilt =
        change === null
          ? before
          : before.slice(0, change.from) + change.insert + before.slice(change.to);
      expect(rebuilt).toBe(after);
    }
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/lib/minimalChange.test.ts`

Expected: `FAIL  src/lib/minimalChange.test.ts`, with `Error: Failed to resolve import "./minimalChange" from "src/lib/minimalChange.test.ts". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/lib/minimalChange.ts`:

```ts
import type { TextChange } from '@/lib/code-analysis/codeAnalysis.types';

/**
 * The single replacement that turns `before` into `after`, keeping their common prefix and suffix.
 * One change means one editor transaction, so an outside update is one undo step (Phase 18a Decision 1).
 */
export function minimalChange(before: string, after: string): TextChange | null {
  if (before === after) return null;
  const shorter = Math.min(before.length, after.length);
  let start = 0;
  while (start < shorter && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  return { from: start, to: endBefore, insert: after.slice(start, endAfter) };
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/lib/minimalChange.test.ts`

Expected: `Test Files  1 passed (1)` and `Tests  7 passed (7)`.

Run: `npx tsc -b && npx eslint src/lib --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/lib/minimalChange.ts src/lib/minimalChange.test.ts
git commit -m "feat(lib): add minimalChange for one-step editor syncs"
```

### Task 2: A CodeMirror editor follows the session text and keyboard rules

**Owns:** `CodeEditor` (props `label`, `value`, `syntax: 'javascript' | 'plain'`, optional `highlightLines`, `flagLines`, `cursor`, `onEdit`, `onCursor`; no `onEdit` means read-only). Behaviour: user edits report `(text, head)`; selection-only changes report `head`; prop changes arrive as one `minimalChange` transaction marked with a private annotation, so they are never reported back, and move the caret to `cursor` when one is given; the language and line decorations are reconfigured through compartments on every prop change. The editable editor binds `indentWithTab` plus `defaultKeymap` and `historyKeymap` with `history()`; F48 comes from `@codemirror/view`'s built-in tab-focus mode. The read-only editor sets `EditorState.readOnly`, binds only `defaultKeymap`, keeps `contenteditable` so it stays focusable for screen readers, and sets `aria-readonly="true"`. The LF model (AC-4.10) is CodeMirror's default: no `lineSeparator` facet, so CRLF, CR and LF split lines on load and paste and `doc.toString()` joins with LF. Recipe switches and Start over are undoable like any outside change: Ctrl+Z after them restores the old text as an ordinary edit, which the session then treats as edited. The token-based theme (`--keyword`, `--string`, `--comment`, `--code`, `--text`, `--primary`, `--font-mono`) and `lineDecorations` (classes `ui-code-highlight` from Phase 04 and `starter-code__flag`). All code-row CSS. The jsdom `Range` polyfill.

**Files:**

- Create: `src/features/starter/code/lineDecorations.ts` — line classes for highlights and flags.
- Create: `src/features/starter/code/codeTheme.ts` — CodeMirror theme and highlight style from theme tokens.
- Create: `src/features/starter/code/CodeEditor.tsx` — the CodeMirror pane.
- Create: `src/features/starter/code/codePanes.css` — code row, strip and pane styles.
- Modify: `src/test/setup.ts` — give jsdom's `Range` client rects.
- Signal: `src/features/starter/code/lineDecorations.test.ts`, `src/features/starter/code/CodeEditor.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/code/lineDecorations.test.ts`:

```ts
import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { lineDecorations } from './lineDecorations';

const DOC = Text.of(['a', 'b', 'c', 'd']);

function classOf(spec: unknown): string {
  return typeof spec === 'object' && spec !== null && 'class' in spec ? String(spec.class) : '';
}

function classesByLine(highlight: readonly number[], flags: readonly number[]): [number, string][] {
  const out: [number, string][] = [];
  const iter = lineDecorations(DOC, highlight, flags).iter();
  while (iter.value !== null) {
    out.push([DOC.lineAt(iter.from).number, classOf(iter.value.spec)]);
    iter.next();
  }
  return out;
}

describe('lineDecorations', () => {
  it('marks highlighted and flagged lines, both on one line when they meet', () => {
    expect(classesByLine([2, 3], [3, 4])).toEqual([
      [2, 'ui-code-highlight'],
      [3, 'ui-code-highlight'],
      [3, 'starter-code__flag'],
      [4, 'starter-code__flag'],
    ]);
  });

  it('skips lines outside the document and ignores order and repeats', () => {
    expect(classesByLine([9, 1, 1, 0], [])).toEqual([[1, 'ui-code-highlight']]);
  });
});
```

Create `src/features/starter/code/CodeEditor.test.tsx`:

```tsx
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

  it('takes an outside change as one undo step and does not report it back (Phase 18a Decision 1)', () => {
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
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/code`

Expected: `Test Files  2 failed (2)`, with `Error: Failed to resolve import "./lineDecorations" from "src/features/starter/code/lineDecorations.test.ts". Does the file exist?` and `Error: Failed to resolve import "./CodeEditor" from "src/features/starter/code/CodeEditor.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/code/lineDecorations.ts`:

```ts
import { RangeSetBuilder } from '@codemirror/state';
import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

const HIGHLIGHT = Decoration.line({ class: 'ui-code-highlight' });
const FLAG = Decoration.line({ class: 'starter-code__flag' });

/**
 * Line classes for 1-based line numbers: data-access highlights (AC-4.2) and FR-4 flags (AC-5.2).
 * Lines past the end of the document are skipped.
 */
export function lineDecorations(
  doc: Text,
  highlight: readonly number[],
  flags: readonly number[],
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const lines = [...new Set([...highlight, ...flags])].sort((a, b) => a - b);
  for (const n of lines) {
    if (n < 1 || n > doc.lines) continue;
    const from = doc.line(n).from;
    if (highlight.includes(n)) builder.add(from, from, HIGHLIGHT);
    if (flags.includes(n)) builder.add(from, from, FLAG);
  }
  return builder.finish();
}
```

Create `src/features/starter/code/codeTheme.ts`:

```ts
import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// Colours are theme tokens, so both themes and a live host theme change need no editor change (FR-11).
export const CODE_HIGHLIGHT = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--keyword)' },
  { tag: [tags.string, tags.regexp], color: 'var(--string)' },
  { tag: tags.comment, color: 'var(--comment)' },
]);

export const CODE_THEME = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code)', color: 'var(--text)', fontSize: '12px' },
  '&.cm-focused': { outline: '2px solid var(--primary)', outlineOffset: '-2px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--text)' },
  '.cm-gutters': { backgroundColor: 'var(--code)', color: 'var(--comment)', border: 'none' },
});
```

Create `src/features/starter/code/CodeEditor.tsx`:

```tsx
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting } from '@codemirror/language';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { ReactElement } from 'react';
import { minimalChange } from '@/lib/minimalChange';
import { CODE_HIGHLIGHT, CODE_THEME } from './codeTheme';
import { lineDecorations } from './lineDecorations';
import './codePanes.css';

export type CodeEditorProps = {
  label: string;
  value: string;
  syntax: 'javascript' | 'plain';
  highlightLines?: readonly number[];
  flagLines?: readonly number[];
  cursor?: number | null;
  /** Absent means read-only. */
  onEdit?: (text: string, cursor: number) => void;
  onCursor?: (cursor: number) => void;
};

const NO_LINES: readonly number[] = [];
const SYNTAX = new Compartment();
const LINES = new Compartment();
// Marks transactions that copy props into the editor, so they are not reported back as edits.
const FROM_PROPS = Annotation.define<boolean>();

/**
 * A CodeMirror 6 pane. The session text is the source of truth: the editor reports edits and
 * cursor moves, and takes outside changes (recipe switch, Start over, insert) as one undoable
 * change. CodeMirror splits on CRLF, CR and LF and joins with LF, so the model is LF-only (AC-4.10).
 * Esc then Tab leaves the editor (F48) through the tab-focus mode built into @codemirror/view.
 */
export function CodeEditor({
  label,
  value,
  syntax,
  highlightLines = NO_LINES,
  flagLines = NO_LINES,
  cursor = null,
  onEdit,
  onCursor,
}: CodeEditorProps): ReactElement {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnly = onEdit === undefined;

  const initial = useEffectEvent(() => ({ doc: value, label, readOnly }));
  const reportEdit = useEffectEvent((text: string, head: number) => {
    onEdit?.(text, head);
  });
  const reportCursor = useEffectEvent((head: number) => {
    onCursor?.(head);
  });

  useEffect(() => {
    const parent = parentRef.current;
    if (parent === null) return;
    const config = initial();
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: config.doc,
        extensions: [
          lineNumbers(),
          CODE_THEME,
          syntaxHighlighting(CODE_HIGHLIGHT),
          SYNTAX.of([]),
          LINES.of([]),
          EditorView.contentAttributes.of(
            config.readOnly
              ? { 'aria-label': config.label, 'aria-readonly': 'true' }
              : { 'aria-label': config.label },
          ),
          config.readOnly
            ? [EditorState.readOnly.of(true), keymap.of(defaultKeymap)]
            : [history(), keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap])],
          EditorView.updateListener.of((update) => {
            if (update.transactions.some((tr) => tr.annotation(FROM_PROPS) === true)) return;
            const head = update.state.selection.main.head;
            if (update.docChanged) reportEdit(update.state.doc.toString(), head);
            else if (update.selectionSet) reportCursor(head);
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    const change = minimalChange(view.state.doc.toString(), value);
    view.dispatch({
      ...(change === null ? {} : { changes: change }),
      ...(change !== null && cursor !== null
        ? { selection: { anchor: Math.min(cursor, value.length) } }
        : {}),
      effects: [
        SYNTAX.reconfigure(syntax === 'javascript' ? javascript() : []),
        LINES.reconfigure(
          EditorView.decorations.of((v) => lineDecorations(v.state.doc, highlightLines, flagLines)),
        ),
      ],
      annotations: FROM_PROPS.of(true),
    });
  }, [value, cursor, syntax, highlightLines, flagLines]);

  return <div ref={parentRef} className="starter-code__editor" />;
}
```

Create `src/features/starter/code/codePanes.css`:

```css
/* The code row of Create Logic (layout 10a §2, §4): request path strip, then the two panes. */

.starter-page__code {
  grid-row: 2;
  grid-column: 1 / 5;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.starter-strip {
  flex: none;
  padding: 15.5px 16px;
}

.starter-strip__steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.starter-strip__step {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--muted);
}

.starter-strip__item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.starter-strip__label {
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.starter-strip__value {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.starter-code__panes {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.starter-pane__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 51px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  white-space: nowrap;
}

.starter-pane__title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.starter-pane__spacer {
  flex: 1;
}

/* FR-11: the client-call icon is one of the few needs-review colour uses. */
.starter-pane__swap {
  display: inline-flex;
  color: var(--review);
}

.starter-code__editor {
  flex: 1;
  min-height: 0;
}

.starter-code__flag {
  box-shadow: inset 2px 0 0 var(--review);
}

.starter-pane__flags {
  flex: none;
  max-height: 72px;
  overflow-y: auto;
  margin: 0;
  padding: 6px 12px;
  border-top: 1px solid var(--border);
  list-style: none;
  color: var(--review);
  font-size: 11.5px;
}

.starter-pane__flags li {
  display: flex;
  align-items: center;
  gap: 4px;
}

.starter-pane__note,
.starter-pane__foot {
  flex: none;
  margin: 0;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 11.5px;
}
```

In `src/test/setup.ts`, after the `afterEach(() => { cleanup(); });` block, add:

```ts
// jsdom has no layout, so a Range has no client rects; CodeMirror measures text through them.
// Node-environment test files have no Range at all.
if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects = function getClientRects(): DOMRectList {
    const rects: DOMRect[] = [];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null });
  };
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/code`

Expected: `Test Files  2 passed (2)` and `Tests  10 passed (10)`, with no `Unhandled Errors` section.

Run: `npx vitest run src/services/generators/handlers tests src/probe`

Expected: every file passes (the node-environment files load with the guarded polyfill).

Run: `npx tsc -b && npx eslint src --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/code/lineDecorations.ts src/features/starter/code/lineDecorations.test.ts src/features/starter/code/codeTheme.ts src/features/starter/code/CodeEditor.tsx src/features/starter/code/CodeEditor.test.tsx src/features/starter/code/codePanes.css src/test/setup.ts
git commit -m "feat(starter): add the CodeMirror code editor with line marks and Esc-Tab exit"
```

### Task 3: Copy puts a pane's text on the clipboard with a toast

**Owns:** AC-4.9 and F49 for both panes: `CopyButton` copies the `text` prop (the normalised session or client text, never line numbers) through `host.copyText`, notifies `{ title: 'Code copied', body: '', type: 'success' }` or `{ title: "Couldn't copy", body: '', type: 'error' }`, logs only the error name, and is `busy` (disabled) while the copy runs. Each pane passes its own accessible name ("Copy server code", "Copy client call").

**Files:**

- Create: `src/features/starter/code/CopyButton.tsx` — the Copy action.
- Signal: `src/features/starter/code/CopyButton.test.tsx` — success and failure toasts through the fake host.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/code/CopyButton.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderStarter } from '../starterTestHarness';
import { CopyButton } from './CopyButton';

describe('CopyButton (AC-4.9, F49)', () => {
  it('copies the text and says "Code copied"', async () => {
    const { host, user } = renderStarter(<CopyButton text={'a\nb'} label="Copy server code" />);
    await user.click(screen.getByRole('button', { name: 'Copy server code' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: 'Code copied', body: '', type: 'success' } },
      ]);
    });
    expect(host.callsOf('copyText')).toEqual([{ method: 'copyText', text: 'a\nb' }]);
  });

  it('says "Couldn\'t copy" when the clipboard write fails, logging the error name only', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { host, user } = renderStarter(<CopyButton text="x" label="Copy server code" />, {
      host: { copy: 'reject' },
    });
    await user.click(screen.getByRole('button', { name: 'Copy server code' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: "Couldn't copy", body: '', type: 'error' } },
      ]);
    });
    expect(log).toHaveBeenCalledWith('HostCallError');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/code/CopyButton.test.tsx`

Expected: `FAIL  src/features/starter/code/CopyButton.test.tsx`, with `Error: Failed to resolve import "./CopyButton" from "src/features/starter/code/CopyButton.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/code/CopyButton.tsx`:

```tsx
import { useTransition } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

// AC-4.9, F49: copies the pane's plain text (never the line numbers) and is disabled while copying.
export function CopyButton({ text, label }: { text: string; label: string }): ReactElement {
  const host = useHost();
  const notify = useNotify();
  const [pending, startTransition] = useTransition();

  const copy = (): void => {
    startTransition(async () => {
      try {
        await host.copyText(text);
        notify({ title: 'Code copied', body: '', type: 'success' });
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.name : 'Error'); // name only: no text, no URL
        notify({ title: "Couldn't copy", body: '', type: 'error' });
      }
    });
  };

  return (
    <Button aria-label={label} busy={pending} onClick={copy}>
      <Icon name="copy" />
      Copy
    </Button>
  );
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/code/CopyButton.test.tsx`

Expected: `Test Files  1 passed (1)` and `Tests  2 passed (2)`.

Run: `npx tsc -b && npx eslint src/features/starter --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/code/CopyButton.tsx src/features/starter/code/CopyButton.test.tsx
git commit -m "feat(starter): add Copy with success and failure toasts"
```

### Task 4: The server pane edits the session handler

**Owns:** `ServerPane`: header `<slug>.js` + `Server` pill (`Pill tone="server"`) + Copy; the editable `CodeEditor` labelled "Server code" bound to `state.serverText` and `state.cursor`, dispatching `editServer` and `setCursor`; flags from `derived.checks.hits` as line classes plus a "Browser check findings" list with an `important` glyph and text (`Line N: <pattern> (Blocked | May be rejected)`, and "Couldn't parse this code" when `parseFailed`), so status is never colour alone; the AC-4.7 note `LIQUID_SERVER_NOTE` while Liquid is selected (answers Phase 10 open question 2: Phase 21 renders it); footer "Runs on Power Pages with the caller's permissions". Highlights are `generateHandler(state.recipe).highlightLines`, shown only while `derived.edited` is false: they are positions in the generated text and would point at wrong lines after an edit. The pane imports `generateHandler` from `@/services/generators/handlers` directly (features may import services; Phase 14's button does the same with `generateClient`), which avoids changing the pinned `StarterDerived` contract; tests that check highlights therefore pass `STARTER_DEPS`. The harness gains `editorView(name)`. The page mounts the code row.

**Files:**

- Create: `src/features/starter/code/ServerPane.tsx` — the server handler pane.
- Modify: `src/features/starter/starterTestHarness.tsx` — add `editorView`.
- Modify: `src/features/starter/StarterPage.tsx` — mount the code row with the server pane.
- Signal: `src/features/starter/code/ServerPane.test.tsx` — pane through the real session.

- [ ] **Step 1: Establish the observable pre-change signal**

In `src/features/starter/starterTestHarness.tsx`, replace the first import line:

```tsx
import { act, render } from '@testing-library/react';
```

with:

```tsx
import { EditorView } from '@codemirror/view';
import { act, render, screen } from '@testing-library/react';
```

and append at the end of the file:

```tsx
/** The CodeMirror view behind a code pane, found by its textbox name. */
export function editorView(name: string): EditorView {
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name }));
  if (view === null) throw new Error(`No editor named ${name}`);
  return view;
}
```

Create `src/features/starter/code/ServerPane.test.tsx`:

```tsx
import { undo } from '@codemirror/commands';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
import { generateHandler } from '@/services/generators/handlers';
import { editorView, renderStarter } from '../starterTestHarness';
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

describe('ServerPane (Phase 21)', () => {
  it('shows <slug>.js, the Server pill, the session text and the footer (AC-4.2, AC-2.4, AC-4.10)', () => {
    const h = renderStarter(<ServerPane />, { deps: STARTER_DEPS });
    const pane = screen.getByRole('region', { name: 'Server handler' });
    expect(pane).toHaveTextContent('customer-summary.js');
    expect(within(pane).getByText('Server')).toHaveClass('ui-pill--server');
    expect(pane).toHaveTextContent("Runs on Power Pages with the caller's permissions");
    expect(serverText()).toBe(h.session().state.serverText);
    h.dispatch({ type: 'setName', name: 'Orders' });
    expect(pane).toHaveTextContent('orders.js');
  });

  it("highlights the recipe's data-access lines while the text is unedited (AC-4.2)", () => {
    renderStarter(<ServerPane />, { deps: STARTER_DEPS });
    expect(linesWith('ui-code-highlight')).toEqual([...generateHandler('R1').highlightLines]);
    typeAtStart('// mine\n');
    expect(linesWith('ui-code-highlight')).toEqual([]);
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

  it('takes a Server Objects insert as one undo step and moves the cursor (AC-6.8, Phase 18a Decision 1)', () => {
    const h = renderStarter(<ServerPane />);
    const before = h.session().state.serverText;
    h.dispatch({
      type: 'applyChanges',
      changes: [{ from: 0, to: 0, insert: 'const x = 1;\n' }],
      cursor: 13,
    });
    const view = editorView('Server code');
    expect(serverText()).toBe(`const x = 1;\n${before}`);
    expect(view.state.selection.main.head).toBe(13);
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
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/code/ServerPane.test.tsx`

Expected: `FAIL  src/features/starter/code/ServerPane.test.tsx`, with `Error: Failed to resolve import "./ServerPane" from "src/features/starter/code/ServerPane.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/code/ServerPane.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Tile } from '@/components/Tile';
import type { CheckSeverity } from '@/lib/code-analysis/codeAnalysis.types';
import { LIQUID_SERVER_NOTE } from '@/services/generators/client/client';
import { generateHandler } from '@/services/generators/handlers';
import { CodeEditor } from './CodeEditor';
import { CopyButton } from './CopyButton';
import './codePanes.css';

const SEVERITY = {
  blocked: 'Blocked',
  'may-be-rejected': 'May be rejected',
} as const satisfies Record<CheckSeverity, string>;
const NO_LINES: readonly number[] = [];

/** The editable server handler (AC-4.2, AC-4.3, AC-4.7 note, AC-4.10, AC-5.2). */
export function ServerPane(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const { hits, parseFailed } = derived.checks;
  // Highlight lines are positions in the generated text, so they show only while it is unedited.
  const highlightLines = derived.edited ? NO_LINES : generateHandler(state.recipe).highlightLines;

  return (
    <Tile flush role="region" aria-label="Server handler" className="starter-pane">
      <div className="starter-pane__head">
        <span className="ui-mono starter-pane__title">{derived.slug}.js</span>
        <Pill tone="server" compact>
          Server
        </Pill>
        <span className="starter-pane__spacer" />
        <CopyButton text={state.serverText} label="Copy server code" />
      </div>
      <CodeEditor
        label="Server code"
        value={state.serverText}
        syntax="javascript"
        cursor={state.cursor}
        highlightLines={highlightLines}
        flagLines={hits.map((hit) => hit.line)}
        onEdit={(text, cursor) => {
          dispatch({ type: 'editServer', text, cursor });
        }}
        onCursor={(cursor) => {
          dispatch({ type: 'setCursor', cursor });
        }}
      />
      {hits.length > 0 || parseFailed ? (
        <ul className="starter-pane__flags" aria-label="Browser check findings">
          {hits.map((hit) => (
            <li key={`${String(hit.line)}:${hit.pattern}:${hit.severity}`}>
              <Icon name="important" size={12} />
              Line {hit.line}: {hit.pattern} ({SEVERITY[hit.severity]})
            </li>
          ))}
          {parseFailed ? (
            <li>
              <Icon name="important" size={12} />
              Couldn&apos;t parse this code
            </li>
          ) : null}
        </ul>
      ) : null}
      {state.language === 'liquid' ? (
        <p className="starter-pane__note">{LIQUID_SERVER_NOTE}</p>
      ) : null}
      <p className="starter-pane__foot">Runs on Power Pages with the caller&apos;s permissions</p>
    </Tile>
  );
}
```

In `src/features/starter/StarterPage.tsx`, add the import after the `Icon` import:

```tsx
import { ServerPane } from './code/ServerPane';
```

and mount the code row between the input row and the note tile:

```tsx
      <StarterInputs />
      <div className="starter-page__code">
        <div className="starter-code__panes">
          <ServerPane />
        </div>
      </div>
      <PermissionNote />
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/code/ServerPane.test.tsx`

Expected: `Test Files  1 passed (1)` and `Tests  7 passed (7)`.

Run: `npx vitest run src/features/starter src/app`

Expected: every file passes, including Phase 18's `StarterPage.test.tsx` (12 tests) and `src/app/App.test.tsx`, which now mount CodeMirror through the page.

Run: `npx tsc -b && npx eslint . --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/code/ServerPane.tsx src/features/starter/code/ServerPane.test.tsx src/features/starter/starterTestHarness.tsx src/features/starter/StarterPage.tsx
git commit -m "feat(starter): add the editable server pane with highlights and browser-check flags"
```

### Task 5: The client pane and request path strip show how to call the handler

**Owns:** `ClientPane`: ⇄ icon in the needs-review colour (FR-11), "Client call", the "Client language" `PillGroup` from Phase 18's `languageOptions(getRecipe(state.recipe), derived.liquidAllowed)` dispatching `setLanguage`, Copy, a read-only `CodeEditor` labelled "Client call code" (`syntax` `plain` for Liquid), and the AC-4.4 footer. The client text is `generateClient({ slug: derived.slug, recipe: state.recipe, fn: derived.fn, method: state.method, language: state.language })`, the call shape of Phase 14 Decision 9; the test pins pane text to that call, and Phase 14's own test pins the zip's client file to it, so the two cannot drift. `RequestPathStrip`: an ordered list of `requestPathSteps(state.language, derived.slug, derived.fn)`, each a label and a mono pill (`title` holds the full value for truncation), `arrow-right` icons between steps, the Endpoint pill in the `ok` tone as in layout 10a. AC-4.1's 300 ms budget is asserted structurally: both panes reflect a name change inside the same `act()` (no debounce, no async step).

**Files:**

- Create: `src/features/starter/code/ClientPane.tsx` — the read-only client call pane.
- Create: `src/features/starter/code/RequestPathStrip.tsx` — the request path strip.
- Modify: `src/features/starter/StarterPage.tsx` — mount the strip and the client pane.
- Signal: `src/features/starter/code/ClientPane.test.tsx` — client text, strip, pills, footers and same-render updates.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/starter/code/ClientPane.test.tsx`:

```tsx
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
import { generateClient } from '@/services/generators/client/client';
import { StarterPage } from '../StarterPage';
import { editorView, renderStarter } from '../starterTestHarness';
import { ClientPane } from './ClientPane';
import { RequestPathStrip } from './RequestPathStrip';

const clientText = (): string => editorView('Client call code').state.doc.toString();
const radio = (name: string): HTMLElement => screen.getByRole('radio', { name });

function Panes() {
  return (
    <>
      <RequestPathStrip />
      <ClientPane />
    </>
  );
}

describe('ClientPane and RequestPathStrip (Phase 21)', () => {
  it('shows the generated client call, read-only, matching the download (AC-4.4, Phase 14 Risk 2)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    const { state, derived } = h.session();
    expect(clientText()).toBe(
      generateClient({
        slug: derived.slug,
        recipe: state.recipe,
        fn: derived.fn,
        method: state.method,
        language: state.language,
      }),
    );
    expect(screen.getByRole('textbox', { name: 'Client call code' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Client call' })).toHaveTextContent(
      "Paste into a page's custom JavaScript",
    );
  });

  it('follows the slug in the endpoint and the client URL (AC-2.4)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    h.dispatch({ type: 'setName', name: 'Orders' });
    expect(clientText()).toContain('/_api/serverlogics/orders');
    expect(screen.getByRole('region', { name: 'Request path' })).toHaveTextContent(
      'Endpoint /_api/serverlogics/orders',
    );
  });

  it('shows the five HTTP steps, or the four Liquid steps (AC-4.8)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    const steps = (): string[] =>
      within(screen.getByRole('region', { name: 'Request path' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(steps()).toEqual([
      'Page script fetch()',
      'Token __RequestVerificationToken',
      'Endpoint /_api/serverlogics/customer-summary',
      'Handler function get()',
      'Returns JSON string',
    ]);
    h.dispatch({ type: 'setLanguage', language: 'liquid' });
    expect(steps()).toEqual([
      'Page render Liquid page',
      'Tag serverlogic',
      'Handler function get()',
      'Returns result object',
    ]);
    expect(screen.getByRole('region', { name: 'Client call' })).toHaveTextContent(
      'Paste into a page or web template',
    );
  });

  it('switches language with the pills and explains a disabled Liquid pill (AC-4.4, AC-4.7)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    fireEvent.click(radio('jQuery'));
    expect(h.session().state.language).toBe('jquery');
    expect(clientText()).toContain('shell.ajaxSafePost');
    h.dispatch({ type: 'selectRecipe', recipe: 'R2' });
    expect(radio('Liquid')).toHaveAttribute('aria-disabled', 'true');
    expect(radio('Liquid')).toHaveAccessibleDescription(
      "Liquid can't call this handler: it reads HTTP-only request properties",
    );
  });

  // The 300 ms wall-clock budget is a release-smoke check in PPTB: timing assertions flake under the parallel suite.
  it('updates both panes in the same render as an input change, with no debounce (AC-4.1)', () => {
    renderStarter(<StarterPage />, { deps: STARTER_DEPS });
    act(() => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Logic name' }), {
        target: { value: 'Orders' },
      });
    });
    expect(clientText()).toContain('/_api/serverlogics/orders');
    expect(screen.getByRole('region', { name: 'Server handler' })).toHaveTextContent('orders.js');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/code/ClientPane.test.tsx`

Expected: `FAIL  src/features/starter/code/ClientPane.test.tsx`, with `Error: Failed to resolve import "./ClientPane" from "src/features/starter/code/ClientPane.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/starter/code/ClientPane.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Icon } from '@/components/Icon';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateClient } from '@/services/generators/client/client';
import { languageOptions } from '../inputs/starterOptions';
import { CodeEditor } from './CodeEditor';
import { CopyButton } from './CopyButton';
import './codePanes.css';

/** The read-only client call (AC-2.4, AC-4.1, AC-4.4, AC-4.7 pill). */
export function ClientPane(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  // The call shape Phase 14's download uses (its Decision 9), so the pane and the zip's client file match.
  const text = generateClient({
    slug: derived.slug,
    recipe: state.recipe,
    fn: derived.fn,
    method: state.method,
    language: state.language,
  });
  const liquid = state.language === 'liquid';

  return (
    <Tile flush role="region" aria-label="Client call" className="starter-pane">
      <div className="starter-pane__head">
        <span className="starter-pane__swap">
          <Icon name="arrow-swap" />
        </span>
        <span className="starter-pane__title">Client call</span>
        <PillGroup
          label="Client language"
          compact
          options={languageOptions(getRecipe(state.recipe), derived.liquidAllowed)}
          value={state.language}
          onChange={(language) => {
            dispatch({ type: 'setLanguage', language });
          }}
        />
        <span className="starter-pane__spacer" />
        <CopyButton text={text} label="Copy client call" />
      </div>
      <CodeEditor label="Client call code" value={text} syntax={liquid ? 'plain' : 'javascript'} />
      <p className="starter-pane__foot">
        {liquid ? 'Paste into a page or web template' : "Paste into a page's custom JavaScript"}
      </p>
    </Tile>
  );
}
```

Create `src/features/starter/code/RequestPathStrip.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Tile } from '@/components/Tile';
import { requestPathSteps } from '@/services/generators/client/client';
import './codePanes.css';

/** The request path strip (AC-4.8): steps from Phase 10's requestPathSteps, the endpoint emphasised. */
export function RequestPathStrip(): ReactElement {
  const { state, derived } = useStarterSession();
  const steps = requestPathSteps(state.language, derived.slug, derived.fn);
  return (
    <Tile role="region" aria-label="Request path" className="starter-strip">
      <ol className="starter-strip__steps">
        {steps.map((step, index) => (
          <li key={step.label} className="starter-strip__step">
            {index > 0 ? <Icon name="arrow-right" /> : null}
            <span className="starter-strip__item">
              <span className="starter-strip__label">{step.label}</span>{' '}
              <Pill
                mono
                compact
                tone={step.label === 'Endpoint' ? 'ok' : 'neutral'}
                title={step.value}
                className="starter-strip__value"
              >
                {step.value}
              </Pill>
            </span>
          </li>
        ))}
      </ol>
    </Tile>
  );
}
```

In `src/features/starter/StarterPage.tsx`, the imports become:

```tsx
import { ClientPane } from './code/ClientPane';
import { RequestPathStrip } from './code/RequestPathStrip';
import { ServerPane } from './code/ServerPane';
```

and the code row becomes:

```tsx
      <div className="starter-page__code">
        <RequestPathStrip />
        <div className="starter-code__panes">
          <ServerPane />
          <ClientPane />
        </div>
      </div>
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter/code/ClientPane.test.tsx`

Expected: `Test Files  1 passed (1)` and `Tests  5 passed (5)`.

Run: `npx vitest run src/features/starter src/app`

Expected: every file passes. Phase 18's page tests stay green because their queries are scoped to their tiles.

Run: `npx tsc -b && npx eslint . --max-warnings=0`

Expected: both exit 0 with no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/starter/code/ClientPane.tsx src/features/starter/code/RequestPathStrip.tsx src/features/starter/code/ClientPane.test.tsx src/features/starter/StarterPage.tsx
git commit -m "feat(starter): add the client call pane and request path strip"
```

### Task 6: The phase passes every repository gate and builds one IIFE bundle

**Owns:** Phase 21's completion evidence and the ◆ items it hands to the Starter release gate. No code.

**Files:**

- Signal: the four repository gates and `npm run build`.

- [ ] **Step 1: Establish the observable pre-change signal**

The signal is the gate list from `plan-starter.md` § Global Constraints, run on the finished phase. No new code.

- [ ] **Step 2: Capture the current signal**

Run: `git status --short src tests`

Expected: no output (Tasks 1–5 committed).

- [ ] **Step 3: Implement the minimum fix**

No change. If a gate fails, fix it in the task that owns the failing file with a new commit.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . --end-of-line auto`

Expected: exit 0; Prettier prints `All matched files use Prettier code style!`.

Run: `npx vitest run`

Expected: every file passes, with 6 more files and 31 more tests than Phase 18's end state: `Test Files  78 passed (78)` and `Tests  1068 passed (1068)` from `5953503`. If Phase 17 or another phase merged since, add its files and tests to both numbers. If only `browserChecks.test.ts > performance` fails, rerun it alone: it is load-sensitive and was flaky before this phase.

Run: `npm run build`

Expected: `✓ built in` with no error; `tests/buildShape.test.ts` (part of the run above) still confirms one IIFE bundle with no `type="module"`, `crossorigin` or split chunks.

◆ Owner checks for the Starter release gate (not agent tasks), in PPTB with Debug → Load Local Tool on the project root, both themes:

1. Changing name, method, recipe or language updates both panes within 300 ms (AC-4.1, NFR Performance).
2. In the server pane, Esc then Tab moves focus out of the editor; Tab alone indents (F48). A screen reader reads both panes and the findings list.
3. Copy puts the pane text on the clipboard with "Code copied"; highlighted lines show the 10% primary tint and 2px bar; flagged lines show the review bar.

- [ ] **Step 5: Commit the coherent change**

No commit: this task adds no files. Record the gate results and the ◆ hand-off in the phase PR description.

---

## Notes after the plan

- **Contract use.** No pinned contract changes. New shared names: `minimalChange` (`src/lib/minimalChange.ts`) and `CodeEditor` (`src/features/starter/code/CodeEditor.tsx`). Phase 22's Insert relies on `state.cursor` now being kept current by the server pane.
- **Highlights alternative (not taken).** Mapping highlight positions through edits would need either a `highlightLines` field on `StarterDerived` (a pinned-contract change owned by Phase 18a) or a CodeMirror state field reset on every outside change. Hiding highlights once the text is edited is the smallest correct behaviour; revisit only if makers ask for highlights on edited code.
- **R7 and Download.** Phase 19 has merged, so `ServerPane`'s `generateHandler(state.recipe)` works for every recipe, R7 included. Phase 14 has merged, and its test pins the zip's client file to `generateClient`, so Task 5's pane-equals-`generateClient` test closes Risk 2 end to end.
- **Coverage map.** AC-4.10 and F48 → Task 2; AC-4.9 → Task 3; AC-4.2, 4.3, 4.7 note, 5.2, cursor tracking → Task 4; AC-2.4, 4.1, 4.4, 4.7 pill, 4.8, Phase 14 Risk 2 → Task 5; AC-4.1 timing → Task 6 ◆.
