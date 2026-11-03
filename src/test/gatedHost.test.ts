import { describe, expect, it } from 'vitest';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { gateHost } from './gatedHost';

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};
const QUERY = { entitySet: 'things', select: ['id'], filter: null, orderBy: null, pageSize: 10 };

describe('gateHost', () => {
  it('passes calls through to the fake and records them', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO, tables: { things: [{ id: 1 }] } }));
    await expect(host.getActiveConnection()).resolves.toEqual(CONTOSO);
    await expect(host.queryAll(QUERY)).resolves.toEqual([{ id: 1 }]);
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
    expect(host.callsOf('queryAll')).toHaveLength(1);
    expect(host.dataReads).toEqual({ started: 1, inFlight: 0, peak: 1 });
  });

  it('rejects connection reads in reject mode', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('reject');
    await expect(host.getActiveConnection()).rejects.toThrow('getActiveConnection');
    host.setConnectionRead('ok');
    await expect(host.getActiveConnection()).resolves.toEqual(CONTOSO);
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
  });

  it('parks connection reads in hold mode until the test settles each one', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    const first = host.getActiveConnection();
    const second = host.getActiveConnection();
    expect(host.parkedConnectionReads).toBe(2);
    host.rejectConnectionRead(0);
    host.settleConnectionRead(1, CONTOSO);
    await expect(first).rejects.toThrow('getActiveConnection');
    await expect(second).resolves.toEqual(CONTOSO);
  });

  it('parks data reads until released and counts them', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [{ id: 1 }] } }));
    host.holdDataReads(true);
    const read = host.queryAll(QUERY);
    await Promise.resolve();
    expect(host.dataReads).toMatchObject({ started: 1, inFlight: 1, peak: 1 });
    expect(host.callsOf('queryAll')).toHaveLength(0);
    host.holdDataReads(false);
    await expect(read).resolves.toEqual([{ id: 1 }]);
    expect(host.dataReads.inFlight).toBe(0);
  });

  it('rejects a parked data read with AbortError when its signal aborts', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [] } }));
    host.holdDataReads(true);
    const controller = new AbortController();
    const read = host.queryAll(QUERY, controller.signal);
    controller.abort();
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    expect(host.dataReads.inFlight).toBe(0);
  });

  it('keeps a parked data read pending after its signal aborts when the hold ignores abort', async () => {
    const host = gateHost(createFakeHost({ tables: { things: [{ id: 1 }] } }));
    host.holdDataReads(true, { ignoreAbort: true });
    const controller = new AbortController();
    const state = { settled: false };
    const outcome = host.queryAll(QUERY, controller.signal).then(
      () => {
        state.settled = true;
      },
      () => {
        state.settled = true;
      },
    );
    controller.abort();
    await Promise.resolve();
    await Promise.resolve();
    expect(state.settled).toBe(false);
    expect(host.dataReads.inFlight).toBe(1);
    host.releaseHeldDataReads(1);
    await outcome;
    expect(state.settled).toBe(true);
    expect(host.dataReads.inFlight).toBe(0);
  });
});
