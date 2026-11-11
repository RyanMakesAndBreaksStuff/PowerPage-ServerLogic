// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSPECTOR_DEPS } from '@/features/inspector/inspectorDeps';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import { renderScannedInspector } from '@/test/inspectorTestHarness';
import { deferred } from '@/test/deferred';
import type { GatedHost } from '@/test/gatedHost';
import { SITE_ALPHA } from '@/test/inspectorWorld';
import type { SiteFacts } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';
import { file, graded } from '../model/fixtures';
import { EXPORT_IN_PROGRESS_REASON } from '../pageCopy';
import { EXPORT_BUSY_REASON, SAVE_FAILED_BODY } from './exportCopy';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const DEFAULTS: ReportOptions = {
  scope: 'file',
  format: 'markdown',
  fileId: 'file-1',
  questions: true,
  snapshot: true,
  redact: false,
};

type Scan = {
  facts?: SiteFacts;
  deps?: Partial<InspectorDeps>;
  siteName?: string;
};

/** Scans Alpha portal and stops on the finished page with no file selected. */
const scanned = ({ facts = graded(), deps = {}, siteName }: Scan = {}) =>
  renderScannedInspector(facts, {
    sites: [siteName === undefined ? SITE_ALPHA : { ...SITE_ALPHA, name: siteName }],
    deps,
    site: /portal/,
  });

type View = Awaited<ReturnType<typeof scanned>>;

const selectFile = (view: View, name: RegExp) =>
  view.user.click(
    within(screen.getByRole('region', { name: /^Server logic \(/ })).getByRole('button', { name }),
  );
const exportButton = () => screen.getByRole('button', { name: 'Export report' });
const dialog = () => screen.getByRole('dialog', { name: 'Export report' });
const radio = (name: string) => within(dialog()).getByRole('radio', { name });
const checkbox = (name: string) => within(dialog()).getByRole('checkbox', { name });

async function openDialog(view: View) {
  await view.user.click(exportButton());
  return dialog();
}

/** Scans, chooses customer-summary and opens the dialog. */
async function openForFile(scan: Scan = {}) {
  const view = await scanned(scan);
  await selectFile(view, /customer-summary/);
  await openDialog(view);
  return view;
}

const notices = (host: GatedHost) => host.callsOf('notify').map((call) => call.notice);
const saved = async (host: GatedHost, count = 1) => {
  await waitFor(() => {
    expect(host.callsOf('saveFile')).toHaveLength(count);
  });
};
const closed = async () => {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).toBeNull();
  });
};

