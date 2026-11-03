import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionKey } from '@/app/useActiveConnection';
import { siteFacts } from '@/features/inspector/model/fixtures';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import type { Connection } from '@/services/pptb/host.types';
import { deferred } from '@/test/deferred';
import type { GatedHost } from '@/test/gatedHost';
import {
  CONNECTION,
  createInspectorHost,
  guid,
  OTHER_CONNECTION,
  SITE_ALPHA,
  SITE_BETA,
  SITE_RETIRED,
} from '@/test/inspectorWorld';
import type { ReviewKey, SiteFacts, SiteRef } from '@/types/inspector';
import { INSPECTOR_DEPS } from './inspectorDeps';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorStore } from './inspectorSession';
import type { InspectorSnapshot } from './inspectorSession.types';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function setup(host: GatedHost = createInspectorHost(), deps: InspectorDeps = INSPECTOR_DEPS) {
  const store = createInspectorStore(host, deps);
  const seen: InspectorSnapshot[] = [];
  store.subscribe(() => {
    seen.push(store.getSnapshot());
  });
  const snap = () => store.getSnapshot();
  return { host, store, seen, snap };
}

const until = (check: () => boolean) =>
  vi.waitFor(() => {
    expect(check()).toBe(true);
  });

const MARK: ReviewKey = `${guid(0x1001)}:webRole`;
const componentReads = (host: GatedHost) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');
const siteListReads = (host: GatedHost) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagesites');

describe('site list', () => {
  it('loads the sites of an adopted connection and selects nothing, even for a single site', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => snap().sites.status === 'ok');
    expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_ALPHA] });
    expect(snap().scan).toEqual({ status: 'none' });
    expect(snap().ownerKey).toBe(connectionKey(CONNECTION));
    expect(componentReads(host)).toHaveLength(0);
  });

  it('keeps the list idle, and reads nothing, for a confirmed disconnect', () => {
    const { host, store, snap } = setup();
    store.adopt(null);
    expect(snap()).toMatchObject({ ownerKey: null, connection: null, sites: { status: 'idle' } });
    expect(host.callsOf('queryAll')).toHaveLength(0);
  });

  it('reports a failed read with its reason, and Retry reloads it', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503, times: 1 }],
    });
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'error');
    expect(snap().sites).toEqual({
      status: 'error',
      message: 'The server had a problem. Please try again later.',
    });
    store.retrySites();
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => snap().sites.status === 'ok');
  });

  it('ignores Retry unless the list failed', async () => {
    const { host, store, snap } = setup();
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.retrySites();
    expect(siteListReads(host)).toHaveLength(1);
  });

  it('discards the answer to a list read that a newer connection superseded', async () => {
    const first = deferred<readonly [typeof SITE_ALPHA]>();
    const second = deferred<readonly [typeof SITE_BETA]>();
    const calls = [first, second];
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => calls.shift()?.promise ?? Promise.reject(new Error('unexpected read')),
    };
    const { store, seen, snap } = setup(createInspectorHost(), deps);
    store.adopt(CONNECTION);
    await until(() => calls.length === 1);
    store.adopt(OTHER_CONNECTION);
    first.resolve([SITE_ALPHA]);
    await until(() => calls.length === 0);
    second.resolve([SITE_BETA]);
    await until(() => snap().sites.status === 'ok');
    expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_BETA] });
    expect(JSON.stringify(seen)).not.toContain(SITE_ALPHA.id);
  });
});

