import type { ConnectionState } from '@/session/useActiveConnection';
import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';

const ENVIRONMENT_TEXT = {
  Dev: 'Development',
  Test: 'Test',
  UAT: 'UAT',
  Production: 'Production',
  Unknown: 'Unknown',
} as const satisfies Record<EnvironmentLabel, string>;

export function connectionLabel(c: Connection | null): string {
  return c === null ? 'Not connected' : `${c.name} · ${ENVIRONMENT_TEXT[c.environment]}`;
}

/** "Not connected" is only for a confirmed disconnect; an unread connection is never called that (WR-005). */
export function connectionStateLabel(state: ConnectionState): string {
  switch (state.status) {
    case 'connected':
      return connectionLabel(state.connection);
    case 'disconnected':
      return connectionLabel(null);
    case 'unknown':
      return state.refreshFailed ? 'Connection unavailable' : 'Checking connection…';
  }
}
