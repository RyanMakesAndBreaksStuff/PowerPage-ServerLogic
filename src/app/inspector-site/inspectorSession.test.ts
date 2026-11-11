import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionKey } from '@/session/useActiveConnection';
import {
  BUILD_FAILED_BODY,
  EXPORT_CANCELLED_BODY,
  EXPORT_CANCELLED_TITLE,
  EXPORT_SLOW_BODY,
  EXPORT_SLOW_TITLE,
  SAVE_FAILED_BODY,
} from '@/features/inspector/export/exportCopy';
import { file, siteFacts } from '@/features/inspector/model/fixtures';
import { evaluateSite } from '@/features/inspector/model/rules';
import { buildReportModel } from '@/features/inspector/report/buildReportModel';
import { EXPORTED_AT } from '@/features/inspector/report/reportFixtures';
import { reportFileName, reportFileNameBeforeBuild } from '@/features/inspector/report/reportFileName';
import { renderMarkdown } from '@/features/inspector/report/renderMarkdown';
import { renderPdf } from '@/features/inspector/report/renderPdf';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import type { Connection, Notice } from '@/services/pptb/host.types';
import { HostCallError } from '@/services/pptb/hostErrors';
import { deferred } from '@/test/deferred';
import { fixedDeps } from '@/test/fixedDeps';
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
import type { ReportFormat, ReportOptions, ReportScope } from '@/types/report';
import { INSPECTOR_DEPS } from './inspectorDeps';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorStore } from './inspectorSession';
import type { InspectorStore } from './inspectorSession';
import type { ExportJob, InspectorSnapshot } from '@/types/inspectorSession';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function setup(
  host: GatedHost = createInspectorHost(),
  deps: InspectorDeps = INSPECTOR_DEPS,
  notify: (n: Notice) => void = vi.fn(),
) {
  const store = createInspectorStore(host, deps, notify);
  const seen: InspectorSnapshot[] = [];
  store.subscribe(() => {
    seen.push(store.getSnapshot());
  });
  const snap = () => store.getSnapshot();
  return { host, store, seen, snap };
}

/**
 * Polls until `check` holds. The budget outlasts a PDF export's synchronous render (its own AC-9.9 budget is 5 s,
 * and under full-suite load it passes vi.waitFor's 1 s default), while staying inside the 15 s test timeout.
 */
const until = (check: () => boolean) =>
  vi.waitFor(
    () => {
      expect(check()).toBe(true);
    },
    { timeout: 10_000 },
  );

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

