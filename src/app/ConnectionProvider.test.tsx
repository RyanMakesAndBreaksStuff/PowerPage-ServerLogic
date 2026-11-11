// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import {
  useConnectionState,
  useRefreshConnection,
} from '@/app/useActiveConnection';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { gateHost } from '@/test/gatedHost';
import type { GatedHost } from '@/test/gatedHost';

afterEach(cleanup);

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};
const FABRIKAM: Connection = {
  id: 'c2',
  name: 'Fabrikam',
  url: 'https://fabrikam.crm.dynamics.com',
  environment: 'Test',
};

function Show(): ReactElement {
  const state = useConnectionState();
  const text = state.status === 'connected' ? `connected ${state.connection.name}` : state.status;
  return <p>{state.refreshFailed ? `${text} (refresh failed)` : text}</p>;
}

/** The state, whether a read is in flight and a Retry, as the page uses them (D-05). */
function ShowRefresh(): ReactElement {
  const { refresh, pending } = useRefreshConnection();
  return (
    <div>
      <Show />
      <p>{pending ? 'pending' : 'idle'}</p>
      <button type="button" onClick={refresh}>
        Retry
      </button>
    </div>
  );
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

async function mount(connection: Connection | null, ui: ReactElement = <Show />) {
  const host = gateHost(createFakeHost({ connection }));
  const view = render(
    <HostContext value={host}>
      <ConnectionProvider>{ui}</ConnectionProvider>
    </HostContext>,
  );
  await flush();
  return { host, ...view };
}

async function changed(host: GatedHost) {
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('ConnectionProvider', () => {
  it('reads the active connection on start', async () => {
    await mount(CONTOSO);
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('reads a successful null as a confirmed disconnect, not as unknown', async () => {
    await mount(null);
    expect(screen.getByText('disconnected')).toBeTruthy();
  });

  it('is unknown, with no failure, until the first read settles', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(screen.getByText('unknown')).toBeTruthy();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('re-reads on connection-changed and subscribes once', async () => {
    const { host } = await mount(CONTOSO);
    expect(host.listenerCount()).toBe(1);
    host.setConnection(FABRIKAM);
    await changed(host);
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
  });

  it('ignores other events', async () => {
    const { host } = await mount(CONTOSO);
    await act(async () => {
      host.emit({ kind: 'settings-updated' });
      await Promise.resolve();
    });
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
  });

  it('publishes a rename that keeps the same id and URL', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnection({ ...CONTOSO, name: 'Contoso renamed', environment: 'Production' });
    await changed(host);
    expect(screen.getByText('connected Contoso renamed')).toBeTruthy();
  });

  it('keeps the last confirmed connection when a refresh rejects, and says the refresh failed (WR-005)', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    host.setConnectionRead('ok');
    await changed(host);
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('keeps a confirmed disconnect when a refresh rejects', async () => {
    const { host } = await mount(null);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('disconnected (refresh failed)')).toBeTruthy();
  });

  it('reads a rejected first read as unknown with a failure, never as "none"', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('reject');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    await flush();
    expect(screen.getByText('unknown (refresh failed)')).toBeTruthy();
  });

  it('recovers on window focus after a failed refresh', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnectionRead('reject');
    await changed(host);
    host.setConnectionRead('ok');
    host.setConnection(FABRIKAM);
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('recovers when the document becomes visible, and ignores becoming hidden', async () => {
    const { host } = await mount(CONTOSO);
    host.setConnection(FABRIKAM);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();
      expect(screen.getByText('connected Contoso')).toBeTruthy();
    } finally {
      Reflect.deleteProperty(document, 'visibilityState');
    }
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('ignores the answer to a read that a newer read superseded', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    await changed(host);
    expect(host.parkedConnectionReads).toBe(2);
    host.settleConnectionRead(1, FABRIKAM);
    await flush();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
  });

  it('drops a late answer after unmount and removes every listener', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    const { unmount } = render(
      <HostContext value={host}>
        <ConnectionProvider>
          <Show />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(host.listenerCount()).toBe(1);
    unmount();
    expect(host.listenerCount()).toBe(0);
    host.settleConnectionRead(0, CONTOSO);
    host.setConnectionRead('ok');
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
  });
});

describe('ConnectionProvider: Retry (D-05, S-06)', () => {
  const retry = () =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await Promise.resolve();
    });

  it('re-reads the active connection on Retry', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnection(FABRIKAM);
    await retry();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
    expect(host.listenerCount()).toBe(1);
  });

  it('says a read is pending from start to settle, so Retry can be hidden meanwhile', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <ShowRefresh />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    expect(screen.getByText('pending')).toBeTruthy();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    expect(screen.getByText('idle')).toBeTruthy();
    await retry();
    expect(screen.getByText('pending')).toBeTruthy();
    host.settleConnectionRead(1, CONTOSO);
    await flush();
    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('lets a newer read supersede the one Retry started', async () => {
    const host = gateHost(createFakeHost());
    host.setConnectionRead('hold');
    render(
      <HostContext value={host}>
        <ConnectionProvider>
          <ShowRefresh />
        </ConnectionProvider>
      </HostContext>,
    );
    await flush();
    host.settleConnectionRead(0, CONTOSO);
    await flush();
    await retry();
    await changed(host);
    expect(host.parkedConnectionReads).toBe(3);
    host.settleConnectionRead(2, FABRIKAM);
    await flush();
    host.settleConnectionRead(1, CONTOSO);
    await flush();
    expect(screen.getByText('connected Fabrikam')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('clears the failure when Retry succeeds', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnectionRead('reject');
    await changed(host);
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    host.setConnectionRead('ok');
    await retry();
    expect(screen.getByText('connected Contoso')).toBeTruthy();
  });

  it('keeps the confirmed connection when Retry fails too', async () => {
    const { host } = await mount(CONTOSO, <ShowRefresh />);
    host.setConnectionRead('reject');
    await retry();
    expect(screen.getByText('connected Contoso (refresh failed)')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
  });
});