describe('scan', () => {
  async function ready(host = createInspectorHost()) {
    const context = setup(host);
    context.store.adopt(CONNECTION);
    await until(() => context.snap().sites.status === 'ok');
    return context;
  }

  it('scans an active site with the real reader and keeps its facts', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_ALPHA, progress: null });
    await until(() => snap().scan.status === 'done');
    const { scan } = snap();
    if (scan.status !== 'done') throw new Error('expected a finished scan');
    expect(scan.facts.scanId).toMatch(new RegExp(`^connection-1:${SITE_ALPHA.id}:\\d+$`));
    expect(scan.facts.files.map((file) => file.name)).toEqual(['handler-01', 'handler-02']);
    expect(snap().fileId).toBeNull();
  });

  it('does not scan an inactive site or one that is not in the list', async () => {
    const { host, store, snap } = await ready();
    store.selectSite(SITE_RETIRED);
    store.selectSite({ ...SITE_ALPHA, id: guid(99) });
    expect(snap().scan).toEqual({ status: 'none' });
    expect(componentReads(host)).toHaveLength(0);
  });

  it('publishes progress while a scan runs', async () => {
    const finish = deferred<SiteFacts>();
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: (_host, _connection, _site, _scanId, onProgress) => {
        onProgress({ scanned: 1, total: 3, inventoryComplete: false });
        return finish.promise;
      },
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => {
      const { scan } = snap();
      return scan.status === 'scanning' && scan.progress !== null;
    });
    expect(snap().scan).toMatchObject({
      progress: { scanned: 1, total: 3, inventoryComplete: false },
    });
    finish.resolve(siteFacts());
    await until(() => snap().scan.status === 'done');
  });

  it('replaces the results, the file selection and the marks on a rescan', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.selectFile(guid(0x1002));
    store.setReviewed(MARK, true);
    const generation = snap().generation;
    store.rescan();
    expect(snap().scan.status).toBe('scanning');
    expect(snap()).toMatchObject({ fileId: null });
    expect(snap().marks.size).toBe(0);
    expect(snap().generation).toBeGreaterThan(generation);
    await until(() => snap().scan.status === 'done');
  });

  it('replaces the results and marks when a different site is selected', async () => {
    const { store, snap } = await ready();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.setReviewed(MARK, true);
    store.selectSite(SITE_BETA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    expect(snap().marks.size).toBe(0);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
  });

  it('adds and removes review marks only once there are results, and counts each change', async () => {
    const { store, snap } = await ready();
    store.setReviewed(MARK, true);
    store.selectFile('x');
    expect(snap().marks.size).toBe(0);
    expect(snap().fileId).toBeNull();
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    const generation = snap().generation;
    store.setReviewed(MARK, true);
    expect(snap().marks.has(MARK)).toBe(true);
    expect(snap().generation).toBe(generation + 1);
    store.setReviewed(MARK, false);
    expect(snap().marks.size).toBe(0);
    store.selectFile(guid(0x1002));
    expect(snap().fileId).toBe(guid(0x1002));
  });

  it('shows a scan that fails as failed, and a rescan can recover', async () => {
    let fail = true;
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(siteFacts())),
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'failed');
    expect(snap().scan).toEqual({ status: 'failed', site: SITE_ALPHA });
    fail = false;
    store.rescan();
    await until(() => snap().scan.status === 'done');
  });

  it('drops the facts of a scan that finds the connection changed, and says so (ScanAbandonedError, D-14)', async () => {
    const { host, store, seen, snap } = await ready();
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'connection-changed');
    expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
    expect(seen.some((entry) => entry.scan.status === 'done')).toBe(false);
    expect(snap().ownerKey).toBe(connectionKey(CONNECTION));
    expect(snap().fileId).toBeNull();
    expect(snap().marks.size).toBe(0);
  });

  it('maps ScanAbandonedError from the reader to the connection-changed state, not a failure', async () => {
    const { store, snap } = setup(createInspectorHost(), {
      ...INSPECTOR_DEPS,
      runScan: () => Promise.reject(new ScanAbandonedError()),
    });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'connection-changed' && snap().generation > 2);
    expect(console.error).not.toHaveBeenCalled();
  });

  describe('after the connection changed under a scan (D-14)', () => {
    async function abandoned() {
      const context = setup(createInspectorHost(), {
        ...INSPECTOR_DEPS,
        runScan: () => Promise.reject(new ScanAbandonedError()),
      });
      context.store.adopt(CONNECTION);
      await until(() => context.snap().sites.status === 'ok');
      context.store.selectSite(SITE_ALPHA);
      await until(() => context.snap().scan.status === 'connection-changed');
      return context;
    }

    it('ignores rescan, so no Scan again is offered', async () => {
      const { host, store, snap } = await abandoned();
      store.rescan();
      store.selectFile(guid(0x1001));
      store.setReviewed(MARK, true);
      expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
      expect(snap().fileId).toBeNull();
      expect(snap().marks.size).toBe(0);
      expect(componentReads(host)).toHaveLength(0);
    });

    it('keeps the message through a same-identity re-read (the accepted consequence)', async () => {
      const { store, snap } = await abandoned();
      store.adopt({ ...CONNECTION, name: 'Renamed' });
      expect(snap().scan).toEqual({ status: 'connection-changed', site: SITE_ALPHA });
      expect(snap().connection?.name).toBe('Renamed');
    });

    it('leaves the state when the new identity is adopted', async () => {
      const { store, snap } = await abandoned();
      store.adopt(OTHER_CONNECTION);
      expect(snap().scan).toEqual({ status: 'none' });
      expect(snap().sites).toEqual({ status: 'loading' });
    });

    it('leaves the state when a site is chosen', async () => {
      const { store, snap } = await abandoned();
      store.selectSite(SITE_BETA);
      expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    });
  });
});

