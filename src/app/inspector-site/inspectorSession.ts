import {
  BUILD_FAILED_BODY,
  EXPORT_CANCELLED_BODY,
  EXPORT_CANCELLED_TITLE,
  EXPORT_SLOW_BODY,
  EXPORT_SLOW_TITLE,
  SAVE_FAILED_BODY,
} from '@/features/inspector/export/exportCopy';
import { evaluateSite } from '@/features/inspector/model/rules';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import { connectionKey } from '@/session/useActiveConnection';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, FileFilter, Notice, PptbHost } from '@/services/pptb/host.types';
import { errorName } from '@/services/pptb/hostErrors';
import type { ReviewKey, SiteRef } from '@/types/inspector';
import type { ReportFormat, ReportOptions } from '@/types/report';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import type { ExportJob, InspectorActions, InspectorSnapshot } from '@/types/inspectorSession';

export const EMPTY_MARKS: ReadonlySet<ReviewKey> = new Set<ReviewKey>();

export const INITIAL_SNAPSHOT: InspectorSnapshot = {
  ownerKey: undefined,
  connection: null,
  sites: { status: 'idle' },
  scan: { status: 'none' },
  fileId: null,
  marks: EMPTY_MARKS,
  generation: 0,
  exportJob: null,
  exportStaleCloses: 0,
};

/** AC-9.1 defaults apart from the scope, which follows the file selection. Every open starts from them (E-09). */
const EXPORT_DEFAULTS = {
  format: 'markdown',
  questions: true,
  snapshot: true,
  redact: false,
} as const satisfies Omit<ReportOptions, 'scope' | 'fileId'>;

const EXPORT_FILTERS = {
  markdown: { name: 'Markdown', extensions: ['md'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
} as const satisfies Record<ReportFormat, FileFilter>;

/** E-11 B: a build that took longer than this is reported as slow once it returns. */
const EXPORT_WATCHDOG_MS = 5_000;

/** Freezes `value` and everything reachable from it, and returns it with its type unchanged. */
function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    const members: readonly unknown[] = Object.values(value);
    for (const member of members) freeze(member);
  }
  return value;
}

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

/** How long a new read waits for the previous generation's reads to settle before it starts anyway. */
const SETTLE_TIMEOUT_MS = 10_000;

/**
 * The one owner of the selected site, the scan generation and its AbortController, the facts, the file
 * selection and the review marks. It is plain TypeScript so the async lifecycle can be tested without React.
 *
 * Reads: a superseded scan is aborted. Each generation runs four reads at most (FR-7), `runScan` settles only
 * after every read it started has settled (scan.ts settle-all, B11a), and the next scan or site-list read
 * waits for that, so reads across generations stay at four.
 */
