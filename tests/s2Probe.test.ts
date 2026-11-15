// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ID = '00000000-0000-0000-0000-000000000001';
const SITE = '00000000-0000-0000-0000-00000000000a';
const bytes = new TextEncoder().encode('\uFEFFfunction get() { return "雪😀"; }');
const SECRETS = [ID, SITE, 'TOKEN-PRIVATE', 'PRIVATE.sl', 'private.invalid', 'function get', 'C:/PRIVATE'];

type Evidence = Record<string, unknown>;
type Probe = {
  s2Evidence: Evidence[];
  s2Versions(host: string, runtime: string): void;
  s2Connection(): Promise<void>;
  s2StartEvents(): void;
  s2StopEvents(): void;
  s2CheckStopped(): void;
  s2Paging(siteId: string): Promise<void>;
  s2Literal(): Promise<void>;
  s2VerifyWire(kind: 'nextLink' | 'literal', actualUrl: string): void;
  s2DownloadKnown(id: string): Promise<void>;
  s2Environment(scenario: string, schema: string): Promise<void>;
  s2ReadFailure(label: string): Promise<void>;
};
type Listener = (event: unknown, payload: unknown) => void;

function isProbe(value: unknown): value is Probe {
  return typeof value === 'object' && value !== null && 's2Evidence' in value && 's2DownloadKnown' in value;
}

const populatedRow = (extra: Record<string, unknown> = {}) => ({
  value: [{
    powerpagecomponentid: ID,
    powerpagecomponenttype: 35,
    filecontent_name: 'PRIVATE.sl',
    powerpagecomponent_FileAttachments: [
      { regardingfieldname: 'filecontent', filename: 'PRIVATE.sl', filesizeinbytes: bytes.length, mimetype: 'text/plain' },
    ],
    ...extra,
  }],
});

function install(options: { onReturnsDisposer?: boolean } = {}) {
  const query = vi.fn<(path: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
    .mockResolvedValue({ value: [] });
  const execute = vi.fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>();
  execute.mockImplementation((request) => {
    if (request.operationName === 'InitializeFileBlocksDownload') {
      return Promise.resolve({ FileContinuationToken: 'TOKEN-PRIVATE', FileSizeInBytes: bytes.length,
        FileName: 'PRIVATE.sl', IsChunkingSupported: true });
    }
    const offset = request.parameters?.Offset;
    const length = request.parameters?.BlockLength;
    if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('bad block request'));
    return Promise.resolve({ Data: Buffer.from(bytes.subarray(offset, offset + length)).toString('base64') });
  });
  const handlers = new Set<Listener>();
  const on = vi.fn((handler: Listener) => {
    handlers.add(handler);
    return options.onReturnsDisposer === true ? () => { handlers.delete(handler); } : undefined;
  });
  const off = vi.fn((handler: Listener) => { handlers.delete(handler); });
  const selectPath = vi.fn<() => Promise<string | null>>().mockResolvedValue('C:/PRIVATE/handler.sl');
  const readBinary = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue(Buffer.from(bytes));
  const connection = vi.fn<() => Promise<unknown>>()
    .mockResolvedValue({ id: 'PRIVATE-CONNECTION', name: 'PRIVATE', url: 'https://private.invalid', environment: 'Dev' });
  const sandboxWindow: Record<string, unknown> = {
    dataverseAPI: { queryData: query, execute },
    toolboxAPI: {
      connections: { getActiveConnection: connection },
      events: { on, off },
      fileSystem: { selectPath, readBinary, saveFile: vi.fn().mockResolvedValue(null) },
      utils: { copyToClipboard: vi.fn().mockResolvedValue(undefined) },
    },
  };
  // A fresh V8 context has its own ECMAScript built-ins. Only host/Web globals are supplied; `Uint8Array` and
  // `ArrayBuffer` come from this realm so that `instanceof` checks match the Buffers the fixtures hand over.
  runInNewContext(readFileSync(new URL('../scripts/s2-probe.js', import.meta.url), 'utf8'), {
    window: sandboxWindow, Uint8Array, ArrayBuffer, TextDecoder, atob, btoa,
    console: { table: vi.fn(), info: vi.fn() },
  });
  if (!isProbe(sandboxWindow)) throw new Error('probe did not install');
  return { api: sandboxWindow, query, execute, handlers, on, off, selectPath, readBinary, connection };
}

const saved = (api: Probe): string => JSON.stringify(api.s2Evidence);