describe('Export dialog: open', () => {
  it('opens as a 520 px modal with the AC-9.1 controls, defaults and the primary label', async () => {
    await openForFile();
    const modal = dialog();
    expect(modal.style.width).toBe('520px');
    expect(within(modal).getByRole('heading', { name: 'Export report' })).toBeTruthy();
    expect(radio('This file').getAttribute('aria-checked')).toBe('true');
    expect(radio('Site summary').getAttribute('aria-checked')).toBe('false');
    expect(radio('Markdown').getAttribute('aria-checked')).toBe('true');
    expect(radio('PDF').getAttribute('aria-checked')).toBe('false');
    expect(checkbox('Questions to consider')).toBeChecked();
    expect(checkbox('Configuration snapshot')).toBeChecked();
    expect(checkbox('Redact environment and site names')).not.toBeChecked();
    expect(within(modal).getByRole('button', { name: 'Export Markdown' })).toBeTruthy();
    expect(within(modal).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(within(modal).getByRole('status').textContent).toBe('');
    expect(within(modal).getByText('Alpha portal · customer-summary')).toBeTruthy();
  });

  it('opens with focus on the checked Report radio, with and without a selected file', async () => {
    const withFile = await openForFile();
    expect(document.activeElement).toBe(radio('This file'));
    withFile.unmount();
    cleanup();

    const view = await scanned();
    await openDialog(view);
    expect(document.activeElement).toBe(radio('Site summary'));
    expect(within(dialog()).getByText('Alpha portal')).toBeTruthy();
  });

  it('disables This file with "Select a file first" and selects Site summary when no file is selected', async () => {
    const view = await scanned();
    await openDialog(view);
    const thisFile = radio('This file');
    expect(thisFile.getAttribute('aria-disabled')).toBe('true');
    expect(radio('Site summary').getAttribute('aria-checked')).toBe('true');
    await view.user.hover(thisFile);
    expect(screen.getByText('Select a file first')).toBeTruthy();
    await view.user.click(thisFile);
    expect(radio('Site summary').getAttribute('aria-checked')).toBe('true');
    expect(thisFile.getAttribute('aria-checked')).toBe('false');
  });
});

describe('Export dialog: controls', () => {
  type Case = {
    label: string;
    act: (user: UserEvent) => Promise<void>;
    expected: Partial<ReportOptions>;
    button: string;
    name: string;
    filter: { name: string; extensions: string[] };
  };
  const MARKDOWN = { name: 'Markdown', extensions: ['md'] };
  const PDF = { name: 'PDF', extensions: ['pdf'] };
  const cases: readonly Case[] = [
    {
      label: 'Site summary sets the site scope',
      act: (user) => user.click(radio('Site summary')),
      expected: { scope: 'site' },
      button: 'Export Markdown',
      name: 'Alpha-portal-site-readiness.md',
      filter: MARKDOWN,
    },
    {
      label: 'PDF sets the pdf format, filter and label',
      act: (user) => user.click(radio('PDF')),
      expected: { format: 'pdf' },
      button: 'Export PDF',
      name: 'customer-summary-readiness.pdf',
      filter: PDF,
    },
    {
      label: 'unticking Questions turns questions off',
      act: (user) => user.click(checkbox('Questions to consider')),
      expected: { questions: false },
      button: 'Export Markdown',
      name: 'customer-summary-readiness.md',
      filter: MARKDOWN,
    },
    {
      label: 'unticking Snapshot turns snapshot off',
      act: (user) => user.click(checkbox('Configuration snapshot')),
      expected: { snapshot: false },
      button: 'Export Markdown',
      name: 'customer-summary-readiness.md',
      filter: MARKDOWN,
    },
    {
      label: 'ticking Redact turns redaction on and names the site summary "site"',
      act: async (user) => {
        await user.click(radio('Site summary'));
        await user.click(checkbox('Redact environment and site names'));
      },
      expected: { scope: 'site', redact: true },
      button: 'Export Markdown',
      name: 'site-site-readiness.md',
      filter: MARKDOWN,
    },
  ];

  it.each(cases)('maps every control to its option: $label', async (item) => {
    const build = vi.fn(INSPECTOR_DEPS.buildReportModel);
    const view = await openForFile({ deps: { buildReportModel: build } });
    await item.act(view.user);
    await view.user.click(within(dialog()).getByRole('button', { name: item.button }));
    await saved(view.host);
    expect(build).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledWith(
      expect.anything(),
      { ...DEFAULTS, ...item.expected },
      expect.any(Date),
    );
    const [call] = view.host.callsOf('saveFile');
    expect(call?.defaultName).toBe(item.name);
    expect(call?.filters).toEqual([item.filter]);
    await closed();
  });
});

describe('Export dialog: closing', () => {
  const closers = [
    ['Cancel', (user: UserEvent) => user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))],
    ['Esc', (user: UserEvent) => user.keyboard('{Escape}')],
    ['the close button', (user: UserEvent) => user.click(within(dialog()).getByRole('button', { name: 'Close' }))],
  ] as const;

  it.each(closers)('%s closes while idle, returns focus to Export report and writes nothing', async (_label, close) => {
    const view = await scanned();
    await openDialog(view);
    await close(view.user);
    await closed();
    expect(document.activeElement).toBe(exportButton());
    expect(view.host.callsOf('saveFile')).toEqual([]);
    expect(notices(view.host)).toEqual([]);
  });
});