describe('site list loads (D-16 A)', () => {
  /** `listSites` answers from a queue of deferreds, so a test controls each read. */
  function queued() {
    const reads: ReturnType<typeof deferred<readonly SiteRef[]>>[] = [];
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => {
        const read = deferred<readonly SiteRef[]>();
        reads.push(read);
        return read.promise;
      },
    };
    return { deps, reads };
  }

  async function listed(host = createInspectorHost()) {
    const { deps, reads } = queued();
    const context = setup(host, deps);
    context.store.adopt(CONNECTION);
    await until(() => reads.length === 1);
    reads[0]?.resolve([SITE_ALPHA, SITE_BETA]);
    await until(() => context.snap().sites.status === 'ok');
    return { ...context, reads };
  }

  it('does not reload for a same-identity adopt, however often the connection is re-read', async () => {
    const { store, snap, reads } = await listed();
    const before = snap();
    store.adopt({ ...CONNECTION });
    store.adopt({ ...CONNECTION, name: 'Renamed' });
    store.adopt({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await Promise.resolve();
    expect(reads).toHaveLength(1);
    expect(snap().sites).toBe(before.sites);
    expect(snap().connection).toMatchObject({ name: 'Renamed', environment: 'Production' });
  });

  it('leaves results, marks, the selection and a running scan alone for a same-identity adopt', async () => {
    const host = createInspectorHost();
    const { store, snap, reads } = await listed(host);
    store.selectSite(SITE_ALPHA);
    await until(() => snap().scan.status === 'done');
    store.selectFile(guid(0x1002));
    store.setReviewed(MARK, true);
    const before = snap();
    store.adopt({ ...CONNECTION, name: 'Renamed' });
    await Promise.resolve();
    expect(reads).toHaveLength(1);
    expect(snap().scan).toBe(before.scan);
    expect(snap().marks).toBe(before.marks);
    expect(snap().fileId).toBe(before.fileId);
    expect(snap().generation).toBe(before.generation);
  });

  it('reloads a failed list in the open on Retry', async () => {
    const { deps, reads } = queued();
    const { store, snap } = setup(createInspectorHost(), deps);
    store.adopt(CONNECTION);
    await until(() => reads.length === 1);
    reads[0]?.reject(new Error('boom'));
    await until(() => snap().sites.status === 'error');
    store.retrySites();
    expect(snap().sites).toEqual({ status: 'loading' });
    await until(() => reads.length === 2);
    reads[1]?.resolve([SITE_ALPHA]);
    await until(() => snap().sites.status === 'ok');
  });
});

describe('connection identity (AC-7.6)', () => {
  async function scanned() {
    const context = setup();
    context.store.adopt(CONNECTION);
    await until(() => context.snap().sites.status === 'ok');
    context.store.selectSite(SITE_ALPHA);
    await until(() => context.snap().scan.status === 'done');
    context.store.selectFile(guid(0x1002));
    context.store.setReviewed(MARK, true);
    return context;
  }

  it('keeps results and marks for a rename or relabel with the same id and URL', async () => {
    const { host, store, snap } = await scanned();
    const before = snap();
    store.adopt({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    expect(snap().connection).toMatchObject({ name: 'Renamed', environment: 'Production' });
    expect(snap().scan).toBe(before.scan);
    expect(snap().marks).toBe(before.marks);
    expect(snap().fileId).toBe(before.fileId);
    expect(snap().sites).toBe(before.sites);
    expect(siteListReads(host)).toHaveLength(1);
  });

  it.each<[string, Connection | null]>([
    ['a different id', { ...CONNECTION, id: 'connection-9' }],
    ['a different URL', { ...CONNECTION, url: 'https://other.crm.dynamics.com' }],
    ['a successful null', null],
  ])('discards results, marks and the file selection for %s', async (_name, next) => {
    const { host, store, snap } = await scanned();
    const generation = snap().generation;
    store.adopt(next);
    expect(snap().scan).toEqual({ status: 'none' });
    expect(snap().marks.size).toBe(0);
    expect(snap().fileId).toBeNull();
    expect(snap().generation).toBeGreaterThan(generation);
    if (next === null) {
      expect(snap().sites).toEqual({ status: 'idle' });
    } else {
      await until(() => snap().sites.status === 'ok');
      expect(siteListReads(host)).toHaveLength(2);
    }
  });
});

describe('switching away during a delayed scan', () => {
  it('aborts the old scan and never starts new reads until the old ones settled (four at most)', async () => {
    const host = createInspectorHost();
    const { store, seen, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.adopt(OTHER_CONNECTION);
    expect(snap()).toMatchObject({ scan: { status: 'none' }, sites: { status: 'loading' } });
    await until(() => host.dataReads.inFlight === 1);
    host.holdDataReads(false);
    await until(() => snap().sites.status === 'ok');
    expect(host.dataReads.peak).toBe(4);
    expect(seen.some((entry) => entry.scan.status === 'done')).toBe(false);
    expect(snap().ownerKey).toBe(connectionKey(OTHER_CONNECTION));
  });

  it('shows only the newer site when a different site is selected mid-scan', async () => {
    const host = createInspectorHost();
    const { store, seen, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.selectSite(SITE_BETA);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
    expect(
      seen.filter((entry) => entry.scan.status === 'done').every((entry) => entry.scan.status === 'done' && entry.scan.site.id === SITE_BETA.id),
    ).toBe(true);
    expect(componentReads(host).every((call) => call.query.filter?.includes(SITE_BETA.id))).toBe(
      true,
    );
    expect(host.dataReads.peak).toBe(4);
  });

  it('keeps at most four reads in flight across generations when the host ignores abort', async () => {
    const host = createInspectorHost();
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true, { ignoreAbort: true });
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.selectSite(SITE_BETA);
    host.releaseHeldDataReads(1);
    await until(() => host.dataReads.inFlight === 3);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(host.dataReads.inFlight).toBe(3);
    expect(snap().scan).toMatchObject({ status: 'scanning', site: SITE_BETA });
    host.holdDataReads(false);
    await until(() => snap().scan.status === 'done');
    expect(snap().scan).toMatchObject({ facts: { site: SITE_BETA } });
    expect(host.dataReads.peak).toBeLessThanOrEqual(4);
  });

  it('stop() aborts the scan, forgets everything and can adopt again (StrictMode remount)', async () => {
    const host = createInspectorHost();
    const { store, snap } = setup(host);
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
    host.holdDataReads(true);
    store.selectSite(SITE_ALPHA);
    await until(() => host.dataReads.inFlight === 4);
    store.stop();
    expect(snap()).toMatchObject({ ownerKey: undefined, scan: { status: 'none' } });
    host.holdDataReads(false);
    await until(() => host.dataReads.inFlight === 0);
    expect(snap().scan).toEqual({ status: 'none' });
    store.adopt(CONNECTION);
    await until(() => snap().sites.status === 'ok');
  });
});

describe('settle chain', () => {
  it('survives a previous read that rejected, so later loads still run', async () => {
    const reads: ReturnType<typeof deferred<readonly SiteRef[]>>[] = [];
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => {
        const read = deferred<readonly SiteRef[]>();
        reads.push(read);
        return read.promise;
      },
    };
    const { store, snap } = setup(createInspectorHost(), deps);
    let throws = 2;
    store.subscribe(() => {
      // A listener that throws on both the answer and the error publish makes the tracked load reject.
      const { status } = snap().sites;
      if ((status === 'ok' || status === 'error') && throws > 0) {
        throws -= 1;
        throw new Error('listener failed');
      }
    });
    store.adopt(CONNECTION);
    await until(() => reads.length === 1);
    reads[0]?.resolve([SITE_ALPHA]);
    await until(() => throws === 0);
    expect(snap().sites.status).toBe('error');
    store.retrySites();
    await until(() => reads.length === 2);
    reads[1]?.resolve([SITE_BETA]);
    await until(() => snap().sites.status === 'ok');
    expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_BETA] });
  });

  it('waits for a hung previous read for at most the settle timeout', async () => {
    vi.useFakeTimers();
    try {
      const reads: ReturnType<typeof deferred<readonly SiteRef[]>>[] = [];
      const deps: InspectorDeps = {
        ...INSPECTOR_DEPS,
        settleTimeoutMs: 1_000,
        listSites: () => {
          const read = deferred<readonly SiteRef[]>();
          reads.push(read);
          return read.promise;
        },
      };
      const { store, snap } = setup(createInspectorHost(), deps);
      store.adopt(CONNECTION);
      await vi.advanceTimersByTimeAsync(0);
      expect(reads).toHaveLength(1);
      store.adopt(OTHER_CONNECTION);
      await vi.advanceTimersByTimeAsync(999);
      expect(reads).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(reads).toHaveLength(2);
      reads[1]?.resolve([SITE_BETA]);
      await vi.advanceTimersByTimeAsync(0);
      expect(snap().sites).toEqual({ status: 'ok', sites: [SITE_BETA] });
    } finally {
      vi.useRealTimers();
    }
  });
});
