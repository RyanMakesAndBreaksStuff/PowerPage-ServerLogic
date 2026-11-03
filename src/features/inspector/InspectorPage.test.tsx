// @vitest-environment jsdom
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSPECTOR_DEPS } from '@/app/inspector-site/inspectorDeps';
import type { InspectorDeps } from '@/app/inspector-site/inspectorDeps';
import { renderInspector } from '@/app/inspector-site/inspectorTestHarness';
import type { InspectorHarnessOptions } from '@/app/inspector-site/inspectorTestHarness';
import { SitePill } from '@/app/shell/SitePill';
import { ScanAbandonedError } from '@/features/inspector/scan/scan';
import { deferred } from '@/test/deferred';
import { fixedDeps } from '@/test/fixedDeps';
import {
  CONNECTION,
  createInspectorHost,
  OTHER_CONNECTION,
  SITE_ALPHA,
  SITE_BETA,
} from '@/test/inspectorWorld';
import type { ScanProgress, SiteFacts } from '@/types/inspector';
import { file, read, role, settings, siteFacts, value } from './model/fixtures';
import { TENANT_POLICY_NOTE } from './model/copy';
import {
  CONNECTION_CHANGED_TITLE,
  connectionChangedText,
  DISCONNECTED_TEXT,
  EXPORT_NO_FILES_REASON,
  EXPORT_NO_SITES_REASON,
  EXPORT_NOTHING_READ_REASON,
  NO_FILES_TEXT,
  NO_SITES_TEXT,
  NON_DEV_WARNING,
  NOTHING_READ_TEXT,
  REFRESH_FAILED_TEXT,
} from './pageCopy';
import { InspectorPage } from './InspectorPage';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function mount(options: InspectorHarnessOptions = {}) {
  return renderInspector(
    <>
      <SitePill />
      <InspectorPage />
    </>,
    options,
  );
}

type Mounted = ReturnType<typeof mount>;
const picker = () => screen.getByRole('combobox', { name: 'Power Pages site' });
const heading = (name: string | RegExp) => screen.findByRole('heading', { name });
const componentReads = (host: Mounted['host']) =>
  host.callsOf('queryAll').filter((call) => call.query.entitySet === 'powerpagecomponents');

async function pick({ user }: Pick<Mounted, 'user'>, name: RegExp) {
  await user.click(picker());
  await user.click(screen.getByRole('option', { name }));
}

const exportReport = () => screen.getByRole('button', { name: 'Export report' });
const connectionEvent = (host: Mounted['host']) =>
  act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
    await Promise.resolve();
  });

/** The AC-7.4 and AC-7.8 control: present, `aria-disabled`, explains itself and ignores clicks (D-09, D-17). */
async function expectDisabledExport(user: Mounted['user'], reason: string) {
  const button = exportReport();
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(button.hasAttribute('disabled')).toBe(false);
  await user.hover(button);
  expect(screen.getByText(reason)).toBeTruthy();
  await user.click(button);
  expect(button.getAttribute('aria-disabled')).toBe('true');
}

/** Two files: one fully configured, one inactive with no web role (Needs review). */
function graded(patch: Partial<SiteFacts> = {}): SiteFacts {
  return siteFacts({
    roles: read([role('staff')]),
    files: [
      file({ id: 'file-1', name: 'customer-summary' }),
      file({ id: 'file-2', name: 'order-sync', active: false, roleIds: read([]) }),
    ],
    ...patch,
  });
}

