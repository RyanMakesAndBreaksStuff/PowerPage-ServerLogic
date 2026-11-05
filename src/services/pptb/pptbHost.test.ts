// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { HostEvent, ODataQuery, PptbHost } from './host.types';
import { HostCallError, isRecord } from './hostErrors';
import { createPptbHost, isFileAction } from './pptbHost';

const BASE = 'https://org.crm.dynamics.com/api/data/v9.2';
const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

type EventCallback = (event: unknown, payload: unknown) => void;

function makeStubs() {
  const getCurrentTheme = vi.fn<() => Promise<unknown>>().mockResolvedValue('dark');
  const showNotification = vi
    .fn<(options: unknown) => Promise<void>>()
    .mockResolvedValue(undefined);
  const copyToClipboard = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  const openInConnectionBrowser = vi
    .fn<(url: string) => Promise<void>>()
    .mockResolvedValue(undefined);
  const saveFile = vi
    .fn<(name: string, content: unknown, filters?: unknown) => Promise<unknown>>()
    .mockResolvedValue('C:\\out\\file.zip');
  const getActiveConnection = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);
  const preventClose = vi.fn<() => Promise<unknown>>().mockResolvedValue(true);
  const releasePreventClose = vi.fn<() => Promise<unknown>>().mockResolvedValue(true);
  const registrations = new Set<EventCallback>();
  const off = vi.fn<(callback: EventCallback) => void>((callback) => {
    registrations.delete(callback);
  });
  const on = vi.fn<(callback: EventCallback) => unknown>();
  on.mockImplementation((callback) => {
    const wrapped: EventCallback = (event, payload) => {
      callback(event, payload);
    };
    registrations.add(wrapped);
    return () => {
      registrations.delete(wrapped);
    };
  });
  const emit = (payload: unknown): void => {
    for (const callback of [...registrations]) callback(undefined, payload);
  };
  const queryData = vi
    .fn<(query: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
    .mockResolvedValue({ value: [] });
  const execute = vi
    .fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>()
    .mockImplementation((request) =>
      Promise.resolve(
        request.operationName === 'InitializeFileBlocksDownload'
          ? { FileContinuationToken: 'token', FileSizeInBytes: 1, FileName: 'a.sl', IsChunkingSupported: true }
          : { Data: 'YQ==' },
      ),
    );
  return {
    getCurrentTheme,
    showNotification,
    copyToClipboard,
    openInConnectionBrowser,
    saveFile,
    getActiveConnection,
    preventClose,
    releasePreventClose,
    on,
    off,
    registrations,
    emit,
    queryData,
    execute,
    toolbox: {
      preventClose,
      releasePreventClose,
      utils: { getCurrentTheme, showNotification, copyToClipboard, openInConnectionBrowser },
      fileSystem: { saveFile },
      connections: { getActiveConnection },
      events: { on, off },
    },
    dataverse: { queryData, execute },
  };
}

type Stubs = ReturnType<typeof makeStubs>;

function install(toolbox: unknown, dataverse: unknown): void {
  Object.defineProperty(window, 'toolboxAPI', {
    configurable: true,
    writable: true,
    value: toolbox,
  });
  Object.defineProperty(window, 'dataverseAPI', {
    configurable: true,
    writable: true,
    value: dataverse,
  });
}

let stubs: Stubs;
let sleep: ReturnType<typeof vi.fn<(ms: number) => Promise<void>>>;
let host: PptbHost;

beforeEach(() => {
  stubs = makeStubs();
  install(stubs.toolbox, stubs.dataverse);
  sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  host = createPptbHost({ sleep });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  Reflect.deleteProperty(window, 'toolboxAPI');
  Reflect.deleteProperty(window, 'dataverseAPI');
  vi.restoreAllMocks();
});