describe('manual S2 continuation', () => {
  it('installs without calling the host or subscribing', () => {
    const p = install();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.connection).not.toHaveBeenCalled();
    expect(p.on).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toEqual([]);
  });

  it('records versions only in a bounded shape and records connection facts without values', async () => {
    const p = install();
    p.api.s2Versions('1.2.7', '10.0.26200');
    expect(() => { p.api.s2Versions('', 'x'); }).toThrow();
    await p.api.s2Connection();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'versions', host: '1.2.7', runtime: '10.0.26200' }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'connection', hasId: true, hasUrl: true, environmentKnown: true, disconnected: false }));
    for (const secret of SECRETS) expect(saved(p.api)).not.toContain(secret);
  });

  it('validates metadata before the file picker, downloads with the two unbound actions and records comparison facts only', async () => {
    const p = install();
    p.query.mockResolvedValue(populatedRow());
    await p.api.s2DownloadKnown(ID);
    expect(p.query.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(p.selectPath.mock.invocationCallOrder[0] ?? 0);
    expect(p.selectPath).toHaveBeenCalledWith(expect.objectContaining({ type: 'file' }));
    expect(p.readBinary).toHaveBeenCalledWith('C:/PRIVATE/handler.sl');
    expect(p.execute.mock.calls[0]?.[0]).toEqual({
      operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: ID }, FileAttributeName: 'filecontent' },
    });
    expect(p.execute.mock.calls[1]?.[0]).toEqual({
      operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'TOKEN-PRIVATE', Offset: 0, BlockLength: bytes.length },
    });
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'file metadata', matchingPopulatedAttachment: true }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'returned', bytes: bytes.length, localBytes: bytes.length, blocks: 1, chunked: true, bytesMatch: true, textMatch: true }));
    for (const secret of SECRETS) expect(saved(p.api)).not.toContain(secret);
  });

  it('does not download when no FileAttachment row belongs to filecontent', async () => {
    const p = install();
    p.query.mockResolvedValue(populatedRow({
      powerpagecomponent_FileAttachments: [{ regardingfieldname: 'otherfile', filename: 'PRIVATE.sl', filesizeinbytes: 9, mimetype: 'text/plain' }],
    }));
    await p.api.s2DownloadKnown(ID);
    expect(p.selectPath).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'file metadata', matchingPopulatedAttachment: false }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'rejected' }));
  });

  it('records the local binary shape before decoding and handles Buffer views, serialized Buffers and ArrayBuffers', async () => {
    for (const form of ['buffer-view', 'serialized-buffer', 'array-buffer'] as const) {
      const p = install();
      const allocation = Buffer.alloc(bytes.length + 8, 204);
      Buffer.from(bytes).copy(allocation, 4);
      const view = allocation.subarray(4, 4 + bytes.length);
      const local: unknown = form === 'buffer-view' ? view : form === 'serialized-buffer' ? view.toJSON()
        : view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      p.readBinary.mockResolvedValue(local);
      p.query.mockResolvedValue(populatedRow());
      await p.api.s2DownloadKnown(ID);
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'local binary shape', bytes: bytes.length }));
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytesMatch: true, textMatch: true }));
    }
  });

  it('records a byte and text mismatch as facts, not as a failure', async () => {
    const p = install();
    p.readBinary.mockResolvedValue(Buffer.from('function get() { return 1; }'));
    p.query.mockResolvedValue(populatedRow());
    await p.api.s2DownloadKnown(ID);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytesMatch: false, textMatch: false }));
  });

  it('downloads a non-chunked file in one block and a multi-block file sequentially', async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 3).fill(97);
    for (const chunked of [false, true]) {
      const p = install();
      p.readBinary.mockResolvedValue(Buffer.from(big));
      p.query.mockResolvedValue(populatedRow({ powerpagecomponent_FileAttachments: [
        { regardingfieldname: 'filecontent', filename: 'PRIVATE.sl', filesizeinbytes: big.length, mimetype: 'text/plain' }] }));
      p.execute.mockImplementation((request) => {
        if (request.operationName === 'InitializeFileBlocksDownload') {
          return Promise.resolve({ FileContinuationToken: 'TOKEN-PRIVATE', FileSizeInBytes: big.length, FileName: 'PRIVATE.sl', IsChunkingSupported: chunked });
        }
        const offset = request.parameters?.Offset;
        const length = request.parameters?.BlockLength;
        if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('bad block request'));
        return Promise.resolve({ Data: Buffer.from(big.subarray(offset, offset + length)).toString('base64') });
      });
      await p.api.s2DownloadKnown(ID);
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', blocks: chunked ? 2 : 1, chunked, bytesMatch: true }));
    }
  });

  it('requires explicit owner arguments before starting host work', async () => {
    const p = install();
    await p.api.s2DownloadKnown('');
    await expect(p.api.s2Environment('current', '')).rejects.toThrow();
    await expect(p.api.s2Paging('')).rejects.toThrow();
    await expect(p.api.s2ReadFailure('anything')).rejects.toThrow();
    expect(() => { p.api.s2VerifyWire('nextLink', ''); }).toThrow();
    expect(p.selectPath).not.toHaveBeenCalled();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'rejected' }));
  });

  it('never queries values or defaultvalue for a secret definition', async () => {
    const p = install();
    p.query.mockResolvedValue({ value: [{ environmentvariabledefinitionid: ID, type: 100000005 }] });
    await p.api.s2Environment('secret', 'cfg_Secret');
    expect(p.query).toHaveBeenCalledTimes(1);
    expect(String(p.query.mock.calls[0]?.[0])).not.toContain('defaultvalue');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment secret', resolved: 'secret', valueRead: false }));
  });

  it('resolves current, default and missing nonsecret values without recording them', async () => {
    const p = install();
    p.query
      .mockResolvedValueOnce({ value: [{ environmentvariabledefinitionid: ID, type: 100000000 }] })
      .mockResolvedValueOnce({ value: [{ environmentvariabledefinitionid: ID, defaultvalue: 'PRIVATE-DEFAULT' }] })
      .mockResolvedValueOnce({ value: [{ environmentvariablevalueid: ID, value: 'PRIVATE-VALUE' }] });
    await p.api.s2Environment('current', 'cfg_Current');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment current', resolved: 'current', valueRead: true, valueRows: 1 }));
    expect(saved(p.api)).not.toContain('PRIVATE-');
    p.query.mockReset();
    p.query.mockResolvedValueOnce({ value: [] });
    await p.api.s2Environment('missing', 'cfg_Missing');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment missing', resolved: 'missing', valueRead: false }));
  });

  it('pages the type-35 site inventory, caps the walk and follows the encoded nextLink unchanged', async () => {
    const p = install();
    const next = (n: number) => `https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B${String(n)}`;
    p.query.mockImplementation((path) => {
      const n = /skiptoken=A%25B(\d+)/u.exec(path)?.[1];
      const page = n === undefined ? 1 : Number(n) + 1;
      return Promise.resolve({ value: [{ id: page }], '@odata.nextLink': next(page) });
    });
    await p.api.s2Paging(SITE);
    expect(String(p.query.mock.calls[0]?.[0])).toContain(`_powerpagesiteid_value eq ${SITE}`);
    expect(String(p.query.mock.calls[0]?.[0])).toContain('powerpagecomponenttype eq 35');
    expect(p.query.mock.calls[1]?.[0]).toBe('powerpagecomponents?$skiptoken=A%25B1');
    expect(p.query).toHaveBeenCalledTimes(5);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'paging', pages: 5, rows: 5, capped: true, wireCheck: 'pending' }));
    expect(saved(p.api)).not.toContain('A%25B');
  });

  it('detects a full terminal page', async () => {
    const p = install();
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=Z' })
      .mockResolvedValueOnce({ value: [{ id: 2 }] });
    await p.api.s2Paging(SITE);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'paging', pages: 2, rows: 2, terminalFull: true, capped: false }));
  });

  it('records the literal read and verifies wire URLs while retaining only outcomes', async () => {
    const p = install();
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B' })
      .mockResolvedValueOnce({ value: [] });
    await p.api.s2Paging(SITE);
    await p.api.s2Literal();
    expect(String(p.query.mock.calls[2]?.[0])).toContain("name eq 'S2%20O%27%27Brien%20name'");
    p.api.s2VerifyWire('nextLink', 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B');
    p.api.s2VerifyWire('literal', "https://private.invalid/api/data/v9.2/powerpagecomponents?$filter=name%20eq%20'S2%20O%27%27Brien%20name'");
    p.api.s2VerifyWire('literal', 'https://private.invalid/api/data/v9.2/powerpagecomponents?$filter=name%2520eq%2520S2%2527');
    expect(p.api.s2Evidence).toContainEqual({ item: 'apostrophe/space literal', outcome: 'returned', rows: 0, wireCheck: 'pending' });
    expect(p.api.s2Evidence).toContainEqual({ item: 'nextLink wire', outcome: 'passed' });
    expect(p.api.s2Evidence.filter((row) => row.item === 'literal wire').map((row) => row.outcome)).toEqual(['passed', 'failed']);
    expect(saved(p.api)).not.toContain('private.invalid');
  });

  it('subscribes once, uses events.off when on() returns void, and verifies a later callback is absent', () => {
    const p = install();
    p.api.s2StartEvents();
    p.api.s2StartEvents();
    expect(p.on).toHaveBeenCalledTimes(1);
    for (const handler of p.handlers) handler(undefined, { event: 'connection:updated', data: { id: 'PRIVATE-CONNECTION' }, timestamp: '' });
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'connection event', event: 'connection:updated', dataHasId: true }));
    p.api.s2StopEvents();
    expect(p.off).toHaveBeenCalledTimes(1);
    expect(p.handlers.size).toBe(0);
    p.api.s2CheckStopped();
    expect(p.api.s2Evidence).toContainEqual({ item: 'unsubscribe check', outcome: 'passed' });
  });

  it('prefers a disposer when on() returns one', () => {
    const p = install({ onReturnsDisposer: true });
    p.api.s2StartEvents();
    p.api.s2StopEvents();
    expect(p.off).not.toHaveBeenCalled();
    expect(p.handlers.size).toBe(0);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'event subscription', disposerType: 'function' }));
  });

  it('records a read failure by name and status only', async () => {
    const p = install();
    p.query.mockRejectedValue(Object.assign(new Error('PRIVATE-MESSAGE https://private.invalid'), { status: 403 }));
    await p.api.s2ReadFailure('403 denial');
    expect(p.api.s2Evidence).toContainEqual({ item: '403 denial', outcome: 'rejected', errorName: 'Error', status: 403 });
    expect(saved(p.api)).not.toContain('PRIVATE-MESSAGE');
  });
});
