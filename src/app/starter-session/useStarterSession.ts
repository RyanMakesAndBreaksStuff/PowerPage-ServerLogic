import { createContext, use } from 'react';
import type {
  StarterAction,
  StarterDerived,
  StarterState,
} from '@/types/starter';

type StarterSession = {
  state: StarterState;
  dispatch: (a: StarterAction) => void;
  derived: StarterDerived;
};

export const StarterSessionContext = createContext<StarterSession | null>(null);

export function useStarterSession(): {
  state: StarterState;
  dispatch: (a: StarterAction) => void;
  derived: StarterDerived;
} {
  const session = use(StarterSessionContext);
  if (session === null)
    throw new Error('useStarterSession must be used inside StarterSessionProvider');
  return session;
}
