import { createContext, use } from 'react';
import type { PptbHost } from '@/services/pptb/host.types';

export const HostContext = createContext<PptbHost | null>(null);

export function useHost(): PptbHost {
  const host = use(HostContext);
  if (host === null) throw new Error('useHost must be used inside the App');
  return host;
}