export function createInspectorStore(
  host: PptbHost,
  deps: InspectorDeps,
  notify: (n: Notice) => void,
): InspectorStore {
  let snapshot: InspectorSnapshot = INITIAL_SNAPSHOT;
  let listToken = 0;
  let controller: AbortController | null = null;
  let settled: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const settleTimeoutMs = deps.settleTimeoutMs ?? SETTLE_TIMEOUT_MS;

  const publish = (patch: Partial<InspectorSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of [...listeners]) listener();
  };

  /**
   * Publishes a patch that replaces what a report would capture (a generation bump), and is the one place that
   * cancels an export for it: an idle or building job is removed, a saving job is kept with its dialog closed
   * (the host owns the save, AC-9.8). If the dialog was open it counts a stale close. Only a job that is really
   * cancelled toasts, open or not, so a building job whose dialog was closed still says so; a saving job closes
   * silently and its own outcome toast follows. A closed idle job is already gone, so it stays silent.
   */
  const invalidateExport = (patch: Partial<InspectorSnapshot>): void => {
    const job = snapshot.exportJob;
    if (job === null) {
      publish(patch);
      return;
    }
    const saving = job.phase === 'saving';
    const exportJob = saving ? { ...job, open: false } : null;
    const exportStaleCloses = snapshot.exportStaleCloses + (job.open ? 1 : 0);
    publish({ ...patch, exportJob, exportStaleCloses });
    if (!saving) notify({ title: EXPORT_CANCELLED_TITLE, body: EXPORT_CANCELLED_BODY, type: 'info' });
  };

  /** A job is identified by its captured result, which survives the `open: false` and phase copies. */
  const isCurrent = (job: ExportJob): boolean => snapshot.exportJob?.result === job.result;

  async function runExport(job: ExportJob): Promise<void> {
    const { result, options } = job;
    let name = 'the report'; // Stands in for the filename until it is built, so a failure there still has a title.
    let saving = false;
    // A rejected close-guard call was already logged by the adapter; the export proceeds either way (E-07 B).
    host.preventClose().catch(noop);
    try {
      name = deps.reportFileNameBeforeBuild(result, options);
      // Lets React paint the busy state before a synchronous build blocks the thread.
      await deps.yieldToHost();
      if (!isCurrent(job)) return;
      const startedAt = deps.now();
      const model = deps.buildReportModel(result, options, startedAt);
      const content =
        options.format === 'markdown' ? deps.renderMarkdown(model) : deps.renderPdf(model);
      // The build blocks the thread, so no timer can fire during it (N4): it is timed and reported once it returns.
      const slow =
        deps.now().getTime() - startedAt.getTime() > (deps.exportWatchdogMs ?? EXPORT_WATCHDOG_MS);
      // Lets a host answer that arrived during the build invalidate the job before the handoff (E-04 B).
      await deps.yieldToHost();
      const current = snapshot.exportJob;
      if (current?.result !== result) return;
      if (slow) notify({ title: EXPORT_SLOW_TITLE, body: EXPORT_SLOW_BODY, type: 'warning' });
      saving = true;
      publish({ exportJob: { ...current, phase: 'saving' } });
      const saved = await host.saveFile(name, content, [EXPORT_FILTERS[options.format]]);
      if (!isCurrent(job)) return;
      publish({ exportJob: null });
      if (saved.status === 'saved') notify({ title: `${name} exported`, body: '', type: 'success' });
    } catch (error: unknown) {
      // Only the error's name: messages can carry bodies, URLs or tokens, and the toast shows a plain reason.
      console.error(errorName(error));
      if (!isCurrent(job)) return;
      publish({ exportJob: null });
      notify({
        title: `Couldn't save ${name}`,
        body: saving ? SAVE_FAILED_BODY : BUILD_FAILED_BODY,
        type: 'error',
      });
    } finally {
      host.releasePreventClose().catch(noop);
    }
  }

  /**
   * Later reads wait for this work; for a scan, until its `runScan` has fully settled. Each work item awaits
   * the one before it, so the chain is transitive, and it never rejects, so one failure cannot poison it.
   */
  const track = (work: Promise<void>): void => {
    settled = work.then(noop, noop);
  };

  /** Waits for `previous` to settle, but no longer than the settle timeout, so a hung host read cannot stall. */
  const settle = async (previous: Promise<void>): Promise<void> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const elapsed = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, settleTimeoutMs);
    });
    try {
      await Promise.race([previous, elapsed]);
    } finally {
      clearTimeout(timer);
    }
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
        await settle(previous);
        if (token !== listToken) return;
        try {
          const sites = await deps.listSites(host);
          if (token !== listToken) return;
          const selected = snapshot.scan.status === 'none' ? null : snapshot.scan.site;
          if (selected !== null && !sites.some((candidate) => candidate.id === selected.id)) {
            // D-19 C: a successful list that omits the selected site drops the selection and everything under it.
            abortScan();
            invalidateExport({
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
    invalidateExport({
      scan: { status: 'scanning', site, progress: null },
      fileId: null,
      marks: EMPTY_MARKS,
      generation: mine,
    });
    const previous = settled;
    track(
      (async () => {
        await settle(previous);
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
            invalidateExport({ scan: { status: 'connection-changed', site }, generation: mine + 1 });
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
      invalidateExport({
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
      // Teardown, not a results change: the export job goes with everything else and a pending save settles silently.
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
      invalidateExport({ marks, generation: snapshot.generation + 1 });
    },

    openExport: () => {
      const { scan, marks, fileId, exportJob } = snapshot;
      if (scan.status !== 'done' || exportJob !== null) return;
      const result = evaluateSite(scan.facts, marks);
      if (result.files.length === 0) return;
      const selected = result.files.some((candidate) => candidate.fileId === fileId) ? fileId : null;
      publish({
        exportJob: {
          result: freeze(structuredClone(result)),
          options: {
            ...EXPORT_DEFAULTS,
            scope: selected === null ? 'site' : 'file',
            fileId: selected,
          },
          phase: 'idle',
          open: true,
        },
      });
    },

    setExportOptions: (patch) => {
      const job = snapshot.exportJob;
      if (job?.phase !== 'idle') return;
      const { scope = job.options.scope, ...rest } = patch;
      publish({
        exportJob: {
          ...job,
          options: {
            ...job.options,
            ...rest,
            scope: scope === 'file' && job.options.fileId === null ? job.options.scope : scope,
          },
        },
      });
    },

    closeExport: () => {
      const job = snapshot.exportJob;
      if (!job?.open) return;
      publish({ exportJob: job.phase === 'idle' ? null : { ...job, open: false } });
    },

    submitExport: () => {
      const job = snapshot.exportJob;
      if (job?.phase !== 'idle' || !job.open) return;
      const building: ExportJob = { ...job, phase: 'building' };
      publish({ exportJob: building });
      void runExport(building);
    },
  };
}
