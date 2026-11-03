// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import { createInspectorHost, OTHER_CONNECTION } from '@/test/inspectorWorld';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const tab = (name: string) => screen.getByRole('tab', { name });
const picker = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const readiness = () => screen.queryByRole('heading', { name: 'Review server logic readiness' });

async function openInspectorAndScan(host = createInspectorHost()) {
  const user = userEvent.setup();
  render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
  fireEvent.click(tab('Logic Inspector'));
  await screen.findByRole('heading', { name: 'Select a site' });
  await user.click(picker());
  await user.click(screen.getByRole('option', { name: /Alpha portal/ }));
  return { host, user };
}

async function connectionChanged(host: ReturnType<typeof createInspectorHost>) {
  host.setConnection(OTHER_CONNECTION);
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('Logic Inspector in the app (CR-001, AC-7.6)', () => {
  it('runs the journey: pick a site in the title bar, scan, read the results', async () => {
    await openInspectorAndScan();
    expect(await screen.findByRole('heading', { name: 'Review server logic readiness' })).toBeTruthy();
    expect(picker().textContent).toBe('Alpha portal');
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
  });

  it('clears finished results when the connection changes while Logic Starter is visible', async () => {
    const { host } = await openInspectorAndScan();
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    fireEvent.click(tab('Logic Starter'));
    expect(readiness()).toBeNull();
    await connectionChanged(host);
    await waitFor(() => {
      expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(2);
    });
    fireEvent.click(tab('Logic Inspector'));
    expect(await screen.findByRole('heading', { name: 'Select a site' })).toBeTruthy();
    expect(readiness()).toBeNull();
    expect(picker().textContent).toBe('No site selected');
  });

  it('discards a scan that is still running when the connection changes while another tab is visible', async () => {
    const host = createInspectorHost();
    const user = userEvent.setup();
    render(<App host={host} starterDeps={FAKE_STARTER_DEPS} />);
    fireEvent.click(tab('Logic Inspector'));
    await screen.findByRole('heading', { name: 'Select a site' });
    host.holdDataReads(true);
    await user.click(picker());
    await user.click(screen.getByRole('option', { name: /Alpha portal/ }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    fireEvent.click(tab('Server Objects'));
    await connectionChanged(host);
    host.holdDataReads(false);
    await waitFor(() => {
      expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(2);
    });
    fireEvent.click(tab('Logic Inspector'));
    expect(await screen.findByRole('heading', { name: 'Select a site' })).toBeTruthy();
    expect(readiness()).toBeNull();
    expect(host.dataReads.peak).toBe(4);
  });
});
