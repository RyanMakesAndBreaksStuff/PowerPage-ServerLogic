import type { ConnectorUse, InsertResult } from '@/lib/code-analysis/codeAnalysis.types';

export function detectConnectorUse(_code: string): ConnectorUse | null {
  throw new Error('not implemented: phase 03');
}

export function exportedFunctionNames(_code: string): readonly string[] | null {
  throw new Error('not implemented: phase 03');
}

export function usedServerMembers(_code: string): ReadonlyMap<string, readonly string[]> {
  throw new Error('not implemented: phase 03');
}

export function readsHttpOnlyContext(_code: string): boolean {
  throw new Error('not implemented: phase 03');
}

export function planInsertion(
  _code: string,
  _sample: string,
  _cursor: number | null,
  _targetFn: string,
): InsertResult {
  throw new Error('not implemented: phase 03');
}
