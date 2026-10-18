// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { ConnectionProvider } from '@/app/ConnectionProvider';
import { HostContext } from '@/app/HostContext';
import { useActiveConnection } from '@/app/useActiveConnection';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';

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
  const connection = useActiveConnection();
  return <p>{connection === null ? 'none' : connection.name}</p>;
}

async function mount(connection: Connection | null) {
  const host = createFakeHost({ connection });
  render(
    <HostContext value={host}>
      <ConnectionProvider>
        <Show />
      </ConnectionProvider>
    </HostContext>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return host;
}

describe('useActiveConnection', () => {
  it('reads the active connection on start', async () => {
    await mount(CONTOSO);
    expect(screen.getByText('Contoso')).toBeTruthy();
  });

  it('is null without a connection', async () => {
    await mount(null);
    expect(screen.getByText('none')).toBeTruthy();
  });

  it('re-reads on connection-changed and subscribes once', async () => {
    const host = await mount(CONTOSO);
    expect(host.listenerCount()).toBe(1);
    host.setConnection(FABRIKAM);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(screen.getByText('Fabrikam')).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(2);
  });

  it('ignores other events', async () => {
    const host = await mount(CONTOSO);
    await act(async () => {
      host.emit({ kind: 'settings-updated' });
      await Promise.resolve();
    });
    expect(host.callsOf('getActiveConnection')).toHaveLength(1);
  });
});
