import { createContext, use } from 'react';
import type { Connection } from '@/services/pptb/host.types';

/**
 * What the app knows about the active connection. `refreshFailed` is the outcome of the latest refresh and is
 * separate from the confirmed identity: a rejected refresh keeps the last confirmed state (WR-005), and
 * `unknown` means no read has succeeded yet (still pending, or every read so far rejected).
 */
export type ConnectionState =
  | { status: 'unknown'; refreshFailed: boolean }
  | { status: 'disconnected'; refreshFailed: boolean }
  | { status: 'connected'; connection: Connection; refreshFailed: boolean };

export const INITIAL_CONNECTION_STATE: ConnectionState = { status: 'unknown', refreshFailed: false };

export const ConnectionContext = createContext<ConnectionState>(INITIAL_CONNECTION_STATE);

/**
 * The provider's second context (S-06): `refresh` re-reads the active connection on demand (the Retry button,
 * D-05) and `pending` is true while a read is in flight.
 */
export type ConnectionRefresh = {
  readonly refresh: () => void;
  readonly pending: boolean;
};

export const INITIAL_CONNECTION_REFRESH: ConnectionRefresh = {
  refresh: () => undefined,
  pending: false,
};

export const ConnectionRefreshContext = createContext<ConnectionRefresh>(INITIAL_CONNECTION_REFRESH);

/** The identity AC-7.6 compares: the connection id and URL. Names and environment labels are display context. */
export function connectionKey(connection: Connection): string {
  return `${connection.id}\n${connection.url}`;
}

export function useConnectionState(): ConnectionState {
  return use(ConnectionContext);
}

export function useRefreshConnection(): ConnectionRefresh {
  return use(ConnectionRefreshContext);
}
