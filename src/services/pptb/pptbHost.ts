import type { PptbHost } from '@/services/pptb/host.types';

// Phase 01 keeps this options type; `sleep` lets its tests skip the retry waits.
export type PptbHostOptions = { sleep?: (ms: number) => Promise<void> };

export function createPptbHost(_options?: PptbHostOptions): PptbHost {
  throw new Error('not implemented: phase 01');
}
