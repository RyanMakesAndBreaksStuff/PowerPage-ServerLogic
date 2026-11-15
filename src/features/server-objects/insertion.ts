import type { InsertResult, TextChange } from '@/lib/code-analysis/codeAnalysis.types';

type Reason = Extract<InsertResult, { ok: false }>['reason'];

/** AC-6.8's tooltips, one per `planInsertion` failure reason. */
export const INSERT_REASONS = {
  'no-target': 'No function to insert into; use Copy',
  'not-statement': 'Move the cursor between statements inside a function, or use Copy',
  'breaks-code': 'Inserting here would break the code; use Copy',
} as const satisfies Record<Reason, string>;

/**
 * Where the cursor goes after an insert: the end of the last change in the new text. Changes come ordered by `from`
 * with offsets in the original text, so each earlier change (the `async `) shifts the later ones (AC-6.8).
 */
export function cursorAfter(changes: readonly TextChange[]): number {
  let shift = 0;
  let end = 0;
  for (const change of changes) {
    end = change.from + shift + change.insert.length;
    shift += change.insert.length - (change.to - change.from);
  }
  return end;
}
