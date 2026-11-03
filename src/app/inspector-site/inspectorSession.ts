import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import { connectionKey } from '@/app/useActiveConnection';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import { errorName } from '@/services/pptb/hostErrors';
import type { ReviewKey, SiteRef } from '@/types/inspector';
import type { InspectorDeps } from './inspectorDeps';
import type { InspectorActions, InspectorSnapshot } from './inspectorSession.types';

export const EMPTY_MARKS: ReadonlySet<ReviewKey> = new Set<ReviewKey>();

export const INITIAL_SNAPSHOT: InspectorSnapshot = {
  ownerKey: undefined,
  connection: null,
  sites: { status: 'idle' },
  scan: { status: 'none' },
  fileId: null,
  marks: EMPTY_MARKS,
  generation: 0,
};

export type InspectorStore = InspectorActions & {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => InspectorSnapshot;
  /**
   * Gives the store the confirmed active connection. A different id or URL, or a successful null, discards
   * everything and reloads the site list; the same identity only refreshes the display context (AC-7.6) and
   * reloads nothing (D-16 A).
   */
  adopt: (connection: Connection | null) => void;
  /** Aborts the running scan, discards late results and returns to the initial state. Safe to adopt again. */
  stop: () => void;
};

const noop = (): void => undefined;

/**
 * The one owner of the selected site, the scan generation and its AbortController, the facts, the file
 * selection and the review marks. It is plain TypeScript so the async lifecycle can be tested without React.
 *
 * Reads: a superseded scan is aborted. Each generation runs four reads at most (FR-7), `runScan` settles only
 * after every read it started has settled (scan.ts settle-all, B11a), and the next scan or site-list read
 * waits for that, so reads across generations stay at four.
 */
export function createInspectorStore(host: PptbHost, deps: InspectorDeps): InspectorStore {
  let snapshot: InspectorSnapshot = INITIAL_SNAPSHOT;
  let listToken = 0;
  let controller: AbortController | null = null;
  let settled: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<InspectorSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of [...listeners]) listener();
  };

  /** Work that never rejects. Later reads wait for it; for a scan, until its `runScan` has fully settled. */
  const track = (work: Promise<void>): void => {
    settled = Promise.all([settled, work]).then(noop);
  };

  const abortScan = (): void => {
    controller?.abort();
    controller = null;
  };

  function loadSites(): void {
    listToken += 1;
    const token = listToken;
    publish({ sites: { status: 'loading' } });
    const previous = settled;
    track(
      (async () => {
        await previous;
        if (token !== listToken) return;
        try {
          const sites = await deps.listSites(host);
          if (token !== listToken) return;
          const selected = snapshot.scan.status === 'none' ? null : snapshot.scan.site;
          if (selected !== null && !sites.some((candidate) => candidate.id === selected.id)) {
            // D-19 C: a successful list that omits the selected site drops the selection and everything under it.
            abortScan();
            publish({
              sites: { status: 'ok', sites },
              scan: { status: 'none' },
              fileId: null,
              marks: EMPTY_MARKS,
              generation: snapshot.generation + 1,
            });
            return;
          }
          publish({ sites: { status: 'ok', sites } });
        } catch (error) {
          if (token !== listToken) return;
          console.error('The site list could not be read.', errorName(error));
          publish({
            sites: {
              status: 'error',
              message:
                error instanceof HostReadError ? error.message : "Couldn't read the site list.",
            },
          });
        }
      })(),
    );
  }

  function startScan(site: SiteRef): void {
    const { connection } = snapshot;
    if (connection === null) return;
    abortScan();
    const mine = snapshot.generation + 1;
    const own = new AbortController();
    controller = own;
    publish({
      scan: { status: 'scanning', site, progress: null },
      fileId: null,
      marks: EMPTY_MARKS,
      generation: mine,
    });
    const previous = settled;
    track(
      (async () => {
        await previous;
        if (mine !== snapshot.generation) return;
        try {
          const facts = await deps.runScan(
            host,
            connection,
            site,
            `${connection.id}:${site.id}:${String(mine)}`,
            (progress) => {
              if (mine === snapshot.generation) {
                publish({ scan: { status: 'scanning', site, progress } });
              }
            },
            { signal: own.signal },
          );
          if (mine === snapshot.generation) publish({ scan: { status: 'done', site, facts } });
        } catch (error) {
          // Cancelled by our own abort, or superseded: the newer generation owns the state.
          if (mine !== snapshot.generation || own.signal.aborted) return;
          if (error instanceof ScanAbandonedError) {
            // The active connection changed under the scan: its facts must not be shown (D-14).
            publish({ scan: { status: 'connection-changed', site }, generation: mine + 1 });
            return;
          }
          console.error('The scan failed.', errorName(error));
          publish({ scan: { status: 'failed', site } });
        }
      })(),
    );
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,

    adopt: (connection) => {
      const key = connection === null ? null : connectionKey(connection);
      if (key === snapshot.ownerKey) {
        if (connection !== snapshot.connection) publish({ connection });
        return;
      }
      abortScan();
      publish({
        ownerKey: key,
        connection,
        sites: { status: 'idle' },
        scan: { status: 'none' },
        fileId: null,
        marks: EMPTY_MARKS,
        generation: snapshot.generation + 1,
      });
      listToken += 1;
      if (connection !== null) loadSites();
    },

    stop: () => {
      abortScan();
      listToken += 1;
      publish({ ...INITIAL_SNAPSHOT, generation: snapshot.generation + 1 });
    },

    selectSite: (site) => {
      const { sites, scan } = snapshot;
      if (!site.active || sites.status !== 'ok') return;
      if (!sites.sites.some((candidate) => candidate.id === site.id)) return;
      if (scan.status === 'scanning' && scan.site.id === site.id) return;
      startScan(site);
    },

    rescan: () => {
      const { scan } = snapshot;
      if (scan.status === 'done' || scan.status === 'failed') startScan(scan.site);
    },

    retrySites: () => {
      if (snapshot.sites.status === 'error') loadSites();
    },

    selectFile: (fileId) => {
      if (snapshot.scan.status === 'done') publish({ fileId });
    },

    setReviewed: (key, reviewed) => {
      if (snapshot.scan.status !== 'done') return;
      const marks = new Set(snapshot.marks);
      if (reviewed) marks.add(key);
      else marks.delete(key);
      publish({ marks, generation: snapshot.generation + 1 });
    },
  };
}
