import { createContext, use } from 'react';
import type { Notice } from '@/services/pptb/host.types';

export const NotifyContext = createContext<((n: Notice) => void) | null>(null);

export function useNotify(): (n: Notice) => void {
  const notify = use(NotifyContext);
  if (notify === null) throw new Error('useNotify must be used inside the App');
  return notify;
}
