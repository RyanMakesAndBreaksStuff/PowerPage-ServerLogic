// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/app/App';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';

afterEach(cleanup);

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};

async function mount(connection: Connection | null = null) {
  const host = createFakeHost({ connection });
  render(<App host={host} />);
  await act(async () => {
    await Promise.resolve();
  });
  return host;
}

const panel = (id: string) => document.getElementById(`panel-${id}`);

describe('App shell', () => {
  it('renders with no PPTB host globals', async () => {
    expect('toolboxAPI' in window).toBe(false);
    await mount();
    expect(screen.getByText('Server Logic Tools')).toBeTruthy();
  });

  it('shows Logic Starter first, with the other released pages mounted but hidden (AC-1.1, AC-1.4)', async () => {
    await mount();
    expect(panel('starter')?.hidden).toBe(false);
    expect(panel('objects')?.hidden).toBe(true);
    expect(panel('inspector')?.hidden).toBe(true);
    expect(panel('starter')?.getAttribute('role')).toBe('tabpanel');
    expect(panel('starter')?.getAttribute('aria-labelledby')).toBe('tab-starter');
  });

  it('swaps the visible page immediately and keeps the others mounted (AC-1.4)', async () => {
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Server Objects' }));
    expect(panel('objects')?.hidden).toBe(false);
    expect(panel('starter')?.hidden).toBe(true);
    expect(screen.getByText('Logic Starter page placeholder')).toBeTruthy();
  });

  it('reads "Not connected" and keeps the site pill disabled without a connection (AC-1.3)', async () => {
    await mount(null);
    expect(screen.getByText('Not connected')).toBeTruthy();
    expect(screen.getByText('No site selected').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Logic Starter page placeholder')).toBeTruthy();
  });

  it('shows the connection and its environment (AC-1.2), and follows connection changes', async () => {
    const host = await mount(CONTOSO);
    expect(screen.getByText('Contoso · Development')).toBeTruthy();
    host.setConnection(null);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(screen.getByText('Not connected')).toBeTruthy();
  });

  it('registers one host event listener for the whole app and removes it on unload (FR-12)', async () => {
    const host = createFakeHost();
    const { unmount } = render(<App host={host} />);
    await act(async () => {
      await Promise.resolve();
    });
    // One adapter-level registration is Phase 01's job; the app adds two handlers (theme, connection) to it.
    expect(host.listenerCount()).toBe(2);
    unmount();
    expect(host.listenerCount()).toBe(0);
  });
});
