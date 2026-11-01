/// <reference types="@pptb/types" />
import type {
  Connection,
  EnvironmentLabel,
  HostEvent,
  PptbHost,
  SaveResult,
  ThemeName,
} from './host.types';
import { downloadColumnContent, queryAllRows } from './dataverseRead';
import type { ReadDeps, Sleep } from './dataverseRead';
import { HostCallError, isRecord, logHostFailure } from './hostErrors';

export type PptbHostOptions = { sleep?: Sleep };

const ENVIRONMENTS = ['Dev', 'Test', 'UAT', 'Production'] as const;

function toEnvironment(value: unknown): EnvironmentLabel {
  return ENVIRONMENTS.find((label) => label === value) ?? 'Unknown';
}

function toHostEvent(payload: unknown): HostEvent | null {
  if (!isRecord(payload) || typeof payload.event !== 'string') return null;
  switch (payload.event) {
    case 'connection:created':
    case 'connection:updated':
    case 'connection:deleted':
      return { kind: 'connection-changed' };
    case 'settings:updated':
      return { kind: 'settings-updated' };
    default:
      return { kind: 'other', name: payload.event };
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Runs one host call. A missing member, a throw or a rejection becomes a HostCallError; only the error name is logged. */
async function hostCall<T>(label: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    logHostFailure(label, error);
    throw new HostCallError(`Host call failed: ${label}.`);
  }
}

function unexpected(label: string): HostCallError {
  return new HostCallError(`Host call failed: ${label} returned an unexpected result.`);
}

/**
 * `toolboxAPI.events.on` is registered once per host, on the first handler, and routes on `payload.event`.
 * The last unsubscribe, or the page's pagehide, disposes the host subscription with events.off as a fallback.
 */
function createEventHub(): PptbHost['onEvent'] {
  const handlers = new Set<(e: HostEvent) => void>();
  let registered = false;
  let disposeHost: (() => void) | null = null;
  const hub = (_event: unknown, payload: unknown): void => {
    const event = toHostEvent(payload);
    if (event === null) return;
    for (const handler of [...handlers]) {
      try {
        handler(event);
      } catch (error) {
        logHostFailure('event handler', error);
      }
    }
  };
  // FR-12: the host handler also goes when the tool unloads. A later subscribe registers it again.
  const detach = (): void => {
    if (!registered) return;
    registered = false;
    window.removeEventListener('pagehide', detach);
    handlers.clear();
    const dispose = disposeHost;
    disposeHost = null;
    try {
      if (dispose !== null) dispose();
      else window.toolboxAPI.events.off(hub);
    } catch (error) {
      logHostFailure(dispose !== null ? 'events.on disposer' : 'events.off', error);
    }
  };
  return (handler) => {
    handlers.add(handler);
    if (!registered) {
      try {
        const result: unknown = window.toolboxAPI.events.on(hub);
        disposeHost =
          typeof result === 'function'
            ? () => {
                (result as () => void)();
              }
            : null;
        registered = true;
        window.addEventListener('pagehide', detach);
      } catch (error) {
        logHostFailure('events.on', error);
      }
    }
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) detach();
    };
  };
}

/**
 * The only module that touches `window.toolboxAPI` and `window.dataverseAPI`. Dataverse is read-only:
 * `queryData` is the only data call. Every host response is `unknown` until a guard narrows it.
 */
export function createPptbHost(options: PptbHostOptions = {}): PptbHost {
  const deps: ReadDeps = {
    read: (path, headers) => window.dataverseAPI.queryData(path, undefined, headers),
    sleep: options.sleep ?? defaultSleep,
  };

  return {
    async getTheme(): Promise<ThemeName> {
      const theme: unknown = await hostCall('getCurrentTheme', () =>
        window.toolboxAPI.utils.getCurrentTheme(),
      );
      return theme === 'dark' ? 'dark' : 'light';
    },

    notify: (n) =>
      hostCall('showNotification', () =>
        window.toolboxAPI.utils.showNotification(
          n.type === 'error'
            ? { title: n.title, body: n.body, type: n.type, duration: 0 }
            : { title: n.title, body: n.body, type: n.type },
        ),
      ),

    copyText: (text) =>
      hostCall('copyToClipboard', () => window.toolboxAPI.utils.copyToClipboard(text)),

    async saveFile(defaultName, content, filters): Promise<SaveResult> {
      const dialogFilters = filters.map((f) => ({ name: f.name, extensions: [...f.extensions] }));
      const saved: unknown = await hostCall('saveFile', () =>
        window.toolboxAPI.fileSystem.saveFile(
          defaultName,
          content,
          dialogFilters.length === 0 ? undefined : dialogFilters,
        ),
      );
      if (saved === null) return { status: 'cancelled' };
      if (typeof saved === 'string' && saved !== '') return { status: 'saved', path: saved };
      throw unexpected('saveFile');
    },

    async openExternal(url) {
      if (!isHttpUrl(url)) throw new HostCallError('Only http and https links can be opened.');
      await hostCall('openInConnectionBrowser', () =>
        window.toolboxAPI.utils.openInConnectionBrowser(url),
      );
    },

    async getActiveConnection(): Promise<Connection | null> {
      const raw: unknown = await hostCall('getActiveConnection', () =>
        window.toolboxAPI.connections.getActiveConnection(),
      );
      if (raw === null || raw === undefined) return null;
      if (
        isRecord(raw) &&
        typeof raw.id === 'string' &&
        typeof raw.name === 'string' &&
        typeof raw.url === 'string'
      ) {
        return {
          id: raw.id,
          name: raw.name,
          url: raw.url,
          environment: toEnvironment(raw.environment),
        };
      }
      throw unexpected('getActiveConnection');
    },

    onEvent: createEventHub(),

    queryAll: (q) => queryAllRows(q, deps),

    downloadFileColumn: (entitySet, id, column) =>
      downloadColumnContent(entitySet, id, column, deps),
  };
}