/** Everything written to console.error so far, as text. */
function logged(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

const QUERY: ODataQuery = {
  entitySet: 'powerpagecomponents',
  select: ['powerpagecomponentid', 'name'],
  filter: 'powerpagecomponenttype eq 35',
  orderBy: null,
  pageSize: 2,
};

describe('getTheme', () => {
  it('returns the host theme', async () => {
    await expect(host.getTheme()).resolves.toBe('dark');
  });

  it('rejects with a HostCallError when the host call fails, logging only the error name', async () => {
    stubs.getCurrentTheme.mockRejectedValue(new TypeError('SECRET-BODY https://org.example/x'));
    await expect(host.getTheme()).rejects.toMatchObject({ name: 'HostCallError' });
    expect(logged()).toContain('TypeError');
    expect(logged()).not.toContain('SECRET');
  });

  it('falls back to light for a value that is not a theme', async () => {
    stubs.getCurrentTheme.mockResolvedValue('purple');
    await expect(host.getTheme()).resolves.toBe('light');
  });

  it('rejects with a HostCallError when the host API is missing', async () => {
    Reflect.deleteProperty(window, 'toolboxAPI');
    await expect(host.getTheme()).rejects.toMatchObject({ name: 'HostCallError' });
  });
});

describe('notify', () => {
  it('passes title, body and type, and no duration, for info and success', async () => {
    await host.notify({ title: 'Saved', body: 'File saved.', type: 'success' });
    expect(stubs.showNotification.mock.calls).toEqual([
      [{ title: 'Saved', body: 'File saved.', type: 'success' }],
    ]);
    expect(stubs.showNotification.mock.calls[0]?.[0]).not.toHaveProperty('duration');
  });

  it('passes duration 0 for an error, so it stays until dismissed', async () => {
    await host.notify({ title: 'Couldn’t copy', body: 'Try again.', type: 'error' });
    expect(stubs.showNotification).toHaveBeenCalledWith({
      title: 'Couldn’t copy',
      body: 'Try again.',
      type: 'error',
      duration: 0,
    });
  });

  it('rejects when the host rejects', async () => {
    stubs.showNotification.mockRejectedValue(new Error('SECRET-BODY'));
    await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(
      HostCallError,
    );
    expect(logged()).not.toContain('SECRET');
  });

  it('rejects when the host throws synchronously', async () => {
    stubs.showNotification.mockImplementation(() => {
      throw new TypeError('boom');
    });
    await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(
      HostCallError,
    );
  });

  it('rejects when showNotification is missing', async () => {
    install({ ...stubs.toolbox, utils: {} }, stubs.dataverse);
    await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).rejects.toBeInstanceOf(
      HostCallError,
    );
  });
});

describe('copyText', () => {
  it('copies the text', async () => {
    await host.copyText('const a = 1;');
    expect(stubs.copyToClipboard).toHaveBeenCalledWith('const a = 1;');
  });

  it('rejects when the clipboard write fails', async () => {
    stubs.copyToClipboard.mockRejectedValue(new Error('denied'));
    await expect(host.copyText('x')).rejects.toBeInstanceOf(HostCallError);
  });
});

describe('saveFile', () => {
  it('returns the saved path', async () => {
    await expect(
      host.saveFile('a.zip', 'text', [{ name: 'Zip', extensions: ['zip'] }]),
    ).resolves.toEqual({
      status: 'saved',
      path: 'C:\\out\\file.zip',
    });
    expect(stubs.saveFile).toHaveBeenCalledWith('a.zip', 'text', [
      { name: 'Zip', extensions: ['zip'] },
    ]);
  });

  it('reports a cancelled dialog as cancelled', async () => {
    stubs.saveFile.mockResolvedValue(null);
    await expect(host.saveFile('a.zip', 'text', [])).resolves.toEqual({ status: 'cancelled' });
  });

  it('passes bytes through and leaves the filters out when there are none', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]);
    await host.saveFile('a.zip', bytes, []);
    expect(stubs.saveFile).toHaveBeenCalledWith('a.zip', bytes, undefined);
  });

  it('rejects a result that is neither a path nor null', async () => {
    stubs.saveFile.mockResolvedValue(42);
    await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
    stubs.saveFile.mockResolvedValue('');
    await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
  });

  it('rejects when the host fails', async () => {
    stubs.saveFile.mockRejectedValue(new Error('disk full'));
    await expect(host.saveFile('a.zip', 'text', [])).rejects.toBeInstanceOf(HostCallError);
  });
});

