import { HostReadError } from './host.types';
import type {
  Connection,
  FileColumnRef,
  FileFilter,
  HostEvent,
  Notice,
  ODataQuery,
  PptbHost,
  SaveResult,
  ThemeName,
} from './host.types';
import { HostCallError, messageForStatus, throwIfAborted } from './hostErrors';

/** Rows for one entity set: a flat list, or `pages` to model paging (the fake still returns all rows, as the contract says). */
type FakeResult =readonly unknown[] | { pages: readonly (readonly unknown[])[] };
/** Return a result to answer a query, or undefined to pass it to the next responder and then to `tables`. */
export type FakeResponder = (q: ODataQuery) => FakeResult | undefined;
/**
 * A scripted failure. It stands for a read that already used up its retries, so the fake throws at once.
 * `contains` narrows it: a substring of the query's `$filter`, or of the record id for a file download.
 * `times` fails that many calls and then lets later calls succeed; omit it to fail every matching call.
 */
export type FakeFailure = {
  operation: 'query' | 'file';
  entitySet: string;
  status: number | null;
  /** Platform-confirmed network loss. */
  transport?: boolean;
  /** Rows the fake "received" before failing; returned on the HostReadError. */
  partialRows?: readonly unknown[];
  contains?: string;
  times?: number;
};
export type NotifyBehaviour = 'ok' | 'throw' | 'reject' | 'missing';
type SaveBehaviour = 'save' | 'cancel' | 'reject';
type SimpleBehaviour ='ok' | 'reject';

export type FakeHostInit = {
  theme?: ThemeName;
  connection?: Connection | null;
  /** Canned rows by entity set, used when no responder answers. A set with no entry fails with a 404. */
  tables?: Readonly<Record<string, FakeResult>>;
  responders?: readonly FakeResponder[];
  failures?: readonly FakeFailure[];
  /** File text keyed `<entityLogicalName>/<recordId>/<fileAttributeName>`. A missing key fails with a 404. */
  fileColumns?: Readonly<Record<string, string>>;
  notify?: NotifyBehaviour;
  save?: SaveBehaviour;
  copy?: SimpleBehaviour;
  openExternal?: SimpleBehaviour;
};

type FakeCall =
  | { method: 'getTheme' }
  | { method: 'notify'; notice: Notice }
  | { method: 'copyText'; text: string }
  | {
      method: 'saveFile';
      defaultName: string;
      content: string | Uint8Array;
      filters: readonly FileFilter[];
    }
  | { method: 'openExternal'; url: string }
  | { method: 'preventClose' }
  | { method: 'releasePreventClose' }
  | { method: 'getActiveConnection' }
  | { method: 'queryAll'; query: ODataQuery; pages: number }
  | { method: 'downloadFileColumn'; ref: FileColumnRef };

type SavedFile ={ path: string; defaultName: string; content: string | Uint8Array };

export type FakeHostControls = {
  /** Delivers an event to every subscribed handler, as the real adapter does for a PPTB event. */
  emit(event: HostEvent): void;
  /** Every host call so far, in order. A failed call is recorded too. */
  readonly calls: readonly FakeCall[];
  callsOf<M extends FakeCall['method']>(method: M): readonly Extract<FakeCall, { method: M }>[];
  clearCalls(): void;
  /** Files the fake "saved", in order. A cancelled or rejected save adds nothing. */
  readonly savedFiles: readonly SavedFile[];
  listenerCount(): number;
  setTheme(theme: ThemeName): void;
  /** Changes what `getActiveConnection` returns. It does not emit; call `emit({ kind: 'connection-changed' })` too. */
  setConnection(connection: Connection | null): void;
  setSave(behaviour: SaveBehaviour): void;
  /** Applies to both `preventClose` and `releasePreventClose`. */
  setCloseGuard(behaviour: SimpleBehaviour): void;
};

function notFound(what: string): HostReadError {
  return new HostReadError(`No canned ${what}.`, 404);
}

function pagesOf(result: FakeResult): readonly (readonly unknown[])[] {
  return 'pages' in result ? result.pages : [result];
}

/**
 * An in-memory PptbHost for tests. Every failing mode rejects, as createPptbHost does, and `queryAll` returns
 * every row of the matching result without applying `$select` or `$filter`.
 */
