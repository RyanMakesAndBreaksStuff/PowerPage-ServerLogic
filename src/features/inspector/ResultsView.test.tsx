// @vitest-environment jsdom
import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScannedInspector } from '@/test/inspectorTestHarness';
import type { ScannedInspectorOptions } from '@/test/inspectorTestHarness';
import { CONNECTION, createInspectorHost, OTHER_CONNECTION, SITE_ALPHA } from '@/test/inspectorWorld';
import type { SiteFacts } from '@/types/inspector';
import { CHECK_COPY, NOT_SCANNED_TEXT } from './model/copy';
import { file, permission, read, role, siteFacts } from './model/fixtures';
import {
  EXPORT_NO_FILES_REASON,
  EXPORT_NOTHING_READ_REASON,
  NO_FILE_TEXT,
  NO_FILES_TEXT,
  NOTHING_READ_TEXT,
} from './pageCopy';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const GLOBAL_GRANT = permission('perm-1', { scope: 'Global', roleIds: ['staff'] });

const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';

/**
 * file-1: Web role and Outbound configured, Table permissions Needs review (a Global grant).
 * file-2: no web role and an HttpClient call with the default network settings, so two checks need review.
 */
function facts(patch: Partial<SiteFacts> = {}): SiteFacts {
  return siteFacts({
    roles: read([role('staff')]),
    permissions: read([GLOBAL_GRANT]),
    files: [
      file({ id: 'file-1', name: 'customer-summary' }),
      file({ id: 'file-2', name: 'order-sync', roleIds: read([]), code: read(HTTP_CODE) }),
    ],
    ...patch,
  });
}

const rail = () => screen.getByRole('region', { name: /^Server logic \(/ });
const fileButton = (name: RegExp) => within(rail()).getByRole('button', { name });

/** Scans Alpha portal and stops on the finished page with no file selected (D-03). */
const scanned = (data: SiteFacts = facts(), options: ScannedInspectorOptions = {}) =>
  renderScannedInspector(data, options);

/** The finished page with the first file, customer-summary, chosen in the rail. */
async function open(data: SiteFacts = facts(), options: ScannedInspectorOptions = {}) {
  const view = await scanned(data, options);
  await view.user.click(fileButton(/customer-summary/));
  return view;
}

const tile = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) });
const detail = (title: string) => screen.getByRole('region', { name: title });
const reviewUpdates = () => screen.getByRole('status', { name: 'Review updates' });