describe('openExternal', () => {
  it('opens an https link in the connection browser', async () => {
    await host.openExternal('https://learn.microsoft.com/en-us/power-pages/');
    expect(stubs.openInConnectionBrowser).toHaveBeenCalledWith(
      'https://learn.microsoft.com/en-us/power-pages/',
    );
  });

  it.each(['javascript:alert(1)', 'file:///C:/Windows', 'not a url', ''])(
    'refuses %j without calling the host',
    async (url) => {
      await expect(host.openExternal(url)).rejects.toBeInstanceOf(HostCallError);
      expect(stubs.openInConnectionBrowser).not.toHaveBeenCalled();
    },
  );

  it('rejects when the host fails', async () => {
    stubs.openInConnectionBrowser.mockRejectedValue(new Error('blocked'));
    await expect(host.openExternal('https://github.com/')).rejects.toBeInstanceOf(HostCallError);
  });
});

describe('preventClose and releasePreventClose', () => {
  it('preventClose and releasePreventClose call the host once each and resolve', async () => {
    await expect(host.preventClose()).resolves.toBeUndefined();
    expect(stubs.preventClose).toHaveBeenCalledTimes(1);
    expect(stubs.releasePreventClose).not.toHaveBeenCalled();
    await expect(host.releasePreventClose()).resolves.toBeUndefined();
    expect(stubs.releasePreventClose).toHaveBeenCalledTimes(1);
    expect(stubs.preventClose).toHaveBeenCalledTimes(1);
  });

  it('resolves when the host reports it did not apply the guard', async () => {
    stubs.preventClose.mockResolvedValue(false);
    await expect(host.preventClose()).resolves.toBeUndefined();
  });

  it('reject with a HostCallError when the host call fails, logging only the error name', async () => {
    stubs.preventClose.mockRejectedValue(new TypeError('SECRET-BODY https://org.example/x'));
    stubs.releasePreventClose.mockRejectedValue(new RangeError('SECRET-BODY https://org.example/y'));
    await expect(host.preventClose()).rejects.toMatchObject({
      name: 'HostCallError',
      message: 'Host call failed: preventClose.',
    });
    await expect(host.releasePreventClose()).rejects.toMatchObject({
      name: 'HostCallError',
      message: 'Host call failed: releasePreventClose.',
    });
    expect(logged()).toContain('TypeError');
    expect(logged()).toContain('RangeError');
    expect(logged()).not.toContain('SECRET');
  });
});

describe('getActiveConnection', () => {
  const raw = {
    id: 'c1',
    name: 'PG DEV',
    url: 'https://pg-dev.crm.dynamics.com',
    createdAt: '2026-01-01',
    category: 'x',
  };

  it('returns null when there is no connection', async () => {
    await expect(host.getActiveConnection()).resolves.toBeNull();
    stubs.getActiveConnection.mockResolvedValue(undefined);
    await expect(host.getActiveConnection()).resolves.toBeNull();
  });

  it.each(['Dev', 'Test', 'UAT', 'Production'] as const)(
    'keeps the %s label',
    async (environment) => {
      stubs.getActiveConnection.mockResolvedValue({ ...raw, environment });
      await expect(host.getActiveConnection()).resolves.toEqual({
        id: 'c1',
        name: 'PG DEV',
        url: 'https://pg-dev.crm.dynamics.com',
        environment,
      });
    },
  );

  it('reads an unrecognised or missing label as Unknown', async () => {
    stubs.getActiveConnection.mockResolvedValue({ ...raw, environment: 'Sandbox' });
    await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
    stubs.getActiveConnection.mockResolvedValue({ ...raw });
    await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
    stubs.getActiveConnection.mockResolvedValue({ ...raw, environment: 7 });
    await expect(host.getActiveConnection()).resolves.toMatchObject({ environment: 'Unknown' });
  });

  it('rejects a connection without an id, name and url', async () => {
    stubs.getActiveConnection.mockResolvedValue({ id: 'c1', name: 'PG DEV' });
    await expect(host.getActiveConnection()).rejects.toBeInstanceOf(HostCallError);
    stubs.getActiveConnection.mockResolvedValue('connected');
    await expect(host.getActiveConnection()).rejects.toBeInstanceOf(HostCallError);
  });
});