export function createFakeHost(init: FakeHostInit = {}): PptbHost & FakeHostControls {
  let theme: ThemeName = init.theme ?? 'light';
  let connection: Connection | null = init.connection ?? null;
  const notify: NotifyBehaviour = init.notify ?? 'ok';
  let save: SaveBehaviour = init.save ?? 'save';
  const copy: SimpleBehaviour = init.copy ?? 'ok';
  const open: SimpleBehaviour = init.openExternal ?? 'ok';
  let closeGuard: SimpleBehaviour = 'ok';
  const calls: FakeCall[] = [];
  const savedFiles: SavedFile[] = [];
  const handlers = new Set<(e: HostEvent) => void>();
  const failureUses = new Map<FakeFailure, number>();

  function scriptedFailure(
    operation: 'query' | 'file',
    entitySet: string,
    text: string,
  ): HostReadError | null {
    for (const failure of init.failures ?? []) {
      if (failure.operation !== operation || failure.entitySet !== entitySet) continue;
      if (failure.contains !== undefined && !text.includes(failure.contains)) continue;
      const used = failureUses.get(failure) ?? 0;
      if (failure.times !== undefined && used >= failure.times) continue;
      failureUses.set(failure, used + 1);
      return new HostReadError(
        messageForStatus(failure.status),
        failure.status,
        failure.transport ?? false,
        failure.partialRows ?? [],
      );
    }
    return null;
  }

  return {
    getTheme: () => {
      calls.push({ method: 'getTheme' });
      return Promise.resolve(theme);
    },

    notify: (notice) => {
      calls.push({ method: 'notify', notice });
      if (notify === 'ok') return Promise.resolve();
      if (notify === 'throw')
        return Promise.reject(new TypeError('The fake host notification threw.'));
      if (notify === 'reject')
        return Promise.reject(new Error('The fake host notification was rejected.'));
      return Promise.reject(new HostCallError('Host call failed: showNotification.'));
    },

    copyText: (text) => {
      calls.push({ method: 'copyText', text });
      return copy === 'ok'
        ? Promise.resolve()
        : Promise.reject(new HostCallError('Host call failed: copyToClipboard.'));
    },

    saveFile: (defaultName, content, filters) => {
      calls.push({ method: 'saveFile', defaultName, content, filters });
      if (save === 'cancel') return Promise.resolve<SaveResult>({ status: 'cancelled' });
      if (save === 'reject')
        return Promise.reject(new HostCallError('Host call failed: saveFile.'));
      const path = `C:\\fake\\${defaultName}`;
      savedFiles.push({ path, defaultName, content });
      return Promise.resolve<SaveResult>({ status: 'saved', path });
    },

    openExternal: (url) => {
      calls.push({ method: 'openExternal', url });
      return open === 'ok'
        ? Promise.resolve()
        : Promise.reject(new HostCallError('Host call failed: openInConnectionBrowser.'));
    },

    preventClose: () => {
      calls.push({ method: 'preventClose' });
      return closeGuard === 'ok'
        ? Promise.resolve()
        : Promise.reject(new HostCallError('Host call failed: preventClose.'));
    },

    releasePreventClose: () => {
      calls.push({ method: 'releasePreventClose' });
      return closeGuard === 'ok'
        ? Promise.resolve()
        : Promise.reject(new HostCallError('Host call failed: releasePreventClose.'));
    },

    getActiveConnection: () => {
      calls.push({ method: 'getActiveConnection' });
      return Promise.resolve(connection);
    },

    onEvent: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    queryAll: async (query, signal) => {
      throwIfAborted(signal);
      const call = { method: 'queryAll' as const, query, pages: 0 };
      calls.push(call);
      const failure = scriptedFailure('query', query.entitySet, query.filter ?? '');
      if (failure !== null) throw failure;
      let result: FakeResult | undefined;
      for (const responder of init.responders ?? []) {
        result = responder(query);
        if (result !== undefined) break;
      }
      result ??= init.tables?.[query.entitySet];
      if (result === undefined) throw notFound(`result for ${query.entitySet}`);
      const pages = pagesOf(result);
      call.pages = pages.length;
      await Promise.resolve();
      throwIfAborted(signal);
      return pages.flat();
    },

    downloadFileColumn: async (ref, signal) => {
      throwIfAborted(signal);
      calls.push({ method: 'downloadFileColumn', ref });
      // For a file operation, FakeFailure.entitySet is the logical table name.
      const failure = scriptedFailure('file', ref.entityLogicalName, ref.recordId);
      if (failure !== null) throw failure;
      const key = `${ref.entityLogicalName}/${ref.recordId}/${ref.fileAttributeName}`;
      const text = init.fileColumns?.[key];
      if (text === undefined) throw notFound('file column');
      await Promise.resolve();
      throwIfAborted(signal);
      return text;
    },

    emit: (event) => {
      for (const handler of [...handlers]) {
        try {
          handler(event);
        } catch (error) {
          console.error(
            'PPTB fake host: an event handler threw',
            error instanceof Error ? error.name : 'NonError',
          );
        }
      }
    },
    get calls() {
      return calls;
    },
    callsOf: <M extends FakeCall['method']>(method: M) =>
      calls.filter((c): c is Extract<FakeCall, { method: M }> => c.method === method),
    clearCalls: () => {
      calls.length = 0;
    },
    get savedFiles() {
      return savedFiles;
    },
    listenerCount: () => handlers.size,
    setTheme: (next) => {
      theme = next;
    },
    setConnection: (next) => {
      connection = next;
    },
    setSave: (next) => {
      save = next;
    },
    setCloseGuard: (next) => {
      closeGuard = next;
    },
  };
}
