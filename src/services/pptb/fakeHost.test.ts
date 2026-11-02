import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { Connection, HostEvent, ODataQuery, PptbHost } from './host.types';
import { createFakeHost } from './fakeHost';

const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const REF = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' };
const CONNECTION: Connection = {
  id: 'c1',
  name: 'PG DEV',
  url: 'https://pg-dev.crm.dynamics.com',
  environment: 'Dev',
};
const QUERY: ODataQuery = {
  entitySet: 'powerpagecomponents',
  select: ['name'],
  filter: 'powerpagecomponenttype eq 35',
  orderBy: null,
  pageSize: 2,
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createFakeHost defaults', () => {
  it('is a PptbHost with light theme, no connection and succeeding notify, copy, save and open', async () => {
    const host: PptbHost = createFakeHost();
    await expect(host.getTheme()).resolves.toBe('light');
    await expect(host.getActiveConnection()).resolves.toBeNull();
    await expect(host.notify({ title: 'a', body: 'b', type: 'info' })).resolves.toBeUndefined();
    await expect(host.copyText('x')).resolves.toBeUndefined();
    await expect(host.openExternal('https://github.com/')).resolves.toBeUndefined();
    await expect(host.saveFile('a.md', 'x', [])).resolves.toEqual({
      status: 'saved',
      path: 'C:\\fake\\a.md',
    });
  });

  it('takes the theme and connection from its init and lets a test change them', async () => {
    const host = createFakeHost({ theme: 'dark', connection: CONNECTION });
    await expect(host.getTheme()).resolves.toBe('dark');
    await expect(host.getActiveConnection()).resolves.toEqual(CONNECTION);
    host.setTheme('light');
    host.setConnection(null);
    await expect(host.getTheme()).resolves.toBe('light');
    await expect(host.getActiveConnection()).resolves.toBeNull();
  });
});

describe('notify behaviours', () => {
  const notice = { title: 'a', body: 'b', type: 'error' } as const;

  it.each(['throw', 'reject', 'missing'] as const)(
    'rejects in %s mode and still records the call',
    async (mode) => {
      const host = createFakeHost({ notify: mode });
      await expect(host.notify(notice)).rejects.toBeInstanceOf(Error);
      expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice }]);
    },
  );

  it('names the failure so a test can tell the modes apart', async () => {
    await expect(createFakeHost({ notify: 'throw' }).notify(notice)).rejects.toMatchObject({
      name: 'TypeError',
    });
    await expect(createFakeHost({ notify: 'reject' }).notify(notice)).rejects.toMatchObject({
      name: 'Error',
    });
    await expect(createFakeHost({ notify: 'missing' }).notify(notice)).rejects.toMatchObject({
      name: 'HostCallError',
    });
  });

  it('switches mode with setNotify', async () => {
    const host = createFakeHost();
    host.setNotify('reject');
    await expect(host.notify(notice)).rejects.toBeInstanceOf(Error);
    host.setNotify('ok');
    await expect(host.notify(notice)).resolves.toBeUndefined();
  });
});

describe('copy, open and save', () => {
  it('rejects copy and open when told to', async () => {
    const host = createFakeHost({ copy: 'reject', openExternal: 'reject' });
    await expect(host.copyText('x')).rejects.toBeInstanceOf(Error);
    await expect(host.openExternal('https://github.com/')).rejects.toBeInstanceOf(Error);
    host.setCopy('ok');
    host.setOpenExternal('ok');
    await expect(host.copyText('x')).resolves.toBeUndefined();
    await expect(host.openExternal('https://github.com/')).resolves.toBeUndefined();
    expect(host.callsOf('copyText')).toHaveLength(2);
    expect(host.callsOf('openExternal')).toHaveLength(2);
  });

  it('keeps saved files, including bytes, and nothing for a cancel or a rejection', async () => {
    const host = createFakeHost();
    const bytes = new Uint8Array([80, 75]);
    await host.saveFile('a.zip', bytes, [{ name: 'Zip', extensions: ['zip'] }]);
    host.setSave('cancel');
    await expect(host.saveFile('b.md', 'x', [])).resolves.toEqual({ status: 'cancelled' });
    host.setSave('reject');
    await expect(host.saveFile('c.md', 'x', [])).rejects.toBeInstanceOf(Error);
    expect(host.savedFiles).toEqual([
      { path: 'C:\\fake\\a.zip', defaultName: 'a.zip', content: bytes },
    ]);
    expect(host.callsOf('saveFile').map((c) => c.defaultName)).toEqual(['a.zip', 'b.md', 'c.md']);
    expect(host.callsOf('saveFile')[0]?.filters).toEqual([{ name: 'Zip', extensions: ['zip'] }]);
  });
});

describe('events', () => {
  it('delivers emitted events to every handler until it unsubscribes', () => {
    const host = createFakeHost();
    const seen: HostEvent[] = [];
    const other = vi.fn();
    const unsubscribe = host.onEvent((e) => seen.push(e));
    host.onEvent(other);
    expect(host.listenerCount()).toBe(2);
    host.emit({ kind: 'connection-changed' });
    unsubscribe();
    host.emit({ kind: 'settings-updated' });
    expect(seen).toEqual([{ kind: 'connection-changed' }]);
    expect(other).toHaveBeenCalledTimes(2);
    expect(host.listenerCount()).toBe(1);
  });

  it('keeps delivering when a handler throws', () => {
    const host = createFakeHost();
    const after = vi.fn();
    host.onEvent(() => {
      throw new Error('boom');
    });
    host.onEvent(after);
    host.emit({ kind: 'other', name: 'tool:loaded' });
    expect(after).toHaveBeenCalledWith({ kind: 'other', name: 'tool:loaded' });
  });
});

