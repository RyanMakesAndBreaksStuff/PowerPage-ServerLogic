import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import { ConnectionContext } from '@/app/useActiveConnection';
import type { Connection } from '@/services/pptb/host.types';

export function ConnectionProvider({ children }: { children: ReactNode }): ReactElement {
  const host = useHost();
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    let latest = 0;
    const load = (): void => {
      latest += 1;
      const request = latest;
      // A rejected read means the host could not say; the adapter has logged it. Show "Not connected".
      host.getActiveConnection().then(
        (value) => {
          if (request === latest) setConnection(value);
        },
        () => {
          if (request === latest) setConnection(null);
        },
      );
    };
    load();
    const unsubscribe = host.onEvent((event) => {
      if (event.kind === 'connection-changed') load();
    });
    return () => {
      latest += 1;
      unsubscribe();
    };
  }, [host]);

  return <ConnectionContext value={connection}>{children}</ConnectionContext>;
}
