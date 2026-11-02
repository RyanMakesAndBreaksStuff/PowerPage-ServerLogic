// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createPptbHost } from './pptbHost';
import type { FileColumnRef, ODataQuery, PptbHost } from './host.types';
import type { FileAction } from './dataverseFiles';

const REF: FileColumnRef = {
  entityLogicalName: 'powerpagecomponent',
  primaryIdAttribute: 'powerpagecomponentid',
  recordId: '00000000-0000-0000-0000-000000000001',
  fileAttributeName: 'filecontent',
};
const BLOCK = 4 * 1024 * 1024;
const code = 'function get() { return "雪😀"; }';
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const base64 = (bytes: Uint8Array): string => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const hostError = (status: number): Error => Object.assign(new Error('PRIVATE-TOKEN host message'), { status });

function harness(bytes = encode(code), chunked = true) {
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  const queryData = vi.fn<() => Promise<unknown>>().mockResolvedValue({ value: [] });
  const initial = { FileContinuationToken: 'PRIVATE-TOKEN', FileSizeInBytes: bytes.length, FileName: 'private.sl', IsChunkingSupported: chunked };
  const response = (request: FileAction): Promise<unknown> => {
    if (request.operationName === 'InitializeFileBlocksDownload') return Promise.resolve(initial);
    const offset = request.parameters.Offset;
    const length = request.parameters.BlockLength;
    if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('Invalid fixture block request'));
    return Promise.resolve({ Data: base64(bytes.subarray(offset, offset + length)) });
  };
  const execute = vi.fn<(request: FileAction) => Promise<unknown>>(response);
  Object.defineProperty(window, 'dataverseAPI', { configurable: true, value: { queryData, execute } });
  return { host: createPptbHost({ sleep }), execute, queryData, sleep, initial, response };
}

const blockRequests = (execute: ReturnType<typeof harness>['execute']) =>
  execute.mock.calls.filter(([r]) => r.operationName === 'DownloadBlock').map(([r]) => r.parameters);

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => {
  Reflect.deleteProperty(window, 'dataverseAPI');
  vi.restoreAllMocks();
});

