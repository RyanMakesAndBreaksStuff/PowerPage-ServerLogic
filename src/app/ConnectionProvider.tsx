import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import {
  ConnectionContext,
  ConnectionRefreshContext,
  INITIAL_CONNECTION_STATE,
} from '@/app/useActiveConnection';
import type { ConnectionRefresh, ConnectionState } from '@/app/useActiveConnection';

/**
 * Owns the last confirmed active connection (AC-7.6, WR-005). A successful read, including a successful
 * null, replaces it. A rejected read keeps it and only flags the failure, so a transient error is never
 * shown as "Not connected" and never invalidates results. It re-reads on every connection event, on window
 * focus, when the document becomes visible and when the page asks it to (Retry, D-05).
 */
export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
  const host = useHost();
  const [state, setState] = useState<ConnectionState>(INITIAL_CONNECTION_STATE);
  const [pending, setPending] = useState(false);
  // The effect below owns `load`; Retry reaches it through this ref, so the host is subscribed exactly once.
  const reload = useRef<() => void>(() => undefined);

  useEffect(() => {
    let latest = 0;
    const load = (): void => {
      latest += 1;
      const request = latest;
      setPending(true);
      host.getActiveConnection().then(
        (value) => {
          if (request !== latest) return;
          setPending(false);
          setState(
            value === null
              ? { status: 'disconnected', refreshFailed: false }
              : { status: 'connected', connection: value, refreshFailed: false },
          );
        },
        () => {
          // The host could not say (the adapter has logged it): keep what was confirmed and note the failure.
          if (request !== latest) return;
          setPending(false);
          setState((current) => ({ ...current, refreshFailed: true }));
        },
      );
    };
    const retry = (): void => {
      load();
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') load();
    };
    reload.current = retry;
    load();
    const unsubscribe = host.onEvent((event) => {
      if (event.kind === 'connection-changed') load();
    });
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      latest += 1;
      reload.current = () => undefined;
      unsubscribe();
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [host]);

  const refresh: ConnectionRefresh = {
    refresh: () => {
      reload.current();
    },
    pending,
  };

  return (
    <ConnectionContext value={state}>
      <ConnectionRefreshContext value={refresh}>{children}</ConnectionRefreshContext>
    </ConnectionContext>
  );
}