describe('before a file is chosen (D-03, D-18)', () => {
  it('shows one prompt in place of the ring, findings and detail, and the site in the title tile', async () => {
    await scanned();
    expect(screen.getByText(NO_FILE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /addressed/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Web role assigned/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Table permissions' })).toBeNull();
    expect(screen.queryByRole('button', { name: /mark as reviewed|undo review/i })).toBeNull();
    expect(screen.getByText('Alpha portal', { selector: '.inspector-title__file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export report' })).toBeTruthy();
  });

  it('highlights nothing in the rail and keeps its files reachable from the keyboard', async () => {
    const { user } = await scanned();
    const first = fileButton(/customer-summary/);
    const second = fileButton(/order-sync/);
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(document.querySelectorAll('.inspector-file--selected')).toHaveLength(0);
    first.focus();
    await user.keyboard('{Enter}');
    expect(first.getAttribute('aria-current')).toBe('true');
    expect(screen.queryByText(NO_FILE_TEXT)).toBeNull();
  });

  it('shows the chosen file\'s ring, tiles and detail once a file is picked', async () => {
    const { user } = await scanned();
    await user.click(fileButton(/order-sync/));
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('order-sync · Active')).toBeTruthy();
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(detail('Web role assigned')).toBeTruthy();
  });

  it.each([
    ['completely', true],
    ['incompletely', false],
  ] as const)(
    'shows no prompt, ring, finding or detail when no file exists and the list was read %s (D-18 extension)',
    async (_label, inventoryComplete) => {
      await scanned(facts({ files: [], inventoryComplete }));
      expect(screen.queryByText(NO_FILE_TEXT)).toBeNull();
      expect(screen.queryByRole('img', { name: /addressed/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^(Web role assigned|Table permissions|Outbound networking)/ })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Table permissions' })).toBeNull();
      // The rail already says why there is nothing to choose.
      expect(
        screen.getByText(inventoryComplete ? NO_FILES_TEXT : NOTHING_READ_TEXT, { selector: '.inspector-rail__empty' }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    },
  );
});

describe('lines that repeat inside one finding', () => {
  const REASON = 'Global access to contact (Global) from role staff.';

  it('renders each repeated reason and snapshot row without a key warning, and leaves no stale row after switching finding', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Two Global grants on one table for the same role give the same reason text twice (checks.ts).
    const { user } = await open(
      facts({ permissions: read([GLOBAL_GRANT, permission('perm-2', { scope: 'Global', roleIds: ['staff'] })]) }),
    );
    const region = within(detail('Table permissions'));
    expect(region.getAllByText(REASON)).toHaveLength(2);
    expect(region.getAllByText('contact · Global · Read · role staff')).toHaveLength(2);
    await user.click(tile('Outbound networking'));
    expect(within(detail('Outbound networking')).queryByText(REASON)).toBeNull();
    await user.click(tile('Table permissions'));
    expect(within(detail('Table permissions')).getAllByText(REASON)).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('Export report (P5.7)', () => {
  it('opens the Export report dialog for a finished scan with files', async () => {
    const { user } = await open();
    const button = screen.getByRole('button', { name: 'Export report' });
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(button);
    expect(screen.getByRole('dialog', { name: 'Export report' })).toBeTruthy();
  });

  it.each([
    ['a complete empty result', true, null, EXPORT_NO_FILES_REASON],
    ['a stopped empty result', false, 'connection-lost', EXPORT_NOTHING_READ_REASON],
  ] as const)(
    'is disabled with its reason for %s',
    async (_label, inventoryComplete, stopped, reason) => {
      const { user } = await scanned(facts({ files: [], inventoryComplete, stopped }));
      const button = screen.getByRole('button', { name: 'Export report' });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      await user.hover(button);
      expect(screen.getByText(reason)).toBeTruthy();
      await user.click(button);
      expect(screen.queryByRole('dialog')).toBeNull();
    },
  );

  it('stays present and enabled for a stopped scan with files', async () => {
    await scanned(facts({ stopped: 'connection-lost', inventoryComplete: false }));
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export report' }).getAttribute('aria-disabled')).toBeNull();
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
  });
});

describe('readiness ring (AC-8.1)', () => {
  it('shows "K/3 addressed" and the legend for the selected file', async () => {
    await open();
    const ring = screen.getByRole('img', { name: '2 of 3 addressed' });
    expect(within(ring).getByText('2/3')).toBeTruthy();
    expect(within(ring).getByText('addressed')).toBeTruthy();
    expect(screen.getByText('2 configured · 1 review')).toBeTruthy();
  });

  it('follows the selected file', async () => {
    const { user } = await open();
    await user.click(fileButton(/order-sync/));
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('1 configured · 2 review')).toBeTruthy();
  });

  it('draws a Not scanned check grey, counts it in neither K nor M, and adds it to the legend', async () => {
    await open(
      facts({
        permissions: read([]),
        files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })],
      }),
    );
    expect(screen.getByRole('img', { name: '1 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('1 configured · 0 review · 2 not scanned')).toBeTruthy();
    expect(document.querySelectorAll('.ui-ring__arc--not-scanned')).toHaveLength(2);
  });
});

describe('finding tiles and selection (AC-8.2, AC-8.3)', () => {
  it('shows three tiles, each with an icon, a title, a summary and a status word', async () => {
    await open();
    const web = tile('Web role assigned');
    expect(within(web).getByText('Configured')).toBeTruthy();
    expect(within(web).getByText('Web role assigned.')).toBeTruthy();
    const tables = tile('Table permissions');
    expect(within(tables).getByText('Needs review')).toBeTruthy();
    expect(within(tables).getByText(/Global access to contact \(Global\) from role staff\./)).toBeTruthy();
    expect(within(tile('Outbound networking')).getByText('Configured')).toBeTruthy();
    expect(document.querySelectorAll('.inspector-finding__icon')).toHaveLength(3);
  });

  it('selects the first Needs-review finding of the selected file', async () => {
    await open();
    expect(tile('Table permissions').getAttribute('aria-current')).toBe('true');
    expect(tile('Web role assigned').getAttribute('aria-current')).toBeNull();
    expect(detail('Table permissions')).toBeTruthy();
  });

  it('falls back to the first check when nothing needs review', async () => {
    await open(facts({ permissions: read([]) }));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(detail('Web role assigned')).toBeTruthy();
  });

  it('chooses a finding by click or keyboard, and remembers the choice for that file', async () => {
    const { user } = await open();
    await user.click(tile('Outbound networking'));
    expect(detail('Outbound networking')).toBeTruthy();
    tile('Web role assigned').focus();
    await user.keyboard('{Enter}');
    expect(detail('Web role assigned')).toBeTruthy();
    await user.click(fileButton(/order-sync/));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    await user.click(fileButton(/customer-summary/));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
  });
});

describe('detail tile (AC-8.4, AC-8.12)', () => {
  it('shows category, status, original reasons, guidance, questions and the snapshot', async () => {
    await open();
    const region = within(detail('Table permissions'));
    expect(region.getByText('Table permissions', { selector: 'p' })).toBeTruthy();
    expect(region.getByText('Needs review')).toBeTruthy();
    expect(region.getByRole('heading', { name: 'Why this needs review' })).toBeTruthy();
    expect(region.getAllByText('Global access to contact (Global) from role staff.')).toHaveLength(1);
    expect(region.getByText(CHECK_COPY.tablePermissions.guidance)).toBeTruthy();
    expect(region.getByRole('heading', { name: 'Questions to consider' })).toBeTruthy();
    for (const question of CHECK_COPY.tablePermissions.questions) {
      expect(region.getByText(question)).toBeTruthy();
    }
    expect(region.getByRole('heading', { name: 'Configuration snapshot' })).toBeTruthy();
    expect(region.getByText('Web roles')).toBeTruthy();
    expect(region.getByText('contact · Global · Read · role staff')).toBeTruthy();
    expect(region.getByText('Outbound')).toBeTruthy();
  });

  it('is a focusable region so its content can be scrolled from the keyboard', async () => {
    await open();
    expect(detail('Table permissions').getAttribute('tabindex')).toBe('0');
  });
});

describe('Mark as reviewed and Undo review (AC-8.5)', () => {
  it('moves the ring, the file summary, the tile and the detail together, and undo reverts them', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(within(tile('Table permissions')).getByText('Reviewed')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 addressed' })).toBeTruthy();
    expect(screen.getByText('2 configured · 1 reviewed · 0 review')).toBeTruthy();
    const first = fileButton(/customer-summary/);
    expect(first.textContent).toContain('Ready · 1 reviewed');
    expect(within(first).getByText('Ready')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Undo review' })).toBeTruthy();
    expect(within(detail('Table permissions')).getByRole('heading', { name: 'Original reasons' })).toBeTruthy();
    expect(
      within(detail('Table permissions')).getByText('Global access to contact (Global) from role staff.'),
    ).toBeTruthy();
    expect(tile('Table permissions').getAttribute('aria-current')).toBe('true');
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Table permissions in customer-summary.');

    await user.click(screen.getByRole('button', { name: 'Undo review' }));
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 of 3 addressed' })).toBeTruthy();
    expect(first.textContent).toContain('2/3 · 1 to review');
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
    expect(reviewUpdates().textContent).toBe('Review undone: Table permissions in customer-summary.');
  });

  it('announces the same check again in a second file, because the text names the file', async () => {
    // Neither file has a web role, so Web role assigned is the first finding to review in both.
    const { user } = await open(
      facts({
        files: [
          file({ id: 'file-1', name: 'customer-summary', roleIds: read([]) }),
          file({ id: 'file-2', name: 'order-sync', roleIds: read([]) }),
        ],
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Web role assigned in customer-summary.');
    await user.click(fileButton(/order-sync/));
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    // Without the file name this string would equal the last one, React would bail out and the region stay silent.
    expect(reviewUpdates().textContent).toBe('Marked as reviewed: Web role assigned in order-sync.');
  });

  it('keeps the selection on the finding that was marked', async () => {
    const { user } = await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', roleIds: read([]) })] }),
    );
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(tile('Table permissions').getAttribute('aria-current')).toBeNull();
  });

  it('marks one file only', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    await user.click(fileButton(/order-sync/));
    expect(within(tile('Web role assigned')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });

  it('offers no button on a Configured finding', async () => {
    const { user } = await open();
    await user.click(tile('Web role assigned'));
    expect(screen.queryByRole('button', { name: /mark as reviewed|undo review/i })).toBeNull();
  });

  it('offers no button when a reason is a read failure', async () => {
    await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', roleIds: { ok: false, reason: 'read-failed' } })] }),
    );
    expect(within(tile('Web role assigned')).getByText('Needs review')).toBeTruthy();
    expect(tile('Web role assigned').getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });

  it('offers no button when the evidence is partly unscanned, even if reasons exist', async () => {
    await open(
      facts({ files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })] }),
    );
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });

  it('shows a Not scanned check grey with its explanation and no button (AC-8.11)', async () => {
    const { user } = await open(
      facts({
        permissions: read([]),
        files: [file({ id: 'file-1', name: 'customer-summary', code: { ok: false, reason: 'not-scanned' } })],
      }),
    );
    const tables = tile('Table permissions');
    expect(within(tables).getByText('Not scanned')).toBeTruthy();
    expect(within(tables).getByText(NOT_SCANNED_TEXT)).toBeTruthy();
    await user.click(tables);
    expect(within(detail('Table permissions')).getAllByText(NOT_SCANNED_TEXT).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /mark as reviewed/i })).toBeNull();
  });
});

describe('review marks are session state (AC-8.9, AC-7.6)', () => {
  it('discards marks and the file selection on Scan again', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    await user.click(screen.getByRole('button', { name: 'Scan again' }));
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    expect(await screen.findByText(NO_FILE_TEXT)).toBeTruthy();
    await user.click(fileButton(/customer-summary/));
    expect(within(tile('Table permissions')).getByText('Needs review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });

  it('keeps marks when only the connection is renamed, and drops them for a different connection', async () => {
    const host = createInspectorHost();
    const { user } = await open(facts(), { host });
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    host.setConnection({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await screen.findByRole('button', { name: 'Undo review' })).toBeTruthy();
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    await screen.findByRole('heading', { name: 'Select a site' });
    expect(screen.queryByRole('button', { name: /undo review|mark as reviewed/i })).toBeNull();
    await user.click(screen.getByRole('combobox', { name: 'Power Pages site' }));
    await user.click(screen.getByRole('option', { name: new RegExp(SITE_ALPHA.name) }));
    await screen.findByRole('heading', { name: 'Review server logic readiness' });
    await user.click(fileButton(/customer-summary/));
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeTruthy();
  });
});
