import type { TextChange } from './codeAnalysis.types';
import { nodeList } from './structureAst';
import type { AstNode } from './structureAst';
import { normalizeLf } from '@/lib/text';

// Private to planInsertion (structure.ts): where and how the sample text goes in. The text is LF-only (normalizeLf).

function lineStartOf(code: string, offset: number): number {
  return offset === 0 ? 0 : code.lastIndexOf('\n', offset - 1) + 1;
}

function lineEndOf(code: string, offset: number): number {
  const end = code.indexOf('\n', offset);
  return end === -1 ? code.length : end;
}

/** The leading whitespace of the line that holds `offset`. */
function indentOf(code: string, offset: number): string {
  const start = lineStartOf(code, offset);
  let end = start;
  while (code[end] === ' ' || code[end] === '\t') end++;
  return code.slice(start, end);
}

/** The indentation of the block's statements: its first statement that starts a line, else one level in. */
function blockIndent(code: string, block: AstNode): string {
  for (const statement of nodeList(block, 'body')) {
    const lineStart = lineStartOf(code, statement.start);
    const before = code.slice(lineStart, statement.start);
    if (before.trim() === '') return before;
  }
  const outer = indentOf(code, block.start);
  return outer + (outer.includes('\t') ? '\t' : '  ');
}

/**
 * The sample's lines, trimmed of blank lines at both ends, moved to `indent` and keeping their relative indentation.
 * shortcut: continuation lines of a multi-line template literal in a sample would be re-indented too; no catalogue
 * sample has one, so revisit this if one gains one.
 */
function indentSample(sample: string, indent: string): string {
  const lines = normalizeLf(sample).split('\n');
  while (lines[0]?.trim() === '') lines.shift();
  while (lines.at(-1)?.trim() === '') lines.pop();
  const margin = Math.min(
    ...lines.filter((l) => l.trim() !== '').map((l) => l.length - l.trimStart().length),
  );
  return lines.map((l) => (l.trim() === '' ? '' : indent + l.slice(margin))).join('\n');
}

/**
 * The change that puts `sample` at `at`, a statement boundary inside `block`. The sample always lands on its own
 * lines, so it can't end up inside a `//` comment that runs to the end of the line.
 */
export function buildInsertion(
  code: string,
  block: AstNode,
  at: number,
  sample: string,
): TextChange {
  const indent = blockIndent(code, block);
  const body = indentSample(sample, indent);
  const lineStart = lineStartOf(code, at);
  if (code.slice(lineStart, at).trim() === '') {
    // Only whitespace before `at` on its line: put the sample on the lines above it.
    return { from: lineStart, to: lineStart, insert: `${body}\n` };
  }
  const rest = code.slice(at, lineEndOf(code, at));
  const tail =
    rest.trim() === ''
      ? ''
      : `\n${rest.trimStart().startsWith('}') ? indentOf(code, block.start) : indent}`;
  return { from: at, to: at, insert: `\n${body}${tail}` };
}

/** Applies changes whose offsets all refer to `code`, the way one CodeMirror transaction does. */
export function applyChanges(code: string, changes: readonly TextChange[]): string {
  // Descending `from`; equal offsets go by descending array index so earlier entries end up first in the text.
  const ordered = changes
    .map((change, index) => ({ change, index }))
    .sort((a, b) => b.change.from - a.change.from || b.index - a.index);
  let text = code;
  for (const { change } of ordered) {
    text = text.slice(0, change.from) + change.insert + text.slice(change.to);
  }
  return text;
}
