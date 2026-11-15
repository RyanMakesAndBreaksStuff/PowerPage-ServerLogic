import { createContext, use } from 'react';
import type { InspectorSession } from '@/types/inspectorSession';

export const InspectorSessionContext = createContext<InspectorSession | null>(null);

export function useInspector(): InspectorSession {
  const session = use(InspectorSessionContext);
  if (session === null) {
    throw new Error('useInspector must be used inside the Inspector session provider');
  }
  return session;
}
