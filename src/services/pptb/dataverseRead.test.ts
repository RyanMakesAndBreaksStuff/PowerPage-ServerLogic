import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import {
  NEXT_LINK_UNVERIFIED,
  RETRY_DELAYS_MS,
  buildQueryPath,
  fetchAllPages,
  queryAllRows,
  withRetry,
} from './dataverseRead';
import type { RawRead, Sleep } from './dataverseRead';
import { isRetryable, messageForStatus, statusOf, toHostReadError } from './hostErrors';

const BASE = 'https://org.crm.dynamics.com/api/data/v9.2';

const QUERY: ODataQuery = {
  entitySet: 'powerpagecomponents',
  select: ['powerpagecomponentid', 'name'],
  filter: 'powerpagecomponenttype eq 35',
  orderBy: 'name',
  pageSize: 2,
};

const noSleep = (): Promise<void> => Promise.resolve();

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hostErrors', () => {
  it('reads a numeric status from a PPTB error object or an Error', () => {
    expect(statusOf({ message: 'x', status: 429, statusText: 'Too Many Requests' })).toBe(429);
    expect(statusOf(Object.assign(new Error('x'), { status: 503 }))).toBe(503);
    expect(statusOf(new Error('x'))).toBeNull();
    expect(statusOf('boom')).toBeNull();
    expect(statusOf({ status: '404' })).toBeNull();
  });

  // No numeric status crosses Electron IPC: the renderer gets PPTB's message text, wrapped by the IPC layer.
  const ipc = (text: string): Error =>
    new Error(`Error invoking remote method 'dataverse.queryData': Error: Dataverse queryData failed: ${text}`);

  it.each([
    ['HTTP 401', 401],
    ['HTTP 503: Service Unavailable', 503],
    ['0x80040220: Principal user (Id=x) is missing prvReadmspp_website privilege.', 403],
    ['0x80040217: The specified object was not found.', 404],
    ["0x80060888: Resource not found for the segment 'powerpagesites'.", 404],
    ['0x80072322: Number of requests exceeded the limit of 6000 over time window of 300 seconds.', 429],
    ["Authentication expired for connection 'Dev'. Please reconnect to continue.", 401],
    ["No access token found for 'Dev'. Please reconnect to the environment.", 401],
    ["Token refresh failed for 'Dev'. Please sign in again.", 401],
    ["Client secret authentication failed for 'Dev'. Please verify your credentials.", 401],
  ])('reads the status from PPTB message text: %s', (text, status) => {
    expect(statusOf(ipc(text))).toBe(status);
    expect(statusOf(new Error(text))).toBe(status);
    expect(toHostReadError('queryData', ipc(text))).toMatchObject({ status, message: messageForStatus(status) });
  });

  it('leaves unknown codes and text mid-sentence unclassified', () => {
    expect(statusOf(ipc('0x80040265: Some other failure.'))).toBeNull();
    expect(statusOf(new Error('see HTTP 404 docs'))).toBeNull();
    expect(statusOf({ message: 42 })).toBeNull();
  });

  it('treats PPTB "Request failed:" as a confirmed transport loss', () => {
    const lost = toHostReadError('queryData', ipc('Request failed: getaddrinfo ENOTFOUND org.example'));
    expect(lost).toMatchObject({ status: null, transport: true, message: "Couldn't read data from Dataverse." });
    expect(toHostReadError('queryData', ipc('HTTP 401'))).toMatchObject({ transport: false });
  });

  it('retries only 429 and 5xx', () => {
    expect([429, 500, 502, 503, 599].map(isRetryable)).toEqual([true, true, true, true, true]);
    expect([null, 400, 401, 403, 404, 600].map(isRetryable)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('maps every status to a plain-language message', () => {
    expect(messageForStatus(401)).toBe('Authentication failed. Please reconnect.');
    expect(messageForStatus(403)).toBe("You don't have permission to read this data.");
    expect(messageForStatus(404)).toBe('The requested data was not found.');
    expect(messageForStatus(429)).toBe('Too many requests. Please wait and try again.');
    expect(messageForStatus(503)).toBe('The server had a problem. Please try again later.');
    expect(messageForStatus(null)).toBe("Couldn't read data from Dataverse.");
    expect(messageForStatus(418)).toBe("Couldn't read data from Dataverse.");
  });

  it('keeps a HostReadError as it is and logs only the error name for anything else', () => {
    const log = vi.mocked(console.error);
    const own = new HostReadError('Already mapped.', 404);
    expect(toHostReadError('queryData', own)).toBe(own);
    expect(log).not.toHaveBeenCalled();

    const mapped = toHostReadError('queryData', {
      message: 'SECRET-BODY https://org.example/x',
      status: 403,
    });
    expect(mapped).toBeInstanceOf(HostReadError);
    expect(mapped.status).toBe(403);
    expect(mapped.message).not.toContain('SECRET');
    expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
  });
});

describe('buildQueryPath', () => {
  it('builds select, filter and order by on the entity set, with no $top', () => {
    expect(buildQueryPath(QUERY)).toBe(
      'powerpagecomponents?$select=powerpagecomponentid,name&$filter=powerpagecomponenttype eq 35&$orderby=name',
    );
  });

  it('leaves out a null filter and a null order by', () => {
    expect(buildQueryPath({ ...QUERY, filter: null, orderBy: null })).toBe(
      'powerpagecomponents?$select=powerpagecomponentid,name',
    );
  });

  it.each<[string, Partial<ODataQuery>]>([
    ['an entity set with a slash', { entitySet: 'powerpagecomponents/x' }],
    ['an empty entity set', { entitySet: '' }],
    ['no select columns', { select: [] }],
    ['a select column with a comma', { select: ['a,b'] }],
    ['a filter with an ampersand', { filter: "name eq 'a' & $top=1" }],
    ['a filter with a hash', { filter: 'name eq 1#x' }],
    ['a filter with a line break', { filter: 'name eq 1\nx' }],
    ['an order by with an ampersand', { orderBy: 'name&x' }],
    ['a page size of 0', { pageSize: 0 }],
    ['a page size above 5000', { pageSize: 5001 }],
    ['a fractional page size', { pageSize: 1.5 }],
  ])('rejects %s', (_label, change) => {
    expect(() => buildQueryPath({ ...QUERY, ...change })).toThrow(HostReadError);
  });
});

describe('withRetry', () => {
  it('retries 429 and 5xx after 1 s, 2 s and 4 s, then throws the last failure', async () => {
    expect(RETRY_DELAYS_MS).toEqual([1000, 2000, 4000]);
    const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
    const op = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 503, message: 'down' });
    await expect(withRetry('test', op, sleep)).rejects.toMatchObject({
      name: 'HostReadError',
      status: 503,
    });
    expect(op).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it('returns the result as soon as a retry succeeds', async () => {
    const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue('ok');
    await expect(withRetry('test', op, sleep)).resolves.toBe('ok');
    expect(sleep.mock.calls).toEqual([[1000]]);
  });

  it.each([404, 401, 403, null])('does not retry a failure with status %s', async (status) => {
    const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(status === null ? new Error('x') : { status });
    await expect(withRetry('test', op, sleep)).rejects.toMatchObject({
      name: 'HostReadError',
      status,
    });
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('fetchAllPages', () => {
  const page = (rows: unknown[], nextLink: string | null) => Promise.resolve({ rows, nextLink });

  it('accepts a full last page when the strict gate is off', async () => {
    const rows = await fetchAllPages(() => page([1, 2], null), QUERY, false);
    expect(rows).toEqual([1, 2]);
  });

  it('fails closed on a full page with no link when the strict gate is on', async () => {
    await expect(fetchAllPages(() => page([1, 2], null), QUERY, true)).rejects.toThrow(
      /may be incomplete/,
    );
  });

  it('stops when the server repeats a paging link and keeps the rows it received', async () => {
    const link = `${BASE}/powerpagecomponents?$select=name&$skiptoken=A`;
    const readPage = vi.fn(() => page([1], link));
    await expect(fetchAllPages(readPage, QUERY, false)).rejects.toMatchObject({
      name: 'HostReadError',
      message: 'Dataverse repeated a paging link.',
      partialRows: [1, 1],
    });
    expect(readPage).toHaveBeenCalledTimes(2);
  });

  it('ships with the strict gate on until Spike S2 confirms @odata.nextLink', () => {
    expect(NEXT_LINK_UNVERIFIED).toBe(true);
  });
});

describe('queryAllRows', () => {
  it('sends the page size as a Prefer header on every page', async () => {
    const read = vi.fn<RawRead>().mockResolvedValue({ value: [1] });
    await queryAllRows({ ...QUERY, pageSize: 5 }, { read, sleep: noSleep });
    expect(read).toHaveBeenCalledWith(expect.any(String), { Prefer: 'odata.maxpagesize=5' });
  });
});
