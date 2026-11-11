// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderInspector } from '@/test/inspectorTestHarness';
import {
  CONNECTION,
  createInspectorHost,
  SITE_ALPHA,
  SITE_BETA,
  SITE_RETIRED,
} from '@/test/inspectorWorld';
import { SitePill } from './SitePill';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const combobox = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const scanReads = (host: ReturnType<typeof createInspectorHost>) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');

async function ready() {
  const context = renderInspector(<SitePill />);
  await waitFor(() => {
    expect(combobox().getAttribute('aria-disabled')).toBeNull();
  });
  return context;
}

describe('SitePill (AC-1.2, AC-1.3, AC-7.2)', () => {
  it('is disabled and explains itself while no connection is active', async () => {
    renderInspector(<SitePill />, { host: createInspectorHost(undefined, null) });
    await waitFor(() => {
      expect(screen.getByText('Select a connection in Power Platform ToolBox first.')).toBeTruthy();
    });
    expect(screen.getByRole('combobox', { name: 'Power Pages site' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('is disabled while the site list loads', async () => {
    const host = createInspectorHost();
    host.holdDataReads(true);
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(screen.getByText('Loading sites…')).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
    host.holdDataReads(false);
    await waitFor(() => {
      expect(combobox().getAttribute('aria-disabled')).toBeNull();
    });
  });

  it('is disabled with a reason when the site list cannot be read', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503 }],
    });
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(screen.getByText("Couldn't load sites. Open Logic Inspector to retry.")).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
  });

  it('is disabled when the environment has no sites', async () => {
    renderInspector(<SitePill />, { host: createInspectorHost({ sites: [] }) });
    await waitFor(() => {
      expect(screen.getByText('No Power Pages sites in this environment.')).toBeTruthy();
    });
    expect(combobox().getAttribute('aria-disabled')).toBe('true');
  });

  it('offers active sites and lists inactive ones disabled, with nothing preselected', async () => {
    const { host, user } = await ready();
    expect(combobox().textContent).toBe('No site selected');
    await user.click(combobox());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(screen.getByRole('option', { name: /Alpha portal/ }).getAttribute('aria-disabled')).toBeNull();
    const retired = screen.getByRole('option', { name: /Retired portal/ });
    expect(retired.getAttribute('aria-disabled')).toBe('true');
    expect(within(retired).getByText('Inactive')).toBeTruthy();
    expect(scanReads(host)).toHaveLength(0);
  });

  it('does not select the only site on its own', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    renderInspector(<SitePill />, { host });
    await waitFor(() => {
      expect(combobox().getAttribute('aria-disabled')).toBeNull();
    });
    expect(combobox().textContent).toBe('No site selected');
    expect(scanReads(host)).toHaveLength(0);
  });

  it('starts the scan of the chosen site and shows its name', async () => {
    const { host, user } = await ready();
    await user.click(combobox());
    await user.click(screen.getByRole('option', { name: /Beta portal/ }));
    await waitFor(() => {
      expect(combobox().textContent).toBe(SITE_BETA.name);
    });
    await waitFor(() => {
      expect(scanReads(host).length).toBeGreaterThan(0);
    });
    expect(scanReads(host).every((call) => call.query.filter?.includes(SITE_BETA.id))).toBe(true);
  });

  it('selects with the keyboard alone', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe(SITE_BETA.name);
    await waitFor(() => {
      expect(scanReads(host).length).toBeGreaterThan(0);
    });
  });

  it('never scans an inactive site', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe('No site selected');
    expect(combobox().getAttribute('aria-expanded')).toBe('true');
    expect(scanReads(host)).toHaveLength(0);
    expect(screen.getByRole('option', { name: new RegExp(SITE_RETIRED.name) })).toBeTruthy();
  });

  it('goes back to "No site selected" when the connection changes', async () => {
    const { host, user } = await ready();
    combobox().focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(combobox().textContent).toBe(SITE_ALPHA.name);
    host.setConnection({ ...CONNECTION, id: 'connection-9' });
    host.emit({ kind: 'connection-changed' });
    await waitFor(() => {
      expect(screen.getByText('No site selected')).toBeTruthy();
    });
  });
});
