import { createContext } from 'react';
import type { PptbHost } from '@/services/pptb/host.types';

export const HostContext = createContext<PptbHost | null>(null);

export function useHost(): PptbHost {
  throw new Error('not implemented: phase 06');
}
