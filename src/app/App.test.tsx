// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { FAKE_STARTER_DEPS } from '@/session/fakeStarterDeps';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import { gateHost } from '@/test/gatedHost';

const CONTOSO: Connection = {
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment: 'Dev',
};

async function mount(connection: Connection | null = null) {
  const host = createFakeHost({ connection });
  render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
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

  it('releases all three pages and the site picker by default (FR-1, AC-1.7)', async () => {
    await mount();
    expect(screen.getAllByRole('tab')).toEqual([
      screen.getByRole('tab', { name: 'Logic Starter' }),
      screen.getByRole('tab', { name: 'Server Objects' }),
      screen.getByRole('tab', { name: 'Logic Inspector' }),
    ]);
    for (const tab of screen.getAllByRole('tab')) expect(tab.hasAttribute('aria-disabled')).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Power Pages site' })).toBeTruthy();
  });

  it('swaps the visible page immediately and keeps the others mounted (AC-1.4)', async () => {
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Server Objects' }));
    expect(panel('objects')?.hidden).toBe(false);
    expect(panel('starter')?.hidden).toBe(true);
    expect(screen.getByRole('region', { name: 'Logic name', hidden: true })).toBeTruthy();
  });

  it('reads "Not connected" and keeps the site pill disabled without a connection (AC-1.3)', async () => {
    await mount(null);
    expect(screen.getByText('Not connected')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Power Pages site' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('region', { name: 'Logic name' })).toBeTruthy();
  });

  it('does not render the site pill while Logic Inspector is unreleased (AC-1.7)', async () => {
    vi.stubGlobal('__PAGE_INSPECTOR__', false);
    try {
      await mount(null);
      expect(screen.getByText('Not connected')).toBeTruthy();
      expect(screen.queryByText('No site selected')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows the connection and its environment (AC-1.2), and follows connection changes', async () => {
    const host = await mount(CONTOSO);
    expect(screen.getByText('Contoso · Development')).toBeTruthy();
    expect(screen.getByText('Contoso · Development').getAttribute('title')).toBe('Contoso · Development');
    host.setConnection(null);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(screen.getByText('Not connected')).toBeTruthy();
  });

  it('keeps following the connection while Logic Starter is visible (CR-001)', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO, tables: { powerpagesites: [] } }));
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    const siteListReads = () =>
      host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagesites');
    await waitFor(() => {
      expect(siteListReads()).toHaveLength(1);
    });
    expect(panel('starter')?.hidden).toBe(false);
    host.setConnection({ ...CONTOSO, id: 'c2' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(siteListReads()).toHaveLength(2);
    });
  });

  it('does not call an unreadable connection "Not connected" (WR-005)', async () => {
    const host = gateHost(createFakeHost({ connection: CONTOSO }));
    host.setConnectionRead('reject');
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Connection unavailable')).toBeTruthy();
    expect(screen.queryByText('Not connected')).toBeNull();
    host.setConnectionRead('ok');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(screen.getByText('Contoso · Development')).toBeTruthy();
  });

  it('registers one host event listener for the whole app and removes it on unmount', async () => {
    const host = createFakeHost();
    const { unmount } = render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    await act(async () => {
      await Promise.resolve();
    });
    // One adapter-level registration is Phase 01's job; the app adds two handlers (theme, connection) to it.
    expect(host.listenerCount()).toBe(2);
    unmount();
    expect(host.listenerCount()).toBe(0);
  });

  it('shows a recoverable alert instead of a blank window when the host throws during mount', async () => {
    const base = createFakeHost();
    const host = {
      ...base,
      onEvent: (): (() => void) => {
        throw new Error('host exploded');
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByRole('alert').textContent).toContain('Server Logic Tools');
    } finally {
      spy.mockRestore();
    }
  });
});
