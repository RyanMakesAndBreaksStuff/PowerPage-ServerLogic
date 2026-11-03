import type { FakeHostControls } from '@/services/pptb/fakeHost';
import type { Connection, PptbHost } from '@/services/pptb/host.types';
import { HostCallError } from '@/services/pptb/hostErrors';

type FakeHost = PptbHost & FakeHostControls;

/** `ok` answers at once, `reject` fails the way the adapter does, `hold` parks each read until the test settles it. */
export type ConnectionReadMode = 'ok' | 'reject' | 'hold';

type ParkedRead = {
  resolve: (value: Connection | null) => void;
  reject: (error: Error) => void;
};

export type DataReadStats = { started: number; inFlight: number; peak: number };

/**
 * A test-only wrapper around the fake host. The fake answers every call after one microtask and its
 * `getActiveConnection` cannot fail, so it cannot show a refresh that rejects or a scan that is still
 * running. This wrapper adds both without changing `src/services/pptb/`.
 */
export type GatedHost = FakeHost & {
  setConnectionRead(mode: ConnectionReadMode): void;
  /** How many `getActiveConnection` reads have been parked in `hold` mode so far. */
  readonly parkedConnectionReads: number;
  settleConnectionRead(index: number, value: Connection | null): void;
  rejectConnectionRead(index: number): void;
  /**
   * While true, `queryAll` and `downloadFileColumn` park until the flag is turned off or their signal aborts.
   * With `ignoreAbort` a parked read keeps waiting after its signal fires, as an adapter call already in flight
   * does (the adapter cannot interrupt a `queryData` in progress); only turning the hold off or `releaseHeldDataReads` releases it.
   */
  holdDataReads(hold: boolean, options?: { ignoreAbort?: boolean }): void;
  /** Releases the oldest `count` parked data reads and keeps the hold on, so a test can settle reads one at a time. */
  releaseHeldDataReads(count: number): void;
  readonly dataReads: DataReadStats;
  /** While true, `saveFile` parks before it reaches the fake; the fake's `save` behaviour applies when released. */
  holdSaves(hold: boolean): void;
  /** Releases the oldest `count` parked saves and keeps the hold on. */
  releaseHeldSaves(count: number): void;
  readonly pendingSaves: number;
};

export function gateHost(base: FakeHost): GatedHost {
  let mode: ConnectionReadMode = 'ok';
  let hold = false;
  let ignoreAbort = false;
  const parked: ParkedRead[] = [];
  const waiting = new Set<() => void>();
  const stats: DataReadStats = { started: 0, inFlight: 0, peak: 0 };
  let holdingSaves = false;
  const parkedSaves: (() => void)[] = [];

  async function gated<T>(signal: AbortSignal | undefined, work: () => Promise<T>): Promise<T> {
    stats.started += 1;
    stats.inFlight += 1;
    stats.peak = Math.max(stats.peak, stats.inFlight);
    try {
      if (hold) {
        const honourAbort = !ignoreAbort;
        await new Promise<void>((resolve, reject) => {
          const release = (): void => {
            signal?.removeEventListener('abort', cancel);
            waiting.delete(release);
            resolve();
          };
          const cancel = (): void => {
            waiting.delete(release);
            reject(new DOMException('Scan cancelled.', 'AbortError'));
          };
          if (honourAbort && signal?.aborted === true) {
            cancel();
            return;
          }
          waiting.add(release);
          if (honourAbort) signal?.addEventListener('abort', cancel, { once: true });
        });
      }
      return await work();
    } finally {
      stats.inFlight -= 1;
    }
  }

  return {
    ...base,
    getActiveConnection: () => {
      const answer = base.getActiveConnection();
      if (mode === 'ok') return answer;
      if (mode === 'reject') {
        return answer.then(() =>
          Promise.reject(new HostCallError('Host call failed: getActiveConnection.')),
        );
      }
      return new Promise<Connection | null>((resolve, reject) => {
        parked.push({ resolve, reject });
      });
    },
    queryAll: (query, signal) => gated(signal, () => base.queryAll(query, signal)),
    downloadFileColumn: (ref, signal) =>
      gated(signal, () => base.downloadFileColumn(ref, signal)),
    saveFile: async (defaultName, content, filters) => {
      if (holdingSaves) {
        await new Promise<void>((resolve) => {
          parkedSaves.push(resolve);
        });
      }
      return base.saveFile(defaultName, content, filters);
    },
    setConnectionRead: (next) => {
      mode = next;
    },
    get parkedConnectionReads() {
      return parked.length;
    },
    settleConnectionRead: (index, value) => {
      parked[index]?.resolve(value);
    },
    rejectConnectionRead: (index) => {
      parked[index]?.reject(new HostCallError('Host call failed: getActiveConnection.'));
    },
    holdDataReads: (next, options) => {
      hold = next;
      ignoreAbort = next && options?.ignoreAbort === true;
      if (!hold) for (const release of [...waiting]) release();
    },
    releaseHeldDataReads: (count) => {
      for (const release of [...waiting].slice(0, count)) release();
    },
    get dataReads() {
      return stats;
    },
    holdSaves: (next) => {
      holdingSaves = next;
      if (!holdingSaves) for (const release of parkedSaves.splice(0)) release();
    },
    releaseHeldSaves: (count) => {
      for (const release of parkedSaves.splice(0, count)) release();
    },
    get pendingSaves() {
      return parkedSaves.length;
    },
  };
}