describe('InspectorPage: connection and site list states', () => {
  it('asks for a connection when none is active, and shows no findings (AC-7.1)', async () => {
    mount({ host: createInspectorHost(undefined, null) });
    expect(await heading('No active connection')).toBeTruthy();
    expect(screen.getByText(DISCONNECTED_TEXT)).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().getAttribute('aria-disabled')).toBe('true');
  });

  it('tells "checking" from "unreadable" and recovers on focus (WR-005)', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    mount({ host });
    expect(await heading('Checking the active connection')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    host.rejectConnectionRead(0);
    expect(await heading("Couldn't read the active connection")).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'No active connection' })).toBeNull();
    host.setConnectionRead('ok');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(await heading('Select a site')).toBeTruthy();
  });

  it('offers Retry once a read rejected, hides it while the retry runs, and recovers (D-05)', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    const { user } = mount({ host });
    await heading('Checking the active connection');
    host.rejectConnectionRead(0);
    await heading("Couldn't read the active connection");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(host.parkedConnectionReads).toBe(2);
    host.rejectConnectionRead(1);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Couldn't read the active connection" })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    host.settleConnectionRead(2, CONNECTION);
    expect(await heading('Select a site')).toBeTruthy();
    expect(host.listenerCount()).toBe(1);
  });

  it('shows loading while the sites are read', async () => {
    const host = createInspectorHost();
    host.holdDataReads(true);
    mount({ host });
    expect(await heading('Loading sites')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Select a site')).toBeTruthy();
  });

  it('says there are no enhanced data model sites, scans nothing, and shows Export report disabled (AC-7.8)', async () => {
    const { host, user } = mount({ host: createInspectorHost({ sites: [] }) });
    expect(await heading('No sites found')).toBeTruthy();
    expect(screen.getByText(NO_SITES_TEXT)).toBeTruthy();
    expect(componentReads(host)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /retry|scan again/i })).toBeNull();
    await expectDisabledExport(user, EXPORT_NO_SITES_REASON);
  });

  it('shows the reason and a Retry that reloads the list when the site list fails', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [] }],
      failures: [{ operation: 'query', entitySet: 'powerpagesites', status: 503, times: 1 }],
    });
    const { user } = mount({ host });
    expect(await heading("Couldn't load sites")).toBeTruthy();
    expect(screen.getByText('The server had a problem. Please try again later.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('never selects a site on its own, not even when there is only one', async () => {
    const host = createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] });
    mount({ host });
    expect(await heading('Select a site')).toBeTruthy();
    expect(picker().textContent).toBe('No site selected');
    expect(componentReads(host)).toHaveLength(0);
  });
});

