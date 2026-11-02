// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { NEXT_LINK_UNVERIFIED, queryAllRows, withRetry } from './dataverseRead';
import type { RawRead, Sleep } from './dataverseRead';
import { toHostReadError } from './hostErrors';
import { createFakeHost } from './fakeHost';

const Q: ODataQuery = { entitySet: 'powerpagecomponents', select: ['name'], filter: null, orderBy: 'name', pageSize: 2 };
const NEXT = 'https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B';
const noSleep: Sleep = () => Promise.resolve();
/** PPTB rejects with an object carrying `status`; an Error subclass keeps the lint rule satisfied. */
const hostError = (status: number | null): Error =>
  Object.assign(new Error('PRIVATE-TOKEN host message'), status === null ? {} : { status });

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe('read provenance and partial evidence', () => {
  it('pins constructor defaults and preserves explicit provenance', () => {
    expect(new HostReadError('local', null)).toMatchObject({ transport: false, partialRows: [] });
    const original = new HostReadError('confirmed loss', null, true, [{ n: 1 }]);
    expect(toHostReadError('queryData', original)).toBe(original);
    expect(original).toMatchObject({ transport: true, partialRows: [{ n: 1 }] });
  });

  it('does not infer a disconnect from an unknown no-status error', () => {
    for (const raw of [new Error('network'), new TypeError('Failed to fetch'), { name: 'NetworkError' }, {}]) {
      expect(toHostReadError('queryData', raw)).toMatchObject({ status: null, transport: false });
    }
    expect(toHostReadError('queryData', new DOMException('private', 'NetworkError'))).toMatchObject({ status: null, transport: true });
    expect(toHostReadError('queryData', hostError(401))).toMatchObject({ status: 401, transport: false });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it.each([401, 403, 503])('retains earlier rows after a later %s failure and retries only 503', async (status) => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': NEXT })
      .mockRejectedValue(hostError(status));
    const sleep = vi.fn<Sleep>(noSleep);
    await expect(queryAllRows(Q, { read, sleep })).rejects.toMatchObject({ status, partialRows: [1, 2], transport: false });
    expect(read.mock.calls.slice(1).every(([path]) => path === 'powerpagecomponents?$skiptoken=A%25B')).toBe(true);
    expect(read).toHaveBeenCalledTimes(status === 503 ? 5 : 2);
    expect(sleep.mock.calls).toEqual(status === 503 ? [[1000], [2000], [4000]] : []);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retains the terminal full page before strict rejection', async () => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': NEXT })
      .mockResolvedValueOnce({ value: [3, 4] });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2, 3, 4], transport: false });
    expect(NEXT_LINK_UNVERIFIED).toBe(true);
  });

  it('retains received rows when a nextLink is malformed', async () => {
    const read = vi.fn<RawRead>()
      .mockResolvedValueOnce({ value: [1], '@odata.nextLink': NEXT })
      .mockResolvedValueOnce({ value: [2], '@odata.nextLink': 7 });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2], transport: false });
  });

  it('retains rows and stops when the server repeats a paging link', async () => {
    const read = vi.fn<RawRead>().mockResolvedValue({ value: [9], '@odata.nextLink': NEXT });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({
      message: 'Dataverse repeated a paging link.', status: null, transport: false, partialRows: [9, 9],
    });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('does not impose a page cap on distinct continuation links', async () => {
    let page = 0;
    const read = vi.fn<RawRead>().mockImplementation(() => {
      page += 1;
      return Promise.resolve({
        value: [page],
        ...(page < 1001 ? { '@odata.nextLink': `https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=${String(page)}` } : {}),
      });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).resolves.toHaveLength(1001);
    expect(read).toHaveBeenCalledTimes(1001);
  });

  it('prevents another page after cancellation and does not turn cancellation into a finding', async () => {
    const controller = new AbortController();
    const read = vi.fn<RawRead>().mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ value: [1], '@odata.nextLink': NEXT });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep }, true, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('checks cancellation before dispatch and after retry waits', async () => {
    const before = new AbortController();
    before.abort();
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(hostError(503));
    await expect(withRetry('test', op, noSleep, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).not.toHaveBeenCalled();
    const during = new AbortController();
    const sleep = vi.fn<Sleep>(() => { during.abort(); return Promise.resolve(); });
    await expect(withRetry('test', op, sleep, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it('maps a host AbortError as a local failure when our signal is not aborted', async () => {
    const controller = new AbortController();
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(new DOMException('host timeout', 'AbortError'));
    await expect(withRetry('test', op, noSleep, controller.signal)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('models partial rows and confirmed loss in the fake, and records no pre-aborted call', async () => {
    const fake = createFakeHost({ failures: [{ operation: 'query', entitySet: Q.entitySet, status: null, transport: true, partialRows: [1] }] });
    await expect(fake.queryAll(Q)).rejects.toMatchObject({ transport: true, partialRows: [1] });
    fake.clearCalls();
    const controller = new AbortController();
    controller.abort();
    await expect(fake.queryAll(Q, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.calls).toEqual([]);
  });
});
