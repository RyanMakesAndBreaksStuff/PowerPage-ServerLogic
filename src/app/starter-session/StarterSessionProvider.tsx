import { useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import { useNotify } from '@/app/useNotify';
import { deriveStarter } from './deriveStarter';
import { STARTER_DEPS } from './starterDeps';
import type { StarterDeps } from './starterDeps';
import { createStarterReducer, initialStarterState } from './starterReducer';
import { StarterSessionContext } from './useStarterSession';

export function StarterSessionProvider({
  children,
  deps = STARTER_DEPS,
}: {
  readonly children: ReactNode;
  readonly deps?: StarterDeps;
}): ReactNode {
  const [state, dispatch] = useReducer(createStarterReducer(deps), deps, initialStarterState);
  const notify = useNotify();
  const derived = deriveStarter(state, deps);

  // The notice is a message to the host, an external system, so an effect sends it once and clears it.
  const notice = state.pendingNotice;
  useEffect(() => {
    if (notice === null) return;
    notify(notice);
    dispatch({ type: 'clearNotice' });
  }, [notice, notify]);

  return (
    <StarterSessionContext value={{ state, dispatch, derived }}>{children}</StarterSessionContext>
  );
}
