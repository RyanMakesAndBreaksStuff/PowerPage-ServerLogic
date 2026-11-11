import type { TextChange } from '@/lib/code-analysis/codeAnalysis.types';

/**
 * The single replacement that turns `before` into `after`, keeping their common prefix and suffix.
 * One change means one editor transaction, so an outside update is one undo step.
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
