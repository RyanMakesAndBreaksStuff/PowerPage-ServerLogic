import { createContext, use } from 'react';
import type { Connection } from '@/services/pptb/host.types';

export const ConnectionContext = createContext<Connection | null>(null);

export function useActiveConnection(): Connection | null {
  return use(ConnectionContext);
}
