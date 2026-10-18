import type { TextChange } from '@/lib/code-analysis/codeAnalysis.types';

// Offsets refer to the original text and changes come ordered by `from` (Phase 03), so apply from the end.
export function applyTextChanges(text: string, changes: readonly TextChange[]): string {
  let result = text;
  for (let i = changes.length - 1; i >= 0; i -= 1) {
    const change = changes[i];
    if (change === undefined) continue;
    result = result.slice(0, change.from) + change.insert + result.slice(change.to);
  }
  return result;
}
