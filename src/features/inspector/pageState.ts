import type { InspectorSession } from '@/types/inspectorSession';
import type { ConnectionState } from '@/session/useActiveConnection';
import type { ScanProgress, SiteRef, SiteResult } from '@/types/inspector';

/** Everything the Inspector page can be showing, as one union so every state is handled and exhausted. */
export type PageState =
  | { kind: 'connection-unknown'; failed: boolean }
  | { kind: 'disconnected' }
  | { kind: 'sites-loading' }
  | { kind: 'sites-error'; message: string }
  | { kind: 'no-sites' }
  | { kind: 'choose-site' }
  | { kind: 'scanning'; site: SiteRef; progress: ScanProgress | null }
  | { kind: 'scan-failed'; site: SiteRef }
  | { kind: 'connection-changed'; site: SiteRef }
  | { kind: 'results'; site: SiteRef; result: SiteResult };

export function derivePageState(connection: ConnectionState, session: InspectorSession): PageState {
  if (connection.status === 'unknown') {
    return { kind: 'connection-unknown', failed: connection.refreshFailed };
  }
  if (connection.status === 'disconnected') return { kind: 'disconnected' };
  const { sites, scan, result } = session;
  switch (sites.status) {
    case 'idle':
    case 'loading':
      return { kind: 'sites-loading' };
    case 'error':
      return { kind: 'sites-error', message: sites.message };
    case 'ok':
      if (sites.sites.length === 0) return { kind: 'no-sites' };
      break;
    default: {
      const unreachable: never = sites;
      return unreachable;
    }
  }
  switch (scan.status) {
    case 'none':
      return { kind: 'choose-site' };
    case 'scanning':
      return { kind: 'scanning', site: scan.site, progress: scan.progress };
    case 'failed':
      return { kind: 'scan-failed', site: scan.site };
    case 'connection-changed':
      return { kind: 'connection-changed', site: scan.site };
    case 'done':
      // A finished scan always has its evaluated result; the fallback only satisfies the type.
      return result === null ? { kind: 'choose-site' } : { kind: 'results', site: scan.site, result };
    default: {
      const unreachable: never = scan;
      return unreachable;
    }
  }
}
