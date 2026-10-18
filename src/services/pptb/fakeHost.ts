import type { PptbHost } from '@/services/pptb/host.types';

// Placeholder shapes. Phase 01 defines the real FakeHostInit and FakeHostControls in this file.
export type FakeHostInit = object;
export type FakeHostControls = object;

export function createFakeHost(_init?: FakeHostInit): PptbHost & FakeHostControls {
  throw new Error('not implemented: phase 01');
}