describe('Export dialog: busy phases', () => {
  it('shows Building report… and a busy primary before the build runs; every pill and checkbox explains itself', async () => {
    const gate = deferred<undefined>();
    const view = await openForFile({ deps: { yieldToHost: () => gate.promise } });
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    expect(await within(dialog()).findByText('Building report…')).toBeTruthy();
    const primary = within(dialog()).getByRole('button', { name: 'Export Markdown' });
    expect(primary.hasAttribute('disabled')).toBe(true);
    expect(primary.getAttribute('aria-busy')).toBe('true');
    expect(view.host.callsOf('saveFile')).toEqual([]);

    const controls = [
      radio('This file'),
      radio('Site summary'),
      radio('Markdown'),
      radio('PDF'),
      checkbox('Questions to consider'),
      checkbox('Configuration snapshot'),
      checkbox('Redact environment and site names'),
    ];
    for (const control of controls) {
      expect(control.getAttribute('aria-disabled')).toBe('true');
      const describedBy = control.getAttribute('aria-describedby');
      const reason = describedBy === null ? null : document.getElementById(describedBy);
      expect(reason?.textContent).toBe(EXPORT_BUSY_REASON);
      await view.user.hover(control);
      expect(reason?.getAttribute('data-visible')).toBe('true');
      await view.user.unhover(control);
    }
    await view.user.click(radio('Site summary'));
    await view.user.click(checkbox('Redact environment and site names'));
    expect(radio('This file').getAttribute('aria-checked')).toBe('true');
    expect(checkbox('Redact environment and site names')).not.toBeChecked();

    gate.resolve(undefined);
    await saved(view.host);
    await closed();
  });

  it('while saving, the dialog can still be closed; the job finishes and toasts; Export report says an export is in progress meanwhile', async () => {
    const view = await openForFile();
    view.host.holdSaves(true);
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(view.host.pendingSaves).toBe(1);
    });
    expect(await within(dialog()).findByText('Saving report…')).toBeTruthy();
    await view.user.keyboard('{Escape}');
    await closed();
    const button = exportButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await view.user.hover(button);
    expect(screen.getByText(EXPORT_IN_PROGRESS_REASON)).toBeTruthy();
    expect(notices(view.host)).toEqual([]);

    view.host.releaseHeldSaves(1);
    await waitFor(() => {
      expect(notices(view.host)).toEqual([
        { title: 'customer-summary-readiness.md exported', body: '', type: 'success' },
      ]);
    });
    await waitFor(() => {
      expect(exportButton().getAttribute('aria-disabled')).toBeNull();
    });
  });
});

describe('Export dialog: outcomes', () => {
  it('a saved result closes the dialog and toasts the filename', async () => {
    const view = await openForFile();
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    await closed();
    expect(view.host.savedFiles.map((item) => item.defaultName)).toEqual(['customer-summary-readiness.md']);
    expect(notices(view.host)).toEqual([
      { title: 'customer-summary-readiness.md exported', body: '', type: 'success' },
    ]);
    expect(document.activeElement).toBe(exportButton());
  });

  it('a native cancel closes the dialog silently', async () => {
    const view = await openForFile();
    view.host.setSave('cancel');
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    await saved(view.host);
    await closed();
    expect(view.host.savedFiles).toEqual([]);
    expect(notices(view.host)).toEqual([]);
  });

  it("a failed save closes the dialog with Couldn't save <filename>; re-opening offers Markdown and it saves", async () => {
    const view = await openForFile();
    view.host.setSave('reject');
    await view.user.click(radio('PDF'));
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export PDF' }));
    await closed();
    expect(notices(view.host)).toEqual([
      {
        title: "Couldn't save customer-summary-readiness.pdf",
        body: SAVE_FAILED_BODY,
        type: 'error',
      },
    ]);
    expect(view.host.savedFiles).toEqual([]);

    view.host.setSave('save');
    await openDialog(view);
    expect(radio('Markdown').getAttribute('aria-checked')).toBe('true');
    await view.user.click(within(dialog()).getByRole('button', { name: 'Export Markdown' }));
    await closed();
    expect(view.host.savedFiles.map((item) => item.defaultName)).toEqual(['customer-summary-readiness.md']);
    expect(notices(view.host).at(-1)?.type).toBe('success');
  });
});

describe('Export dialog: hostile names', () => {
  it('render as text', async () => {
    const fileName = 'customer <b>bold</b> & <img src=x onerror=alert(1)>';
    const siteName = 'Alpha <i>portal</i> <script>alert(1)</script>';
    const view = await scanned({
      siteName,
      facts: graded({
        files: [file({ id: 'file-1', name: fileName }), file({ id: 'file-2', name: 'order-sync' })],
      }),
    });
    await view.user.click(screen.getByRole('button', { name: /^customer <b>bold<\/b>/ }));
    await openDialog(view);
    const modal = dialog();
    expect(within(modal).getByText(`${siteName} · ${fileName}`)).toBeTruthy();
    expect(modal.querySelector('img, script, b, i')).toBeNull();
  });
});