describe('onEvent', () => {
  function hub(): EventCallback {
    const callback = stubs.on.mock.calls[0]?.[0];
    if (callback === undefined) throw new Error('events.on was never called');
    return callback;
  }
  const payload = (event: string) => ({ event, data: null, timestamp: '2026-10-16T00:00:00Z' });

  it('routes connection events and settings:updated, and passes other events on by name', () => {
    const seen: HostEvent[] = [];
    host.onEvent((e) => seen.push(e));
    for (const name of [
      'connection:created',
      'connection:updated',
      'connection:deleted',
      'settings:updated',
      'tool:loaded',
    ]) {
      hub()(undefined, payload(name));
    }
    expect(seen).toEqual([
      { kind: 'connection-changed' },
      { kind: 'connection-changed' },
      { kind: 'connection-changed' },
      { kind: 'settings-updated' },
      { kind: 'other', name: 'tool:loaded' },
    ]);
  });

  it('registers with the host once, however many handlers subscribe', () => {
    host.onEvent(() => undefined);
    host.onEvent(() => undefined);
    expect(stubs.on).toHaveBeenCalledTimes(1);
  });

  it('disposes the wrapper on last unsubscribe and delivers once after resubscribe', () => {
    const first = vi.fn();
    const second = vi.fn();
    host.onEvent(first)();
    expect(stubs.registrations.size).toBe(0);
    const unsubscribe = host.onEvent(second);
    expect(stubs.registrations.size).toBe(1);
    stubs.emit(payload('settings:updated'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(stubs.registrations.size).toBe(0);
    expect(stubs.on).toHaveBeenCalledTimes(2);
    expect(stubs.off).not.toHaveBeenCalled();
  });

  it('disposes the wrapper on pagehide and remains idempotent', () => {
    const handler = vi.fn();
    host.onEvent(handler);
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pagehide'));
    stubs.emit(payload('settings:updated'));
    expect(stubs.registrations.size).toBe(0);
    expect(handler).not.toHaveBeenCalled();
    expect(stubs.off).not.toHaveBeenCalled();
  });

  it('uses events.off(hub) only when on returns no disposer', () => {
    stubs.on.mockImplementation((callback) => {
      stubs.registrations.add(callback);
      return undefined;
    });
    host.onEvent(() => undefined)();
    expect(stubs.off).toHaveBeenCalledWith(stubs.on.mock.calls[0]?.[0]);
    expect(stubs.registrations.size).toBe(0);
  });

  it('does not revive old subscribers after pagehide', () => {
    const oldHandler = vi.fn();
    const currentHandler = vi.fn();
    host.onEvent(oldHandler);
    window.dispatchEvent(new Event('pagehide'));
    host.onEvent(currentHandler);
    stubs.emit(payload('settings:updated'));
    expect(oldHandler).not.toHaveBeenCalled();
    expect(currentHandler).toHaveBeenCalledTimes(1);
    expect(stubs.registrations.size).toBe(1);
  });

  it('registers again after every handler has unsubscribed', () => {
    host.onEvent(() => undefined)();
    host.onEvent(() => undefined);
    expect(stubs.on).toHaveBeenCalledTimes(2);
  });

  it('ignores payloads that are not events', () => {
    const handler = vi.fn();
    host.onEvent(handler);
    for (const bad of [null, undefined, 'connection:updated', {}, { event: 7 }])
      hub()(undefined, bad);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps delivering when one handler throws, and logs only its error name', () => {
    const after = vi.fn();
    host.onEvent(() => {
      throw new RangeError('SECRET-BODY');
    });
    host.onEvent(after);
    hub()(undefined, payload('settings:updated'));
    expect(after).toHaveBeenCalledTimes(1);
    expect(logged()).toContain('RangeError');
    expect(logged()).not.toContain('SECRET');
  });

  it('returns a safe unsubscribe when events.on is missing or throws', () => {
    stubs.on.mockImplementation(() => {
      throw new TypeError('no events');
    });
    const unsubscribe = host.onEvent(() => undefined);
    expect(() => {
      unsubscribe();
    }).not.toThrow();
  });
});

describe('queryAll', () => {
  const link = (rest: string) => `${BASE}/${rest}`;

  it('follows @odata.nextLink across three pages and sends Prefer on each', async () => {
    stubs.queryData
      .mockResolvedValueOnce({
        value: [{ n: 1 }, { n: 2 }],
        '@odata.nextLink': link('powerpagecomponents?$select=name&$skiptoken=A'),
      })
      .mockResolvedValueOnce({
        value: [{ n: 3 }, { n: 4 }],
        '@odata.nextLink': link('powerpagecomponents?$select=name&$skiptoken=B'),
      })
      .mockResolvedValueOnce({ value: [{ n: 5 }] });
    await expect(host.queryAll(QUERY)).resolves.toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
      { n: 4 },
      { n: 5 },
    ]);
    expect(stubs.queryData.mock.calls).toEqual([
      [
        'powerpagecomponents?$select=powerpagecomponentid,name&$filter=powerpagecomponenttype eq 35',
        undefined,
        { Prefer: 'odata.maxpagesize=2' },
      ],
      [
        'powerpagecomponents?$select=name&$skiptoken=A',
        undefined,
        { Prefer: 'odata.maxpagesize=2' },
      ],
      [
        'powerpagecomponents?$select=name&$skiptoken=B',
        undefined,
        { Prefer: 'odata.maxpagesize=2' },
      ],
    ]);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a 503 after 1 s, 2 s and 4 s and then throws a HostReadError with the status', async () => {
    stubs.queryData.mockRejectedValue({
      status: 503,
      statusText: 'Service Unavailable',
      message: 'SECRET-BODY https://org/x',
    });
    const failure: unknown = await host.queryAll(QUERY).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(HostReadError);
    expect(failure).toMatchObject({
      status: 503,
      message: 'The server had a problem. Please try again later.',
    });
    expect(stubs.queryData).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
    expect(logged()).not.toContain('SECRET');
  });

  it('succeeds when a 429 clears on the first retry', async () => {
    stubs.queryData
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ value: [{ n: 1 }] });
    await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }]);
    expect(sleep.mock.calls).toEqual([[1000]]);
  });

  it('does not retry a 404', async () => {
    stubs.queryData.mockRejectedValue({ status: 404 });
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: 404,
    });
    expect(stubs.queryData).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('does not retry a failure that has no status', async () => {
    stubs.queryData.mockRejectedValue(new Error('network'));
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: null,
    });
    expect(stubs.queryData).toHaveBeenCalledTimes(1);
  });

  it('retries a failure on a later page without re-reading earlier pages', async () => {
    stubs.queryData
      .mockResolvedValueOnce({
        value: [1, 2],
        '@odata.nextLink': link('powerpagecomponents?$skiptoken=A'),
      })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ value: [3] });
    await expect(host.queryAll(QUERY)).resolves.toEqual([1, 2, 3]);
    expect(stubs.queryData).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['null', null],
    ['an array', [1, 2]],
    ['no value array', { rows: [] }],
    ['a value that is not an array', { value: 'x' }],
    ['a nextLink that is not a string', { value: [], '@odata.nextLink': 5 }],
  ])('rejects a response that is %s, without retrying', async (_label, response) => {
    stubs.queryData.mockResolvedValue(response);
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: null,
    });
    expect(stubs.queryData).toHaveBeenCalledTimes(1);
  });

  it('rejects a paging link that points at another table or another API', async () => {
    stubs.queryData.mockResolvedValue({
      value: [1, 2],
      '@odata.nextLink': link('systemusers?$skiptoken=A'),
    });
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: null,
    });
    stubs.queryData.mockResolvedValue({
      value: [1, 2],
      '@odata.nextLink': 'https://evil.example/steal',
    });
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: null,
    });
  });

  it('fails closed on a full page that has no paging link (Spike S2 gate)', async () => {
    stubs.queryData.mockResolvedValue({ value: [1, 2] });
    await expect(host.queryAll(QUERY)).rejects.toThrow(/may be incomplete/);
  });

  it('rejects an invalid query before calling the host', async () => {
    await expect(host.queryAll({ ...QUERY, entitySet: 'a/b' })).rejects.toBeInstanceOf(
      HostReadError,
    );
    await expect(host.queryAll({ ...QUERY, filter: 'a eq 1&$top=1' })).rejects.toBeInstanceOf(
      HostReadError,
    );
    expect(stubs.queryData).not.toHaveBeenCalled();
  });

  it('rejects with a HostReadError when dataverseAPI is missing', async () => {
    Reflect.deleteProperty(window, 'dataverseAPI');
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: null,
    });
  });
});