describe('InspectorPage: scanning', () => {
  function controlled() {
    const finish = deferred<SiteFacts>();
    const holder: { report: (progress: ScanProgress) => void } = { report: () => undefined };
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => Promise.resolve([SITE_ALPHA]),
      runScan: (_host, _connection, _site, _scanId, onProgress) => {
        holder.report = onProgress;
        return finish.promise;
      },
    };
    return { deps, finish, report: (progress: ScanProgress) => { act(() => { holder.report(progress); }); } };
  }

  it('shows "Scanned X of N", says when the list is incomplete, and announces only start and end', async () => {
    const run = controlled();
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    expect(await heading('Scanning Alpha portal')).toBeTruthy();
    expect(screen.getByText('Reading server logic records…')).toBeTruthy();
    const status = screen.getByRole('status', { name: 'Inspector status' });
    expect(status.textContent).toBe('Scanning Alpha portal.');
    run.report({ scanned: 3, total: 12, inventoryComplete: true });
    expect(screen.getByText('Scanned 3 of 12')).toBeTruthy();
    run.report({ scanned: 4, total: 12, inventoryComplete: false });
    expect(
      screen.getByText('Scanned 4 of 12 found so far. The record list is incomplete.'),
    ).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scanning Alpha portal.');
    await act(async () => {
      run.finish.resolve(graded());
      await Promise.resolve();
    });
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scan finished. 2 server logic files.');
  });

  it('shows a failed scan with a Scan again that can complete (D-02)', async () => {
    let fail = true;
    const view = mount({
      deps: {
        ...INSPECTOR_DEPS,
        listSites: () => Promise.resolve([SITE_ALPHA]),
        runScan: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(graded())),
      },
    });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    expect(await heading("Couldn't scan Alpha portal")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export report' })).toBeNull();
    fail = false;
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(await heading('Review server logic readiness')).toBeTruthy();
  });

  it('says the connection changed while scanning, offers no Scan again, and clears for the new identity (D-14, S-08)', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    // The host switches connection; the event that would tell the provider has not arrived yet.
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    expect(await heading(CONNECTION_CHANGED_TITLE)).toBeTruthy();
    expect(screen.getByText(connectionChangedText(SITE_ALPHA))).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(`${CONNECTION_CHANGED_TITLE}.`);
    expect(screen.queryByRole('button', { name: /scan again|export report/i })).toBeNull();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().textContent).toBe('No site selected');
    expect(picker().getAttribute('aria-disabled')).toBeNull();
    await connectionEvent(host);
    expect(await heading('Select a site')).toBeTruthy();
    expect(host.dataReads.peak).toBe(4);
  });

  it('leaves "the connection changed" by choosing a site', async () => {
    const view = mount({
      deps: {
        ...INSPECTOR_DEPS,
        listSites: () => Promise.resolve([SITE_ALPHA, SITE_BETA]),
        runScan: (_host, _connection, site) =>
          site.id === SITE_ALPHA.id
            ? Promise.reject(new ScanAbandonedError())
            : Promise.resolve(graded({ site })),
      },
    });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading(CONNECTION_CHANGED_TITLE);
    await pick(view, /Beta portal/);
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(picker().textContent).toBe('Beta portal');
  });

  it('discards a delayed scan when the user selects another site', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    expect(await heading('Scanning Alpha portal')).toBeTruthy();
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    await pick(view, /Beta portal/);
    expect(await heading('Scanning Beta portal')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Review server logic readiness')).toBeTruthy();
    expect(screen.getByText('Server logic (1)')).toBeTruthy();
    expect(screen.getByRole('button', { name: /handler-11/ })).toBeTruthy();
    expect(screen.queryByText(/handler-01/)).toBeNull();
    expect(host.dataReads.peak).toBe(4);
  });

  it('discards a delayed scan when the connection changes under it, and reloads the site list', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.holdDataReads(true);
    await pick(view, /Alpha portal/);
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await heading('Loading sites')).toBeTruthy();
    host.holdDataReads(false);
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
    expect(picker().textContent).toBe('No site selected');
    expect(host.dataReads.peak).toBe(4);
  });
});