describe('export job (P5.7)', () => {
  const CUSTOMER = 'customer-summary';
  const FACTS = siteFacts({
    files: [file({ id: CUSTOMER, name: CUSTOMER }), file({ id: 'order-sync', name: 'order-sync' })],
  });
  const DEFAULTS = { format: 'markdown', questions: true, snapshot: true, redact: false } as const;
  const MARKDOWN_FILTER = [{ name: 'Markdown', extensions: ['md'] }];
  const PDF_FILTER = [{ name: 'PDF', extensions: ['pdf'] }];
  const cancelled: Notice = { title: EXPORT_CANCELLED_TITLE, body: EXPORT_CANCELLED_BODY, type: 'info' };

  function exportDeps(patch: Partial<InspectorDeps>, facts: SiteFacts): InspectorDeps {
    return {
      ...fixedDeps(facts, [SITE_ALPHA, SITE_BETA]),
      now: () => EXPORTED_AT,
      exportWatchdogMs: 5_000,
      ...patch,
    };
  }

  type Finished = { host?: GatedHost; facts?: SiteFacts; fileId?: string | null };

  /** A store with a finished Alpha scan of two files, `customer-summary` selected unless `fileId` says otherwise. */
  async function finishedStore(patch: Partial<InspectorDeps> = {}, options: Finished = {}) {
    const notify = vi.fn<(n: Notice) => void>();
    const host = options.host ?? createInspectorHost();
    const context = setup(host, exportDeps(patch, options.facts ?? FACTS), notify);
    context.store.adopt(CONNECTION);
    await until(() => context.snap().sites.status === 'ok');
    context.store.selectSite(SITE_ALPHA);
    await until(() => context.snap().scan.status === 'done');
    const fileId = options.fileId === undefined ? CUSTOMER : options.fileId;
    if (fileId !== null) context.store.selectFile(fileId);
    const job = (): ExportJob => {
      const current = context.snap().exportJob;
      if (current === null) throw new Error('expected an export job');
      return current;
    };
    const settled = (count = 1) =>
      until(() => host.callsOf('releasePreventClose').length === count);
    const toasts = (type: Notice['type']) =>
      notify.mock.calls.map(([notice]) => notice).filter((notice) => notice.type === type);
    return { ...context, notify, job, settled, toasts };
  }

  const guardCalls = (host: GatedHost) =>
    host.calls
      .filter((call) => call.method === 'preventClose' || call.method === 'releasePreventClose')
      .map((call) => call.method);

  it('opens a job for a finished scan with files: a frozen evaluated clone, the selected file and the spec defaults', async () => {
    const { store, snap, job } = await finishedStore();
    store.openExport();
    const opened = job();
    const { scan, marks } = snap();
    if (scan.status !== 'done') throw new Error('expected a finished scan');
    expect(opened).toEqual({
      result: evaluateSite(scan.facts, marks),
      options: { scope: 'file', fileId: CUSTOMER, ...DEFAULTS },
      phase: 'idle',
      open: true,
    });
    expect(Object.isFrozen(opened.result)).toBe(true);
    expect(Object.isFrozen(opened.result.facts.site)).toBe(true);
    expect(Object.isFrozen(opened.result.files[0]?.findings[0] ?? {})).toBe(true);
    const before = structuredClone(opened.result);
    store.setReviewed(`${CUSTOMER}:webRole`, true);
    expect(snap().marks.size).toBe(1);
    expect(opened.result).toEqual(before);
  });

  it('defaults to This file when the selected id is in the result, else Site summary; scope cannot become file without a selection', async () => {
    const none = await finishedStore({}, { fileId: null });
    none.store.openExport();
    expect(none.job()).toMatchObject({ options: { scope: 'site', fileId: null } });
    none.store.setExportOptions({ scope: 'file' });
    expect(none.job().options.scope).toBe('site');

    const missing = await finishedStore({}, { fileId: 'not-in-the-result' });
    missing.store.openExport();
    expect(missing.job()).toMatchObject({ options: { scope: 'site', fileId: null } });

    const chosen = await finishedStore({}, { fileId: 'order-sync' });
    chosen.store.openExport();
    expect(chosen.job()).toMatchObject({ options: { scope: 'file', fileId: 'order-sync' } });
    chosen.store.setExportOptions({ scope: 'site' });
    expect(chosen.job().options).toEqual({ scope: 'site', fileId: 'order-sync', ...DEFAULTS });
    chosen.store.setExportOptions({ scope: 'file' });
    expect(chosen.job().options.scope).toBe('file');
  });

  it('resets to the spec defaults on every open (E-09)', async () => {
    const { store, snap, job } = await finishedStore();
    store.openExport();
    store.setExportOptions({ scope: 'site', format: 'pdf', questions: false, snapshot: false, redact: true });
    expect(job().options).toEqual({
      scope: 'site',
      fileId: CUSTOMER,
      format: 'pdf',
      questions: false,
      snapshot: false,
      redact: true,
    });
    store.closeExport();
    expect(snap().exportJob).toBeNull();
    store.openExport();
    expect(job().options).toEqual({ scope: 'file', fileId: CUSTOMER, ...DEFAULTS });
  });

  it('refuses to open with zero files, before a scan is done, or while a job exists', async () => {
    const empty = await finishedStore({}, { facts: siteFacts({ files: [] }), fileId: null });
    empty.store.openExport();
    expect(empty.snap().exportJob).toBeNull();

    const early = setup(createInspectorHost(), exportDeps({}, FACTS));
    early.store.openExport();
    early.store.adopt(CONNECTION);
    await until(() => early.snap().sites.status === 'ok');
    early.store.openExport();
    expect(early.snap().exportJob).toBeNull();
    early.store.selectSite(SITE_ALPHA);
    expect(early.snap().scan.status).toBe('scanning');
    early.store.openExport();
    expect(early.snap().exportJob).toBeNull();
    await until(() => early.snap().scan.status === 'done');

    const { store, snap } = await finishedStore();
    store.openExport();
    store.setExportOptions({ format: 'pdf' });
    const first = snap().exportJob;
    store.openExport();
    expect(snap().exportJob).toBe(first);
  });

  type Combination = Omit<ReportOptions, 'fileId'>;
  const SCOPES: readonly ReportScope[] = ['file', 'site'];
  const FORMATS: readonly ReportFormat[] = ['markdown', 'pdf'];
  const FLAGS = [true, false];
  const COMBINATIONS: readonly Combination[] = SCOPES.flatMap((scope) =>
    FORMATS.flatMap((format) =>
      FLAGS.flatMap((questions) =>
        FLAGS.flatMap((snapshot) =>
          FLAGS.map((redact) => ({ scope, format, questions, snapshot, redact })),
        ),
      ),
    ),
  );

  it('covers all 32 combinations', () => {
    expect(new Set(COMBINATIONS.map((combination) => JSON.stringify(combination))).size).toBe(32);
  });

  it.each(COMBINATIONS)(
    'saves every scope, format and include combination with the captured state: $scope $format questions=$questions snapshot=$snapshot redact=$redact',
    async (combination) => {
      const build = vi.fn(buildReportModel);
      const { host, store, snap, notify, job, settled, toasts } = await finishedStore({
        buildReportModel: build,
      });
      store.openExport();
      store.setExportOptions(combination);
      const captured = job();
      const options: ReportOptions = { ...combination, fileId: CUSTOMER };
      expect(captured.options).toEqual(options);
      store.submitExport();
      await settled();
      expect(build).toHaveBeenCalledTimes(1);
      expect(build.mock.calls[0]?.[0]).toBe(captured.result);
      expect(build).toHaveBeenCalledWith(captured.result, options, EXPORTED_AT);
      const model = buildReportModel(captured.result, options, EXPORTED_AT);
      const name = reportFileNameBeforeBuild(captured.result, options);
      expect(name).toBe(reportFileName(model));
      const saves = host.callsOf('saveFile');
      expect(saves).toHaveLength(1);
      const save = saves[0];
      expect(save?.defaultName).toBe(name);
      if (combination.format === 'markdown') {
        expect(save?.content).toBe(renderMarkdown(model));
        expect(save?.filters).toEqual(MARKDOWN_FILTER);
      } else {
        const content = save?.content;
        if (!(content instanceof Uint8Array)) throw new Error('expected PDF bytes');
        expect(new TextDecoder().decode(content.subarray(0, 5))).toBe('%PDF-');
        expect(save?.filters).toEqual(PDF_FILTER);
      }
      expect(notify).toHaveBeenCalledTimes(1);
      expect(toasts('success')).toEqual([{ title: `${name} exported`, body: '', type: 'success' }]);
      expect(snap().exportJob).toBeNull();
      expect(guardCalls(host)).toEqual(['preventClose', 'releasePreventClose']);
    },
  );

  it('settles a PDF export whose render runs longer than one second (full-suite load)', async () => {
    // A blocking 1.2 s render stands in, deterministically, for the real one running past 1 s under load.
    const { host, store, snap, toasts, settled } = await finishedStore({
      renderPdf: (...args) => {
        const started = performance.now();
        while (performance.now() - started < 1_200) {
          // busy wait: the real render is synchronous too
        }
        return renderPdf(...args);
      },
    });
    store.openExport();
    store.setExportOptions({ format: 'pdf' });
    store.submitExport();
    await settled();
    expect(host.savedFiles).toHaveLength(1);
    expect(toasts('success')).toHaveLength(1);
    expect(toasts('warning')).toHaveLength(0);
    expect(snap().exportJob).toBeNull();
  });

  it('paints the busy phase before the build runs', async () => {
    const order: string[] = [];
    const probe = { phase: (): string => 'none' };
    const { host, store, job, settled } = await finishedStore({
      yieldToHost: async () => {
        await INSPECTOR_DEPS.yieldToHost();
        order.push('yield');
      },
      buildReportModel: (...args) => {
        order.push(`build:${probe.phase()}`);
        return buildReportModel(...args);
      },
    });
    probe.phase = () => store.getSnapshot().exportJob?.phase ?? 'none';
    store.openExport();
    store.submitExport();
    expect(job().phase).toBe('building');
    expect(host.callsOf('preventClose')).toHaveLength(1);
    expect(order).toEqual([]);
    await settled();
    expect(order).toEqual(['yield', 'build:building', 'yield']);
  });

  type Trigger = readonly [string, (store: InspectorStore) => void];
  const TRIGGERS: readonly Trigger[] = [
    [
      'a rescan',
      (store) => {
        store.rescan();
      },
    ],
    [
      'a different connection',
      (store) => {
        store.adopt(OTHER_CONNECTION);
      },
    ],
    [
      'a successful null connection',
      (store) => {
        store.adopt(null);
      },
    ],
    [
      'another site',
      (store) => {
        store.selectSite(SITE_BETA);
      },
    ],
  ];
  const STALE_CASES = (['idle', 'building'] as const).flatMap((phase) =>
    TRIGGERS.map(([name, trigger]) => [phase, name, trigger] as const),
  );

  it.each(STALE_CASES)(
    'closes an open dialog with one info toast and counts a stale close when the results are cleared while %s, by %s',
    async (phase, _name, trigger) => {
      const holder: { store: InspectorStore | null } = { store: null };
      const { host, store, snap, notify, settled } = await finishedStore({
        renderMarkdown: (...args) => {
          if (holder.store !== null) trigger(holder.store);
          return renderMarkdown(...args);
        },
      });
      store.openExport();
      if (phase === 'idle') {
        trigger(store);
      } else {
        holder.store = store;
        store.submitExport();
        await settled();
      }
      expect(snap().exportJob).toBeNull();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(cancelled);
      expect(snap().exportStaleCloses).toBe(1);
      expect(host.callsOf('saveFile')).toHaveLength(0);
      expect(host.callsOf('releasePreventClose')).toHaveLength(phase === 'idle' ? 0 : 1);
    },
  );

  it('cancels silently when the results are cleared after the user already closed the dialog', async () => {
    const idle = await finishedStore();
    idle.store.openExport();
    idle.store.closeExport();
    expect(idle.snap().exportJob).toBeNull();
    idle.store.rescan();
    expect(idle.notify).not.toHaveBeenCalled();
    expect(idle.snap().exportStaleCloses).toBe(0);

    const holder: { store: InspectorStore | null } = { store: null };
    const building = await finishedStore({
      renderMarkdown: (...args) => {
        holder.store?.closeExport();
        holder.store?.rescan();
        return renderMarkdown(...args);
      },
    });
    holder.store = building.store;
    building.store.openExport();
    building.store.submitExport();
    await building.settled();
    expect(building.snap().exportJob).toBeNull();
    expect(building.notify).not.toHaveBeenCalled();
    expect(building.snap().exportStaleCloses).toBe(0);
    expect(building.host.callsOf('saveFile')).toHaveLength(0);
  });

  it.each(['save', 'cancel', 'reject'] as const)(
    'keeps a saving job through a results change, closes its dialog once without a cancelled toast, and settles a %s',
    async (outcome) => {
      const { host, store, snap, notify, job, settled, toasts } = await finishedStore();
      host.holdSaves(true);
      store.openExport();
      const captured = job();
      store.submitExport();
      await until(() => host.pendingSaves === 1);
      expect(job().phase).toBe('saving');
      store.adopt(OTHER_CONNECTION);
      expect(job()).toMatchObject({ phase: 'saving', open: false });
      expect(job().result).toBe(captured.result);
      expect(snap().exportStaleCloses).toBe(1);
      expect(notify).not.toHaveBeenCalled();
      host.setSave(outcome);
      host.releaseHeldSaves(1);
      await settled();
      expect(snap().exportJob).toBeNull();
      const name = reportFileNameBeforeBuild(captured.result, captured.options);
      const model = buildReportModel(captured.result, captured.options, EXPORTED_AT);
      expect(host.callsOf('saveFile')[0]?.content).toBe(renderMarkdown(model));
      expect(toasts('info')).toEqual([]);
      if (outcome === 'save') {
        expect(host.savedFiles[0]?.content).toBe(renderMarkdown(model));
        expect(toasts('success')).toEqual([{ title: `${name} exported`, body: '', type: 'success' }]);
      } else if (outcome === 'cancel') {
        expect(notify).not.toHaveBeenCalled();
      } else {
        expect(toasts('error')).toEqual([
          { title: `Couldn't save ${name}`, body: SAVE_FAILED_BODY, type: 'error' },
        ]);
      }
      expect(snap().exportStaleCloses).toBe(1);
    },
  );

  const FAILURES = [
    ['the model build', 'markdown', BUILD_FAILED_BODY, 'RangeError'],
    ['the Markdown render', 'markdown', BUILD_FAILED_BODY, 'RangeError'],
    ['the PDF render', 'pdf', BUILD_FAILED_BODY, 'RangeError'],
    ['a host save rejection', 'pdf', SAVE_FAILED_BODY, 'HostCallError'],
    ['a save that throws something else', 'markdown', SAVE_FAILED_BODY, 'TypeError'],
  ] as const;

  it.each(FAILURES)(
    'closes the dialog and reports %s once with a plain reason; re-opening lets another format succeed (E-08 B)',
    async (point, format, body, logged) => {
      const failing = { on: true };
      const boom = (): never => {
        throw new RangeError('internal detail');
      };
      const base = createInspectorHost();
      const host: GatedHost = {
        ...base,
        saveFile: (...args) =>
          failing.on && point === 'a save that throws something else'
            ? Promise.reject(new TypeError('internal detail'))
            : base.saveFile(...args),
      };
      if (point === 'a host save rejection') base.setSave('reject');
      const { store, snap, notify, job, settled, toasts } = await finishedStore(
        {
          buildReportModel: (...args) =>
            failing.on && point === 'the model build' ? boom() : buildReportModel(...args),
          renderMarkdown: (...args) =>
            failing.on && point === 'the Markdown render' ? boom() : renderMarkdown(...args),
          renderPdf: (...args) =>
            failing.on && point === 'the PDF render' ? boom() : renderPdf(...args),
        },
        { host },
      );
      store.openExport();
      store.setExportOptions({ format });
      const captured = job();
      const name = reportFileNameBeforeBuild(captured.result, captured.options);
      store.submitExport();
      await settled();
      expect(snap().exportJob).toBeNull();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({ title: `Couldn't save ${name}`, body, type: 'error' });
      expect(snap().exportStaleCloses).toBe(0);
      const errors = vi.mocked(console.error).mock.calls;
      expect(errors).toContainEqual([logged]);
      expect(JSON.stringify(errors)).not.toContain('internal detail');
      expect(JSON.stringify(notify.mock.calls)).not.toContain('Host call failed');
      expect(base.savedFiles).toHaveLength(0);

      failing.on = false;
      base.setSave('save');
      store.openExport();
      store.setExportOptions({ format: format === 'pdf' ? 'markdown' : 'pdf' });
      store.submitExport();
      await settled(2);
      expect(base.savedFiles).toHaveLength(1);
      expect(toasts('success')).toHaveLength(1);
      expect(snap().exportJob).toBeNull();
    },
  );

  it('shows the build reason, never the HostCallError message, for a host error thrown while building', async () => {
    const { store, notify, job, settled } = await finishedStore({
      renderMarkdown: () => {
        throw new HostCallError('Host call failed: saveFile.');
      },
    });
    store.openExport();
    const name = reportFileNameBeforeBuild(job().result, job().options);
    store.submitExport();
    await settled();
    expect(notify.mock.calls).toEqual([
      [{ title: `Couldn't save ${name}`, body: BUILD_FAILED_BODY, type: 'error' }],
    ]);
    expect(vi.mocked(console.error).mock.calls).toContainEqual(['HostCallError']);
  });

  it('settles a job whose filename cannot be built: closes it, reports one error, releases the guard and saves nothing', async () => {
    const { host, store, snap, notify, settled } = await finishedStore({
      reportFileNameBeforeBuild: () => {
        throw new RangeError('internal detail');
      },
    });
    store.openExport();
    store.submitExport();
    await settled();
    expect(snap().exportJob).toBeNull();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      title: "Couldn't save the report",
      body: BUILD_FAILED_BODY,
      type: 'error',
    });
    expect(guardCalls(host)).toEqual(['preventClose', 'releasePreventClose']);
    expect(host.callsOf('saveFile')).toEqual([]);
  });

  it('ignores a second submit and option changes while building or saving; closeExport only hides the dialog', async () => {
    const holder: { store: InspectorStore | null } = { store: null };
    const { host, store, snap, notify, job, settled, toasts } = await finishedStore({
      renderMarkdown: (...args) => {
        holder.store?.submitExport();
        holder.store?.setExportOptions({ format: 'pdf' });
        return renderMarkdown(...args);
      },
    });
    holder.store = store;
    host.holdSaves(true);
    store.openExport();
    store.submitExport();
    expect(job().phase).toBe('building');
    store.submitExport();
    store.setExportOptions({ redact: true });
    await until(() => host.pendingSaves === 1);
    expect(job()).toMatchObject({
      phase: 'saving',
      open: true,
      options: { format: 'markdown', redact: false },
    });
    store.submitExport();
    store.setExportOptions({ redact: true });
    store.closeExport();
    expect(job()).toMatchObject({ phase: 'saving', open: false, options: { redact: false } });
    expect(snap().exportStaleCloses).toBe(0);
    host.releaseHeldSaves(1);
    await settled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(toasts('success')).toHaveLength(1);
    expect(snap().exportJob).toBeNull();
    expect(host.callsOf('saveFile')).toHaveLength(1);
    expect(host.callsOf('preventClose')).toHaveLength(1);
  });

  it('closes silently on closeExport while idle and on a native cancellation; writes nothing', async () => {
    const { host, store, snap, notify, settled } = await finishedStore();
    store.openExport();
    store.closeExport();
    expect(snap().exportJob).toBeNull();
    expect(host.callsOf('preventClose')).toHaveLength(0);
    host.setSave('cancel');
    store.openExport();
    store.submitExport();
    await settled();
    expect(snap().exportJob).toBeNull();
    expect(notify).not.toHaveBeenCalled();
    expect(host.callsOf('saveFile')).toHaveLength(1);
    expect(host.savedFiles).toHaveLength(0);
  });

  describe('slow build notice (E-11 B, N4)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const flush = async (done: () => boolean) => {
      for (let step = 0; step < 50 && !done(); step += 1) await vi.advanceTimersByTimeAsync(1);
    };

    /**
     * The build is synchronous, so no timer can fire during it. This clock reads `elapsed` ms past
     * EXPORTED_AT once the PDF render has returned: the build took that long.
     */
    const timedBuild = (elapsed: number, during?: () => void): Partial<InspectorDeps> => {
      const clock = { rendered: false };
      return {
        now: () => (clock.rendered ? new Date(EXPORTED_AT.getTime() + elapsed) : EXPORTED_AT),
        renderPdf: (...args) => {
          during?.();
          clock.rendered = true;
          return renderPdf(...args);
        },
      };
    };

    it('warns once, after a build that took longer than the threshold and before the save dialog opens, then saves', async () => {
      const { host, store, snap, notify, settled, toasts } = await finishedStore(timedBuild(6_000));
      host.holdSaves(true);
      store.openExport();
      store.setExportOptions({ format: 'pdf' });
      store.submitExport();
      await until(() => host.pendingSaves === 1);
      expect(toasts('warning')).toEqual([
        { title: EXPORT_SLOW_TITLE, body: EXPORT_SLOW_BODY, type: 'warning' },
      ]);
      host.releaseHeldSaves(1);
      await settled();
      expect(toasts('success')).toHaveLength(1);
      expect(notify).toHaveBeenCalledTimes(2);
      expect(host.savedFiles).toHaveLength(1);
      expect(snap().exportJob).toBeNull();
    });

    it.each([0, 5_000])('does not warn after a build that took %i ms', async (elapsed) => {
      const { store, notify, settled, toasts } = await finishedStore(timedBuild(elapsed));
      store.openExport();
      store.setExportOptions({ format: 'pdf' });
      store.submitExport();
      await settled();
      expect(toasts('warning')).toEqual([]);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it('does not warn when the results changed during a slow build', async () => {
      const holder: { store: InspectorStore | null } = { store: null };
      const { host, store, snap, settled, toasts } = await finishedStore(
        timedBuild(6_000, () => {
          holder.store?.rescan();
        }),
      );
      holder.store = store;
      store.openExport();
      store.setExportOptions({ format: 'pdf' });
      store.submitExport();
      await settled();
      expect(toasts('warning')).toEqual([]);
      expect(toasts('info')).toEqual([cancelled]);
      expect(host.callsOf('saveFile')).toHaveLength(0);
      expect(snap().exportJob).toBeNull();
    });

    it('never warns while the host owns the save dialog', async () => {
      const { host, store, snap, settled, toasts } = await finishedStore();
      vi.useFakeTimers();
      host.holdSaves(true);
      store.openExport();
      store.submitExport();
      await flush(() => host.pendingSaves === 1);
      expect(host.pendingSaves).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(toasts('warning')).toHaveLength(0);
      expect(snap().exportJob?.phase).toBe('saving');
      vi.useRealTimers();
      host.releaseHeldSaves(1);
      await settled();
      expect(toasts('warning')).toHaveLength(0);
      expect(toasts('success')).toHaveLength(1);
    });
  });

  it('sets the host close guard for the life of a job and releases it on every outcome, including a rejected guard call', async () => {
    const host = createInspectorHost();
    host.setCloseGuard('reject');
    const { store, snap, settled, toasts } = await finishedStore({}, { host });
    store.openExport();
    store.submitExport();
    await settled();
    expect(guardCalls(host)).toEqual(['preventClose', 'releasePreventClose']);
    expect(host.savedFiles).toHaveLength(1);
    expect(toasts('success')).toHaveLength(1);
    expect(snap().exportJob).toBeNull();
  });

  it('stop() during a pending save settles it silently and releases the guard', async () => {
    const { host, store, snap, notify, settled } = await finishedStore();
    host.holdSaves(true);
    store.openExport();
    store.submitExport();
    await until(() => host.pendingSaves === 1);
    store.stop();
    expect(snap().exportJob).toBeNull();
    host.releaseHeldSaves(1);
    await settled();
    expect(notify).not.toHaveBeenCalled();
    expect(snap().exportJob).toBeNull();
    expect(host.callsOf('releasePreventClose')).toHaveLength(1);
  });
});
