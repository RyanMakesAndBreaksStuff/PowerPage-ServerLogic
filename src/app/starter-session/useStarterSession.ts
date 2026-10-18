import type {
  StarterAction,
  StarterDerived,
  StarterState,
} from '@/app/starter-session/starterSession.types';

export function useStarterSession(): {
  state: StarterState;
  dispatch: (a: StarterAction) => void;
  derived: StarterDerived;
} {
  throw new Error('not implemented: phase 18a');
}