describe('downloadFileColumn boundary', () => {
  const REF = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' };

  it('sends only the two unbound download actions', async () => {
    await expect(host.downloadFileColumn(REF)).resolves.toBe('a');
    expect(stubs.execute.mock.calls.map(([request]) => request.operationName)).toEqual([
      'InitializeFileBlocksDownload',
      'DownloadBlock',
    ]);
    expect(stubs.execute.mock.calls.every(([request]) =>
      request.operationType === 'action' && !('entityName' in request) && !('entityId' in request))).toBe(true);
    expect(stubs.queryData).not.toHaveBeenCalled();
  });

  it('rejects with a HostReadError when dataverseAPI is missing', async () => {
    Reflect.deleteProperty(window, 'dataverseAPI');
    await expect(host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
  });
});

describe('retrieval-only guarantee', () => {
  // Every member the adapter may touch. Reaching for anything else (create, update, delete, execute,
  // associate, *Multiple, publishCustomizations, deploySolution, Post, Put, Patch, ...) is recorded and throws.
  const ALLOWED = [
    'toolboxAPI.utils.getCurrentTheme',
    'toolboxAPI.utils.showNotification',
    'toolboxAPI.utils.copyToClipboard',
    'toolboxAPI.utils.openInConnectionBrowser',
    'toolboxAPI.fileSystem.saveFile',
    'toolboxAPI.connections.getActiveConnection',
    'toolboxAPI.preventClose',
    'toolboxAPI.releasePreventClose',
    'toolboxAPI.events.on',
    'toolboxAPI.events.off',
    'dataverseAPI.queryData',
    'dataverseAPI.execute',
  ];

  function guarded(
    path: string,
    tree: Record<string, unknown>,
    touched: string[],
    violations: string[],
  ): object {
    return new Proxy(tree, {
      get(target, prop) {
        if (typeof prop !== 'string') return undefined;
        const here = `${path}.${prop}`;
        if (!ALLOWED.some((name) => name === here || name.startsWith(`${here}.`))) {
          violations.push(here);
          throw new Error(`Forbidden host member: ${here}`);
        }
        touched.push(here);
        const value = target[prop];
        return isRecord(value) ? guarded(here, value, touched, violations) : value;
      },
    });
  }

  it('touches only read members across every PptbHost method', async () => {
    const touched: string[] = [];
    const violations: string[] = [];
    install(
      guarded('toolboxAPI', stubs.toolbox, touched, violations),
      guarded('dataverseAPI', stubs.dataverse, touched, violations),
    );
    stubs.getActiveConnection.mockResolvedValue({
      id: 'c1',
      name: 'n',
      url: 'https://x.crm.dynamics.com',
      environment: 'Dev',
    });
    stubs.queryData.mockResolvedValueOnce({ value: [1] });

    await host.getTheme();
    await host.notify({ title: 'a', body: 'b', type: 'error' });
    await host.copyText('x');
    await host.saveFile('a.md', 'x', [{ name: 'Markdown', extensions: ['md'] }]);
    await host.openExternal('https://learn.microsoft.com/');
    await host.getActiveConnection();
    await host.preventClose();
    await host.releasePreventClose();
    host.onEvent(() => undefined)();
    await host.queryAll({ ...QUERY, pageSize: 5 });
    await host.downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' });

    expect(violations).toEqual([]);
    expect(new Set(touched.filter((name) => ALLOWED.includes(name)))).toEqual(
      new Set(ALLOWED.filter((name) => name !== 'toolboxAPI.events.off')),
    );
  });

  it('the test guard proxy throws on write members', () => {
    const violations: string[] = [];
    const guard = guarded('dataverseAPI', stubs.dataverse, [], violations);
    expect(() => {
      void Reflect.get(guard, 'create');
    }).toThrow(/Forbidden host member: dataverseAPI.create/);
    expect(() => {
      void Reflect.get(guard, 'update');
    }).toThrow(/Forbidden/);
    expect(violations).toEqual(['dataverseAPI.create', 'dataverseAPI.update']);
  });

  it.each([
    ['InitializeFileBlocksDownload', true],
    ['DownloadBlock', true],
    ['CreateRecord', false],
    ['DeleteRecord', false],
    ['', false],
  ])('isFileAction(%j) is %s', (name, expected) => {
    expect(isFileAction(name)).toBe(expected);
  });
});