describe('queryAll', () => {
  it('returns the rows for the entity set, and every page of a paged result in order', async () => {
    const host = createFakeHost({
      tables: {
        accounts: [{ a: 1 }],
        powerpagecomponents: { pages: [[{ n: 1 }, { n: 2 }], [{ n: 3 }], []] },
      },
    });
    await expect(host.queryAll({ ...QUERY, entitySet: 'accounts' })).resolves.toEqual([{ a: 1 }]);
    await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(host.callsOf('queryAll').map((c) => c.pages)).toEqual([1, 3]);
    expect(host.callsOf('queryAll')[1]?.query).toEqual(QUERY);
  });

  it('asks responders first, in order, and falls back to the table when none answers', async () => {
    const host = createFakeHost({
      tables: { powerpagecomponents: [{ from: 'table' }] },
      responders: [
        (q) => (q.filter?.includes('= 35') === true ? [{ from: 'first' }] : undefined),
        (q) => (q.filter?.includes('eq 11') === true ? [{ from: 'second' }] : undefined),
      ],
    });
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype = 35' }),
    ).resolves.toEqual([{ from: 'first' }]);
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 11' }),
    ).resolves.toEqual([{ from: 'second' }]);
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 9' }),
    ).resolves.toEqual([{ from: 'table' }]);
  });

  it('fails loudly with a 404 for an entity set nobody scripted', async () => {
    const host = createFakeHost();
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: 404,
    });
  });

  it('throws a scripted failure with its status, for as many calls as `times` says', async () => {
    const host = createFakeHost({
      tables: { powerpagecomponents: [{ n: 1 }] },
      failures: [{ operation: 'query', entitySet: 'powerpagecomponents', status: 503, times: 2 }],
    });
    await expect(host.queryAll(QUERY)).rejects.toMatchObject({
      name: 'HostReadError',
      status: 503,
    });
    await expect(host.queryAll(QUERY)).rejects.toBeInstanceOf(HostReadError);
    await expect(host.queryAll(QUERY)).resolves.toEqual([{ n: 1 }]);
  });

  it('fails every matching call when `times` is left out, and only those that contain the text', async () => {
    const host = createFakeHost({
      tables: { powerpagecomponents: [{ n: 1 }] },
      failures: [
        { operation: 'query', entitySet: 'powerpagecomponents', status: null, contains: 'eq 18' },
      ],
    });
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 18' }),
    ).rejects.toMatchObject({
      status: null,
    });
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 18' }),
    ).rejects.toMatchObject({
      status: null,
    });
    await expect(
      host.queryAll({ ...QUERY, filter: 'powerpagecomponenttype eq 11' }),
    ).resolves.toEqual([{ n: 1 }]);
    await expect(host.queryAll({ ...QUERY, filter: null })).resolves.toEqual([{ n: 1 }]);
  });

  it('records a failed call too', async () => {
    const host = createFakeHost({
      failures: [{ operation: 'query', entitySet: 'powerpagecomponents', status: 429 }],
    });
    await host.queryAll(QUERY).catch(() => undefined);
    expect(host.callsOf('queryAll')).toHaveLength(1);
  });
});

describe('downloadFileColumn', () => {
  it('returns canned text by <logical-table>/<id>/<column>', async () => {
    const host = createFakeHost({
      fileColumns: { [`powerpagecomponent/${GUID}/filecontent`]: 'export function get() {}' },
    });
    await expect(host.downloadFileColumn(REF)).resolves.toBe(
      'export function get() {}',
    );
    expect(host.callsOf('downloadFileColumn')).toEqual([
      {
        method: 'downloadFileColumn',
        ref: REF,
      },
    ]);
  });

  it('fails with a 404 for a column nobody scripted', async () => {
    const host = createFakeHost();
    await expect(
      host.downloadFileColumn(REF),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('fails one record and not another, and file failures do not touch queries', async () => {
    const other = '11111111-2222-3333-4444-555555555555';
    const host = createFakeHost({
      tables: { powerpagecomponents: [] },
      fileColumns: {
        [`powerpagecomponent/${GUID}/filecontent`]: 'a',
        [`powerpagecomponent/${other}/filecontent`]: 'b',
      },
      failures: [
        { operation: 'file', entitySet: 'powerpagecomponent', status: 500, contains: other },
      ],
    });
    await expect(host.downloadFileColumn(REF)).resolves.toBe(
      'a',
    );
    await expect(
      host.downloadFileColumn({ ...REF, recordId: other }),
    ).rejects.toMatchObject({
      status: 500,
    });
    await expect(host.queryAll(QUERY)).resolves.toEqual([]);
  });
});

describe('recorded calls', () => {
  it('records every method in order and clears them', async () => {
    const host = createFakeHost({ tables: { powerpagecomponents: [] } });
    await host.getTheme();
    await host.getActiveConnection();
    await host.queryAll(QUERY);
    expect(host.calls.map((c) => c.method)).toEqual([
      'getTheme',
      'getActiveConnection',
      'queryAll',
    ]);
    host.clearCalls();
    expect(host.calls).toEqual([]);
  });
});