describe('file action protocol through createPptbHost', () => {
  it('pins the public descriptor, optional signal and unbound initializer target', async () => {
    expectTypeOf<PptbHost['downloadFileColumn']>().parameters.toEqualTypeOf<[FileColumnRef, (AbortSignal | undefined)?]>();
    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery, (AbortSignal | undefined)?]>();
    const h = harness();
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(code);
    expect(h.queryData).not.toHaveBeenCalled();
    expect(h.execute.mock.calls[0]?.[0]).toEqual({
      operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: REF.recordId }, FileAttributeName: 'filecontent' },
    });
    expect(h.execute.mock.calls[1]?.[0]).toEqual({
      operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: encode(code).length },
    });
  });

  it('assembles sequential blocks before UTF-8 decoding, including a split code point and BOM', async () => {
    const bytes = new Uint8Array(BLOCK + 4).fill(97);
    bytes.set([239, 187, 191], 0);
    bytes.set(encode('€'), BLOCK - 1);
    const h = harness(bytes);
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(new TextDecoder().decode(bytes));
    expect(blockRequests(h.execute)).toEqual([
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: BLOCK },
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: BLOCK, BlockLength: 4 },
    ]);
  });

  it('strips exactly one leading BOM and keeps a second one', async () => {
    const h = harness(encode('﻿﻿x'));
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('﻿x');
  });

  it('requests the entire file once when chunking is not supported', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes, false);
    await expect(h.host.downloadFileColumn(REF)).resolves.toHaveLength(bytes.length);
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(blockRequests(h.execute)).toEqual([{ FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: bytes.length }]);
  });

  it('accepts a successful empty file without requesting a zero-length block', async () => {
    const h = harness(new Uint8Array());
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('');
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it('accepts an initializer without FileName', async () => {
    const h = harness();
    const rest: Record<string, unknown> = { ...h.initial };
    delete rest.FileName;
    h.execute.mockResolvedValueOnce(rest);
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(code);
  });

  it.each([
    { FileContinuationToken: '' }, { FileContinuationToken: 7 }, { FileSizeInBytes: -1 }, { FileSizeInBytes: 0.5 },
    { FileSizeInBytes: Number.MAX_SAFE_INTEGER + 1 }, { FileSizeInBytes: 128 * 1024 * 1024 + 1 },
    { FileName: null }, { IsChunkingSupported: 'true' },
  ])('rejects malformed initialization %j locally without a block request', async (change) => {
    const h = harness();
    h.execute.mockResolvedValueOnce({ ...h.initial, ...change });
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it.each([{}, { Data: [1] }, { Data: '!!!!' }, { Data: 'YQ=' }, { Data: 'YQ==' }])('rejects invalid Data/length %j without retry', async (bad) => {
    const h = harness();
    h.execute.mockResolvedValueOnce(h.initial).mockResolvedValueOnce(bad);
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it('rejects malformed UTF-8 even when the byte count matches', async () => {
    const h = harness(new Uint8Array([195, 40]));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
  });

  it.each([401, 403, 404])('preserves %s and does not retry denied/missing/auth failures', async (status) => {
    const h = harness();
    h.execute.mockRejectedValue(hostError(status));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retries initialization and retries a failed block at the same offset without duplicating bytes', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes);
    let failedBlock = false;
    h.execute.mockRejectedValueOnce(hostError(429)).mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock' && request.parameters.Offset === BLOCK && !failedBlock) {
        failedBlock = true;
        return Promise.reject(hostError(503));
      }
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('a'.repeat(bytes.length));
    expect(h.sleep.mock.calls).toEqual([[1000], [1000]]);
    expect(blockRequests(h.execute).map((p) => p.Offset)).toEqual([0, BLOCK, BLOCK]);
  });

  it('exhausts 503 retries using exactly 1s/2s/4s', async () => {
    const h = harness();
    h.execute.mockRejectedValue(hostError(503));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status: 503, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(4);
    expect(h.sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it('does not dispatch a pre-aborted operation or another block after cancellation', async () => {
    const h = harness(new Uint8Array(BLOCK + 1).fill(97));
    const before = new AbortController();
    before.abort();
    await expect(h.host.downloadFileColumn(REF, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).not.toHaveBeenCalled();
    const during = new AbortController();
    h.execute.mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock') during.abort();
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(2);
  });

  it('waits for an already-dispatched host promise to settle before rejecting cancellation', async () => {
    const h = harness();
    const controller = new AbortController();
    const pending: { resolve: ((value: unknown) => void) | null } = { resolve: null };
    h.execute.mockImplementationOnce(() => new Promise<unknown>((done) => { pending.resolve = done; }));
    let settled = false;
    const observed = h.host.downloadFileColumn(REF, controller.signal).then(
      (value): unknown => { settled = true; return value; },
      (error: unknown) => { settled = true; return error; },
    );
    controller.abort();
    await Promise.resolve();
    expect(settled).toBe(false);
    if (pending.resolve === null) throw new Error('fixture did not capture resolve');
    pending.resolve(h.initial);
    expect(await observed).toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    { entityLogicalName: 'powerpagecomponents/x' }, { primaryIdAttribute: 'id,secret' },
    { recordId: '1) or (1' }, { fileAttributeName: 'file/content' },
  ])('rejects unsafe references %j before dispatch', async (change) => {
    const h = harness();
    await expect(h.host.downloadFileColumn({ ...REF, ...change })).rejects.toMatchObject({ name: 'HostReadError', status: null });
    expect(h.execute).not.toHaveBeenCalled();
  });

  it('sends only the two download actions, unbound', async () => {
    const h = harness();
    await h.host.downloadFileColumn(REF);
    expect(h.execute.mock.calls.map(([r]) => r.operationName)).toEqual(['InitializeFileBlocksDownload', 'DownloadBlock']);
    expect(h.execute.mock.calls.every(([r]) => !('entityName' in r) && !('entityId' in r))).toBe(true);
  });
});