describe('InspectorPage: results', () => {
  async function finished(facts: SiteFacts = graded(), options: InspectorHarnessOptions = {}) {
    const view = mount({ deps: fixedDeps(facts), ...options });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    return view;
  }

  it('lists every file with its status, selects none until the user does, and shows the tenant-policy note (AC-7.3, AC-8.6, AC-8.7, D-03)', async () => {
    const { user } = await finished();
    const rail = screen.getByRole('region', { name: 'Server logic (2)' });
    const first = within(rail).getByRole('button', { name: /customer-summary/ });
    const second = within(rail).getByRole('button', { name: /order-sync/ });
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(first.tabIndex).toBe(0);
    expect(first.textContent).toContain('Active · All configured');
    expect(second.textContent).toContain('Inactive · 2/3 · 1 to review');
    expect(within(first).getByText('Ready')).toBeTruthy();
    expect(within(second).getByText('Needs review')).toBeTruthy();
    expect(within(rail).getByText(TENANT_POLICY_NOTE)).toBeTruthy();
    // D-18: the site name stands where "<file> · <status>" will go.
    const siteLine = screen.getByText('Alpha portal', { selector: '.inspector-title__file' });
    expect(siteLine.getAttribute('title')).toBe('Alpha portal'); // the line ellipsizes, so the full text is on hover
    expect(screen.queryByText(/customer-summary · Active/)).toBeNull();
    await user.click(second);
    expect(second.getAttribute('aria-current')).toBe('true');
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('order-sync · Inactive').getAttribute('title')).toBe('order-sync · Inactive');
    await user.click(first);
    expect(first.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('customer-summary · Active')).toBeTruthy();
  });

  it('shows the title, the sub-line and a Scan again that replaces the results (AC-8.1, D-02)', async () => {
    const host = createInspectorHost();
    const { user } = mount({ host });
    await heading('Select a site');
    await pick({ user }, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(
      screen.getByText('Inspect access, permissions and outbound networking before release.'),
    ).toBeTruthy();
    const reads = componentReads(host).length;
    expect(screen.queryByRole('button', { name: 'Rescan' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Scan again' }));
    await waitFor(() => {
      expect(componentReads(host).length).toBeGreaterThan(reads);
    });
    expect(await heading('Review server logic readiness')).toBeTruthy();
  });

  it('says there is no server logic only when the list was read completely, with Export report disabled (AC-7.4)', async () => {
    const view = mount({ host: createInspectorHost({ sites: [{ ref: SITE_ALPHA, files: [] }] }) });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(screen.getByText('Server logic (0)')).toBeTruthy();
    expect(screen.getByText(NO_FILES_TEXT)).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(`${NO_FILES_TEXT}.`);
    await expectDisabledExport(view.user, EXPORT_NO_FILES_REASON);
  });

  it('does not claim "no server logic" when nothing was read before the scan stopped', async () => {
    const { user } = await finished(
      graded({ files: [], inventoryComplete: false, stopped: 'connection-lost' }),
    );
    expect(screen.getByText(NOTHING_READ_TEXT)).toBeTruthy();
    expect(screen.queryByText(NO_FILES_TEXT)).toBeNull();
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByText('Inventory incomplete. Reconnect and rescan.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy();
    await expectDisabledExport(user, EXPORT_NOTHING_READ_REASON);
  });

  it('announces "nothing was read", never "no server logic", when an incomplete list is empty and no stop was recorded', async () => {
    await finished(graded({ files: [], inventoryComplete: false, stopped: null }));
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe(NOTHING_READ_TEXT);
    expect(screen.getByText(NOTHING_READ_TEXT, { selector: '.inspector-rail__empty' })).toBeTruthy();
    expect(screen.queryByText(NO_FILES_TEXT)).toBeNull();
  });

  it('keeps the partial results of a scan that stopped on connection loss (AC-7.10)', async () => {
    const host = createInspectorHost({
      sites: [{ ref: SITE_ALPHA, files: [{ n: 1 }, { n: 2 }] }],
      failures: [{ operation: 'file', entitySet: 'powerpagecomponent', status: 401 }],
    });
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    expect(screen.getByText('Connection lost. Reconnect and rescan.')).toBeTruthy();
    const rail = screen.getByRole('region', { name: 'Server logic (2)' });
    expect(within(rail).getAllByText('Incomplete')).toHaveLength(2);
    expect(screen.getByRole('status', { name: 'Inspector status' }).textContent).toBe('Scan stopped. The connection was lost.');
  });

  it('shows every site banner above the files (AC-7.9, AC-7.12, FR-7)', async () => {
    await finished(
      graded({
        settings: read(
          settings({
            'ServerLogic/Enabled': value('false'),
            'ServerLogic/TimeoutInSeconds': value('0'),
          }),
        ),
        roles: read([
          role('a', { name: 'a', anonymous: true }),
          role('b', { name: 'b', anonymous: true }),
        ]),
        unreadableRows: [{ type: 11, id: 'row-1', name: 'broken-role' }],
        inventoryComplete: false,
      }),
    );
    const notices = within(screen.getByRole('list', { name: 'Site notices' }));
    expect(notices.getByText('Server logic is disabled on this site (ServerLogic/Enabled = false)')).toBeTruthy();
    expect(notices.getByText("ServerLogic/TimeoutInSeconds isn't a positive integer up to 240")).toBeTruthy();
    expect(notices.getByText(/More than one web role is marked as the Anonymous Users Role/)).toBeTruthy();
    expect(notices.getByText(/couldn't be read and was skipped: broken-role/)).toBeTruthy();
    expect(notices.getByText('Inventory incomplete. Reconnect and rescan.')).toBeTruthy();
  });

  describe('Export report (P5.7)', () => {
    const dialog = () => screen.getByRole('dialog', { name: 'Export report' });
    const notices = (host: Mounted['host']) => host.callsOf('notify').map((call) => call.notice);
    const selectFile = (user: Mounted['user'], name: RegExp) =>
      user.click(
        within(screen.getByRole('region', { name: /^Server logic \(/ })).getByRole('button', { name }),
      );
    const gone = () =>
      waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    const exportMarkdown = (user: Mounted['user']) =>
      user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    const CHECK_TITLE = /^(Web role assigned|Table permissions|Outbound networking)/;
    const STATUS_WORD = /^(Configured|Reviewed|Needs review|Not scanned)$/;

    it('opens the export dialog from a finished scan, saves This file as Markdown and toasts the filename (AC-9.8)', async () => {
      const { host, user } = await finished();
      await selectFile(user, /customer-summary/);
      await user.click(exportReport());
      await exportMarkdown(user);
      await gone();
      const [savedFile] = host.savedFiles;
      expect(host.savedFiles).toHaveLength(1);
      expect(savedFile?.defaultName).toBe('customer-summary-readiness.md');
      const content = savedFile?.content;
      expect(typeof content).toBe('string');
      expect(content).toContain('## Server logic readiness: customer-summary');
      // The report carries the statuses the finding tiles show on screen, in the same order.
      const shown = screen
        .getAllByRole('button', { name: CHECK_TITLE })
        .map((tile) => within(tile).getByText(STATUS_WORD).textContent);
      const reported = String(content)
        .split('\n')
        .map((line) => /^\| (?:Web role|Table permissions|Outbound networking) \| ([^|]+) \|/.exec(line)?.[1])
        .filter((status) => status !== undefined);
      expect(shown).toHaveLength(3);
      expect(reported).toEqual(shown);
      expect(notices(host)).toEqual([
        { title: 'customer-summary-readiness.md exported', body: '', type: 'success' },
      ]);
      expect(document.activeElement).toBe(exportReport());
    });

    it('exports Site summary as PDF with no file selected', async () => {
      const { host, user } = await finished();
      await user.click(exportReport());
      expect(
        within(dialog()).getByRole('radio', { name: 'Site summary' }).getAttribute('aria-checked'),
      ).toBe('true');
      await user.click(within(dialog()).getByRole('radio', { name: 'PDF' }));
      await user.click(within(dialog()).getByRole('button', { name: 'Export PDF' }));
      await gone();
      const [savedFile] = host.savedFiles;
      expect(savedFile?.defaultName).toBe('Alpha-portal-site-readiness.pdf');
      expect(savedFile?.content).toBeInstanceOf(Uint8Array);
      const bytes = savedFile?.content instanceof Uint8Array ? savedFile.content : new Uint8Array();
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
      expect(notices(host)).toEqual([
        { title: 'Alpha-portal-site-readiness.pdf exported', body: '', type: 'success' },
      ]);
    });

    it("a stopped scan's report carries the connection-lost notice (AC-7.10)", async () => {
      const { host, user } = await finished(
        graded({ stopped: 'connection-lost', inventoryComplete: false }),
      );
      await user.click(exportReport());
      await exportMarkdown(user);
      await gone();
      const content = host.savedFiles[0]?.content;
      expect(content).toContain('Connection lost. Reconnect and rescan.');
      expect(content).toContain('Inventory incomplete. Reconnect and rescan.');
    });

    it.each([
      ['an empty complete site', graded({ files: [] }), EXPORT_NO_FILES_REASON],
      [
        'an empty stopped scan',
        graded({ files: [], inventoryComplete: false, stopped: 'connection-lost' }),
        EXPORT_NOTHING_READ_REASON,
      ],
    ] as const)(
      'shows Export report disabled with the right reason for %s (AC-7.4, AC-7.8)',
      async (_label, facts, reason) => {
        const { user } = await finished(facts);
        await expectDisabledExport(user, reason);
        expect(screen.queryByRole('dialog')).toBeNull();
      },
    );

    it('closes the dialog with the Results changed toast and saves nothing when the connection changes while it is open; focus lands on the new panel heading', async () => {
      const { host, user } = await finished();
      await user.click(exportReport());
      expect(dialog()).toBeTruthy();
      host.setConnection(OTHER_CONNECTION);
      await connectionEvent(host);
      await gone();
      expect(host.callsOf('saveFile')).toEqual([]);
      expect(notices(host)).toEqual([
        { title: 'Results changed, so the export was cancelled.', body: '', type: 'info' },
      ]);
      const next = await heading('Select a site');
      await waitFor(() => {
        expect(document.activeElement).toBe(next);
      });
    });

    it('moves focus to the heading only for a close, not for a later connection change with no dialog open (E-10)', async () => {
      const { host, user } = await finished();
      await user.click(exportReport());
      host.setConnection(OTHER_CONNECTION);
      await connectionEvent(host);
      await gone();
      const next = await heading('Select a site');
      await waitFor(() => {
        expect(document.activeElement).toBe(next);
      });
      act(() => {
        picker().focus();
      });
      expect(document.activeElement).toBe(picker());
      const toasts = notices(host).length;
      host.setConnection(CONNECTION);
      await connectionEvent(host);
      await act(async () => {
        await Promise.resolve();
      });
      expect(document.activeElement).toBe(picker());
      expect(notices(host)).toHaveLength(toasts);
    });

    it('keeps the dialog and the export when the connection is renamed while it is open (AC-7.6)', async () => {
      const { host, user } = await finished();
      await user.click(exportReport());
      host.setConnection({ ...CONNECTION, name: 'Renamed' });
      await connectionEvent(host);
      expect(dialog()).toBeTruthy();
      await exportMarkdown(user);
      await gone();
      expect(host.savedFiles).toHaveLength(1);
      expect(notices(host).map((notice) => notice.type)).toEqual(['success']);
    });

    it('closes the dialog when the connection changes during a pending save, finishes the save, and moves focus to the heading', async () => {
      const { host, user } = await finished();
      await user.click(exportReport());
      host.holdSaves(true);
      await exportMarkdown(user);
      await waitFor(() => {
        expect(host.pendingSaves).toBe(1);
      });
      host.setConnection(OTHER_CONNECTION);
      await connectionEvent(host);
      await gone();
      expect(notices(host)).toEqual([
        { title: 'Results changed, so the export was cancelled.', body: '', type: 'info' },
      ]);
      host.releaseHeldSaves(1);
      await waitFor(() => {
        expect(notices(host).map((notice) => notice.type)).toEqual(['info', 'success']);
      });
      expect(host.savedFiles).toHaveLength(1);
      const next = await heading('Select a site');
      expect(document.activeElement).toBe(next);
    });

    it('exports under StrictMode', async () => {
      const { host, user } = await finished(graded(), { strict: true });
      await user.click(exportReport());
      await exportMarkdown(user);
      await gone();
      expect(host.savedFiles).toHaveLength(1);
      expect(notices(host).map((notice) => notice.type)).toEqual(['success']);
      expect(exportReport().getAttribute('aria-disabled')).toBeNull();
    });
  });
});

describe('InspectorPage: connection notices (AC-7.5, AC-7.11, WR-005)', () => {
  it('shows no warning for a Dev connection', async () => {
    mount();
    await heading('Select a site');
    expect(screen.queryByText(NON_DEV_WARNING)).toBeNull();
  });

  it.each(['Test', 'UAT', 'Production', 'Unknown'] as const)(
    'warns for a %s connection without blocking the scan',
    async (environment) => {
      const host = createInspectorHost(undefined, { ...CONNECTION, environment });
      const view = mount({ host });
      await heading('Select a site');
      expect(screen.getByText(NON_DEV_WARNING)).toBeTruthy();
      await pick(view, /Alpha portal/);
      expect(await heading('Review server logic readiness')).toBeTruthy();
      expect(screen.getByText(NON_DEV_WARNING)).toBeTruthy();
    },
  );

  it('updates the warning for a relabel of the same connection without clearing the results', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnection({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await screen.findByText(NON_DEV_WARNING)).toBeTruthy();
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    expect(picker().textContent).toBe(SITE_ALPHA.name);
  });

  it('keeps the results and says so when a refresh fails, then clears them for a different connection', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    expect(await screen.findByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    const notices = within(screen.getByRole('list', { name: 'Page notices' }));
    expect(notices.getByRole('button', { name: 'Retry' })).toBeTruthy();
    host.setConnectionRead('ok');
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(await heading('Select a site')).toBeTruthy();
    expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
  });

  it('clears the results when the connection becomes a successful null', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnection(null);
    await act(async () => {
      host.emit({ kind: 'connection-changed' });
      await Promise.resolve();
    });
    expect(await heading('No active connection')).toBeTruthy();
    expect(screen.queryByText(/Server logic \(/)).toBeNull();
  });
});

describe('InspectorPage: Retry in the refresh-failed notice (D-05)', () => {
  it('re-reads the connection, keeps the results, and clears the notice when the read succeeds', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    const reads = host.callsOf('getActiveConnection').length;
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    expect(host.callsOf('getActiveConnection')).toHaveLength(reads + 1);
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    host.setConnectionRead('ok');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
    expect(screen.getByText('Server logic (2)')).toBeTruthy();
    expect(picker().textContent).toBe(SITE_ALPHA.name);
  });

  it('hides Retry while the read it started is in flight', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    host.setConnectionRead('hold');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByText(REFRESH_FAILED_TEXT)).toBeTruthy();
    host.settleConnectionRead(0, CONNECTION);
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
  });
});

describe('InspectorPage: focus after Retry and Scan again', () => {
  /** The first scan runs `first`; every later scan stays pending until `second` is resolved. */
  function scansThen(first: () => Promise<SiteFacts>) {
    const second = deferred<SiteFacts>();
    let scans = 0;
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      listSites: () => Promise.resolve([SITE_ALPHA]),
      runScan: () => {
        scans += 1;
        return scans === 1 ? first() : second.promise;
      },
    };
    return { deps, second };
  }
  const finishSecond = (second: ReturnType<typeof scansThen>['second']) =>
    act(async () => {
      second.resolve(graded());
      await Promise.resolve();
    });

  it('moves focus to the panel heading when Retry hides itself on the unreadable-connection panel', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    const { user } = mount({ host });
    await heading('Checking the active connection');
    host.rejectConnectionRead(0);
    await heading("Couldn't read the active connection");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: "Couldn't read the active connection" }),
    );
  });

  it('moves focus to the results heading when Retry hides itself in the refresh-failed notice', async () => {
    const host = createInspectorHost();
    const view = mount({ host });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    host.setConnectionRead('reject');
    await connectionEvent(host);
    await screen.findByText(REFRESH_FAILED_TEXT);
    host.setConnectionRead('hold');
    await view.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Review server logic readiness' }),
    );
    host.settleConnectionRead(0, CONNECTION);
    await waitFor(() => {
      expect(screen.queryByText(REFRESH_FAILED_TEXT)).toBeNull();
    });
  });

  it('moves focus to the scanning heading when Scan again leaves the results', async () => {
    const run = scansThen(() => Promise.resolve(graded()));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await finishSecond(run.second);
  });

  it('moves focus to the scanning heading when Scan again leaves a failed scan', async () => {
    const run = scansThen(() => Promise.reject(new Error('boom')));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading("Couldn't scan Alpha portal");
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await finishSecond(run.second);
  });

  it('keeps focus on the results heading when the scan Scan again started finishes', async () => {
    const run = scansThen(() => Promise.resolve(graded()));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await finishSecond(run.second);
    expect(document.activeElement).toBe(await heading('Review server logic readiness'));
  });

  it('leaves focus alone when the user moved it away during the scan', async () => {
    const run = scansThen(() => Promise.resolve(graded()));
    const view = mount({ deps: run.deps });
    await heading('Select a site');
    await pick(view, /Alpha portal/);
    await heading('Review server logic readiness');
    await view.user.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(document.activeElement).toBe(await heading('Scanning Alpha portal'));
    await view.user.tab({ shift: true });
    expect(document.activeElement).toBe(picker());
    await finishSecond(run.second);
    await heading('Review server logic readiness');
    expect(document.activeElement).toBe(picker());
  });
});
