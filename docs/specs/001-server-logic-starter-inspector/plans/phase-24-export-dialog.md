# Inspector Export Dialog Implementation Plan

> **Execution superseded — 2026-11-01.** `../../../phase-5/plans/p5-1_plan.md`, `../../../phase-5/plans/p5-2_plan.md` and `../../../phase-5/plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.

**Goal:** Export a frozen readiness review to Markdown or PDF with the requested scope, includes, redaction and save feedback.

**Architecture:** InspectorPage owns the dialog-open snapshot and invalidation. ExportDialog owns options and save feedback; Phase 16 owns report data and filenames; Phase 20 owns PDF drawing; the existing Modal/PillGroup own APG focus and keyboard patterns.

**Tech stack:** React 19, strict TypeScript, existing PPTB save/notify adapter, Vitest/Testing Library, existing jsPDF/autotable.

**Scope:** AC-9.1, 9.8, 9.9; consume all report rules from Phases 16/20.

**Out of scope:** Dataverse writes, settings persistence, publishing or live save timing certification.

**Part:** plan-inspector.md, wave I4, Phase 24.

**Implements / Satisfies:**

- AC-9.1: 520 px Modal, Report and Format PillGroups; selected-file or site-summary defaults; Markdown default; questions/snapshot on, redact off; no-file reason; scan/zero-file eligibility.
- AC-9.8: structuredClone at dialog-open, later marks keep snapshot, cleared results close with cancellation toast, already-open host save retains submitted content.
- AC-9.9: build before saveFile, bounded build phase, immediate feedback after host resolves, error filename/reason, cancel writes/toasts nothing.
- AC-9.2–9.7, 9.10: report bytes and filename delegate to authoritative earlier owners.
- Accessibility: existing APG Modal focus trap/Esc/return, PillGroup radio keyboard patterns, labelled checkboxes and error/status notification.

**Depends on:** 16, 20, 23 and Part A 04/06.

**Files and Interfaces:** Task 1 owns ExportDialog.tsx, ExportDialog.test.tsx, exportLifecycle.test.tsx and the InspectorPage integration hunks. Consumes useHost/useNotify, Modal/Button/PillGroup, ReportOptions/ReportScope/ReportFormat, buildReportModel, renderMarkdown/renderPdf/reportFileName and Phase 23 selected file. Produces ExportDialog({snapshot,fileId,onClose,onSaving?}); nothing outside Inspector consumes it.

## Decisions

1. One complete cloned SiteResult is captured by the open event, with selected file ID. Marks update the screen without touching the snapshot. Scan ID identity decides cancellation, including site/rescan/connection changes; changes that only rename/relabel keep results.
2. BuildReportModel and renderers are synchronous. The elapsed build check starts before model construction and ends before saveFile. Saving is awaited and notify is called immediately after a saved result; the API does not expose when a user confirms the native dialog, so exact confirm-to-toast timing remains the owner-run AC-9.9 gate. No timeout races the host save because that could misreport a file already written.
3. The saving flag is set immediately before saveFile. Once the host owns the bytes, invalidation cannot retract the write and keeps that submitted snapshot, as AC-9.8 requires. Before submission a cleared result hides/closes the tool dialog and emits one info toast.
4. Phase 16 reportFileNameBeforeBuild owns the intended filename before model construction; reportFileName confirms it from the model. Every build or save failure therefore names the intended file. Errors remain retryable in the dialog, host cancellation closes silently.
5. Export button busy state blocks double click; Modal Esc remains its established close behavior. Report and Format use existing radio controls with the exact disabled reason Select a file first. No new focus-trap implementation.

---

### Task 1: Export the frozen report and handle every save result

**Owns:** AC-9.1/9.8/9.9 option/snapshot/save lifecycle.

**Files:**
- Create: `src/features/inspector/ExportDialog.tsx` — option controls and report/save orchestration.
- Create/Signal: `src/features/inspector/ExportDialog.test.tsx` — seven defaults/format/include/save/modal paths.
- Create/Signal: `src/features/inspector/exportLifecycle.test.tsx` — frozen snapshot and one invalidation notification.
- Modify: `src/features/inspector/InspectorPage.tsx` — dialog-open snapshot, save boundary and cancellation.

- [ ] **Step 1: Establish the observable pre-change signal**

```tsx file=src/features/inspector/ExportDialog.test.tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { ExportDialog } from './ExportDialog';
import { buildReportModel } from './report/buildReportModel';
import { renderMarkdown } from './report/renderMarkdown';
import { reportFileName } from './report/reportFileName';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

vi.mock('./report/buildReportModel', () => ({ buildReportModel: vi.fn() }));
vi.mock('./report/renderMarkdown', () => ({ renderMarkdown: vi.fn(() => 'report') }));
vi.mock('./report/renderPdf', () => ({ renderPdf: vi.fn(() => new Uint8Array([1, 2])) }));
vi.mock('./report/reportFileName', () => ({
  reportFileName: vi.fn(() => 'file-readiness.md'),
  reportFileNameBeforeBuild: vi.fn(() => 'file-readiness.md'),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SNAPSHOT: SiteResult = {
  facts: {
    scanId: 'scan',
    site: { id: 'site', name: 'Site', domain: 'site.example', active: true },
    connection: { id: 'conn', name: 'Env', url: 'https://env.example', environment: 'Dev' },
    startedAt: '2026-10-22T10:00:00Z',
    finishedAt: '2026-10-22T10:00:01Z',
    roles: { ok: true, value: [] },
    permissions: { ok: true, value: [] },
    settings: { ok: false, reason: 'not-scanned' },
    inactiveSettings: [],
    files: [],
    inventoryComplete: true,
    stopped: null,
  },
  files: [],
  banners: [],
};

function mount(save: 'save' | 'cancel' | 'reject' = 'save', fileId: string | null = 'file') {
  const host = createFakeHost({ save });
  const close = vi.fn();
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <ExportDialog snapshot={SNAPSHOT} fileId={fileId} onClose={close} />
      </NotifyProvider>
    </HostContext>,
  );
  return { host, close };
}
describe('Export dialog', () => {
  it('defaults to selected file, Markdown and include options; saves once and confirms (AC-9.1/9.8)', async () => {
    const { host, close } = mount();
    expect(screen.getByRole('radio', { name: 'This file' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    for (const label of ['Questions to consider', 'Configuration snapshot'])
      expect(screen.getByLabelText<HTMLInputElement>(label).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(host.savedFiles).toHaveLength(1);
    });
    expect(host.callsOf('notify')[0]?.notice.title).toBe('file-readiness.md exported');
    expect(close).toHaveBeenCalledTimes(1);
    const options = vi.mocked(buildReportModel).mock.calls[0]?.[1];
    expect(options).toEqual({
      scope: 'file',
      format: 'markdown',
      fileId: 'file',
      questions: true,
      snapshot: true,
      redact: false,
    });
  });
  it('uses Site summary with no file and exposes the disabled reason (AC-9.1)', async () => {
    mount('save', null);
    const user = userEvent.setup();
    const file = screen.getByRole('radio', { name: 'This file' });
    expect(file.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Site summary' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    file.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tooltip').textContent).toBe('Select a file first');
  });
  it('passes include/redact/PDF values to the snapshot builder and sends binary content', async () => {
    const { host } = mount();
    fireEvent.click(screen.getByRole('radio', { name: 'PDF' }));
    fireEvent.click(screen.getByLabelText('Questions to consider'));
    fireEvent.click(screen.getByLabelText('Configuration snapshot'));
    fireEvent.click(screen.getByLabelText('Redact environment and site names'));
    vi.mocked(reportFileName).mockReturnValueOnce('file-readiness.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    await waitFor(() => {
      expect(host.savedFiles).toHaveLength(1);
    });
    expect(host.savedFiles[0]?.content).toEqual(new Uint8Array([1, 2]));
    const options: ReportOptions | undefined = vi.mocked(buildReportModel).mock.calls[0]?.[1];
    expect(options).toMatchObject({
      questions: false,
      snapshot: false,
      redact: true,
      format: 'pdf',
    });
    expect(vi.mocked(buildReportModel).mock.calls[0]?.[0]).toBe(SNAPSHOT);
  });
  it('host cancel writes nothing, closes and shows no notification (AC-9.9)', async () => {
    const { host, close } = mount('cancel');
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(close).toHaveBeenCalled();
    });
    expect(host.savedFiles).toHaveLength(0);
    expect(host.callsOf('notify')).toHaveLength(0);
  });
  it('save failure reports filename/reason and leaves the dialog usable (AC-9.9)', async () => {
    const { host, close } = mount('reject');
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toHaveLength(1);
    });
    expect(host.callsOf('notify')[0]?.notice.title).toBe("Couldn't save file-readiness.md");
    expect(host.savedFiles).toHaveLength(0);
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export Markdown' }).hasAttribute('disabled')).toBe(
      false,
    );
  });
  it('build failure never invokes saveFile', async () => {
    const { host } = mount();
    vi.mocked(renderMarkdown).mockImplementationOnce(() => {
      throw new Error('PDF/font build failed');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toHaveLength(1);
    });
    expect(host.callsOf('saveFile')).toHaveLength(0);
    expect(host.callsOf('notify')[0]?.notice.body).toBe('PDF/font build failed');
  });
  it('model construction failure still reports the exact intended filename (AC-9.9)', async () => {
    const { host } = mount();
    vi.mocked(buildReportModel).mockImplementationOnce(() => {
      throw new Error('Invalid scan time');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toHaveLength(1);
    });
    expect(host.callsOf('saveFile')).toHaveLength(0);
    expect(host.callsOf('notify')[0]?.notice.title).toBe("Couldn't save file-readiness.md");
    expect(host.callsOf('notify')[0]?.notice.body).toBe('Invalid scan time');
  });
  it('Esc closes and modal traps Tab (AC-9.1)', async () => {
    const { close } = mount();
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Export Markdown' });
    button.focus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(close).toHaveBeenCalled();
  });
});
```

```tsx file=src/features/inspector/exportLifecycle.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { ConnectionContext } from '@/app/useActiveConnection';
import { InspectorContext } from '@/app/inspector-site/useInspector';
import type { InspectorContextValue } from '@/app/inspector-site/useInspector';
import { initialInspectorState } from '@/app/inspector-site/inspectorState';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { InspectorPage } from './InspectorPage';
import type { SiteResult } from '@/types/inspector';

const captured = vi.hoisted(() => ({ result: null as SiteResult | null }));
vi.mock('./ExportDialog', () => ({
  ExportDialog: ({
    snapshot,
    onSaving,
    onSaveFailed,
  }: {
    snapshot: SiteResult;
    onSaving: () => void;
    onSaveFailed: () => void;
  }) => {
    captured.result = snapshot;
    return (
      <div role="dialog" aria-label="Export report">
        <button type="button" onClick={onSaving}>
          Start host save
        </button>
        <button type="button" onClick={onSaveFailed}>
          Reject host save
        </button>
        Export snapshot
      </div>
    );
  },
}));
vi.mock('./InspectorContent', () => ({ InspectorContent: () => <p>File content</p> }));
afterEach(cleanup);

const result: SiteResult = {
  facts: {
    scanId: 'scan',
    site: { id: 'site', name: 'Site', domain: 'site.example', active: true },
    connection: { id: 'conn', name: 'Env', url: 'https://env.example', environment: 'Dev' },
    startedAt: '2026-10-22T10:00:00Z',
    finishedAt: '2026-10-22T10:00:01Z',
    roles: { ok: true, value: [] },
    permissions: { ok: true, value: [] },
    settings: { ok: false, reason: 'not-scanned' },
    inactiveSettings: [],
    files: [],
    inventoryComplete: true,
    stopped: null,
  },
  files: [
    {
      fileId: 'f',
      name: 'File',
      active: true,
      findings: [
        {
          check: 'webRole',
          status: 'configured',
          summary: 'Original',
          reasons: [],
          guidance: '',
          questions: [],
          detail: [],
        },
        {
          check: 'tablePermissions',
          status: 'configured',
          summary: '',
          reasons: [],
          guidance: '',
          questions: [],
          detail: [],
        },
        {
          check: 'outbound',
          status: 'configured',
          summary: '',
          reasons: [],
          guidance: '',
          questions: [],
          detail: [],
        },
      ],
      snapshot: { roles: [], tables: [], outbound: [] },
    },
  ],
  banners: [],
};

describe('Export snapshot lifecycle (AC-9.8)', () => {
  it('returns to cancellable tool dialog state after the host save fails', async () => {
    const host = createFakeHost();
    const context: InspectorContextValue = {
      state: { ...initialInspectorState, fileId: 'f' },
      result,
      selectSite: vi.fn(),
      selectFile: vi.fn(),
      rescan: vi.fn(),
      retrySites: vi.fn(),
      cancel: vi.fn(),
      toggleReview: vi.fn(),
    };
    const ui = (value: InspectorContextValue) => (
      <HostContext value={host}>
        <NotifyProvider>
          <ConnectionContext value={result.facts.connection}>
            <InspectorContext value={value}>
              <InspectorPage />
            </InspectorContext>
          </ConnectionContext>
        </NotifyProvider>
      </HostContext>
    );
    const { rerender } = render(ui(context));
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start host save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject host save' }));
    await act(async () => {
      rerender(ui({ ...context, result: null }));
      await Promise.resolve();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => {
      expect(host.callsOf('notify')).toHaveLength(1);
    });
  });
  it('freezes results on open, retains later marks, closes if cleared and notifies once', async () => {
    const host = createFakeHost();
    const context: InspectorContextValue = {
      state: { ...initialInspectorState, fileId: 'f' },
      result,
      selectSite: vi.fn(),
      selectFile: vi.fn(),
      rescan: vi.fn(),
      retrySites: vi.fn(),
      cancel: vi.fn(),
      toggleReview: vi.fn(),
    };
    const ui = (value: InspectorContextValue) => (
      <HostContext value={host}>
        <NotifyProvider>
          <ConnectionContext value={result.facts.connection}>
            <InspectorContext value={value}>
              <InspectorPage />
            </InspectorContext>
          </ConnectionContext>
        </NotifyProvider>
      </HostContext>
    );
    const { rerender } = render(ui(context));
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }));
    expect(captured.result).not.toBe(result);
    expect(captured.result?.files[0]?.findings[0].summary).toBe('Original');
    const changed = structuredClone(result);
    const finding = changed.files[0]?.findings[0];
    if (finding === undefined) throw new Error('Missing fixture finding');
    finding.summary = 'Later review';
    rerender(ui({ ...context, result: changed }));
    expect(captured.result?.files[0]?.findings[0].summary).toBe('Original');
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => {
      rerender(ui({ ...context, result: null }));
      await Promise.resolve();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => {
      expect(host.callsOf('notify')).toHaveLength(1);
    });
    expect(host.callsOf('notify')[0]?.notice.title).toBe(
      'Results changed, so the export was cancelled.',
    );
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx`

Expected: exit 1 before Step 3: ExportDialog import cannot resolve; the lifecycle test finds no dialog after Export report is selected.

- [ ] **Step 3: Implement the minimum fix**

```tsx file=src/features/inspector/ExportDialog.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { PillGroup } from '@/components/PillGroup';
import { buildReportModel } from './report/buildReportModel';
import { renderMarkdown } from './report/renderMarkdown';
import { renderPdf } from './report/renderPdf';
import { reportFileName, reportFileNameBeforeBuild } from './report/reportFileName';
import type { SiteResult } from '@/types/inspector';
import type { ReportFormat, ReportOptions, ReportScope } from '@/types/report';

export function ExportDialog({
  snapshot,
  fileId,
  onClose,
  onSaving,
  onSaveFailed,
}: {
  snapshot: SiteResult;
  fileId: string | null;
  onClose: () => void;
  onSaving?: () => void;
  onSaveFailed?: () => void;
}): ReactElement {
  const host = useHost();
  const notify = useNotify();
  const [options, setOptions] = useState<ReportOptions>({
    scope: fileId === null ? 'site' : 'file',
    format: 'markdown',
    fileId,
    questions: true,
    snapshot: true,
    redact: false,
  });
  const [busy, setBusy] = useState(false);
  const exporting = {
    label: options.format === 'markdown' ? 'Markdown' : 'PDF',
    extension: options.format === 'markdown' ? 'md' : 'pdf',
  };
  const exportReport = async (): Promise<void> => {
    let filename = reportFileNameBeforeBuild(snapshot, options);
    setBusy(true);
    try {
      const started = performance.now();
      const model = buildReportModel(snapshot, options, new Date());
      filename = reportFileName(model);
      const content = options.format === 'markdown' ? renderMarkdown(model) : renderPdf(model);
      if (performance.now() - started > 5000)
        throw new Error('Building the report exceeded 5 seconds.');
      onSaving?.();
      const result = await host.saveFile(filename, content, [
        { name: exporting.label, extensions: [exporting.extension] },
      ]);
      if (result.status === 'saved')
        notify({ title: `${filename} exported`, body: '', type: 'success' });
      onClose();
    } catch (error) {
      onSaveFailed?.();
      notify({
        title: `Couldn't save ${filename}`,
        body: error instanceof Error ? error.message : 'Report export failed.',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title="Export report"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button onClick={onClose} busy={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            busy={busy}
            onClick={() => {
              void exportReport();
            }}
          >
            Export {exporting.label}
          </Button>
        </>
      }
    >
      <PillGroup<ReportScope>
        label="Report"
        options={[
          {
            label: 'This file',
            value: 'file',
            disabledReason: fileId === null ? 'Select a file first' : null,
          },
          { label: 'Site summary', value: 'site' },
        ]}
        value={options.scope}
        onChange={(scope) => {
          setOptions({ ...options, scope });
        }}
      />
      <PillGroup<ReportFormat>
        label="Format"
        options={[
          { label: 'Markdown', value: 'markdown' },
          { label: 'PDF', value: 'pdf' },
        ]}
        value={options.format}
        onChange={(format) => {
          setOptions({ ...options, format });
        }}
      />
      <fieldset>
        <legend>Include</legend>
        <label>
          <input
            type="checkbox"
            checked={options.questions}
            onChange={(event) => {
              setOptions({ ...options, questions: event.currentTarget.checked });
            }}
          />
          Questions to consider
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.snapshot}
            onChange={(event) => {
              setOptions({ ...options, snapshot: event.currentTarget.checked });
            }}
          />
          Configuration snapshot
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.redact}
            onChange={(event) => {
              setOptions({ ...options, redact: event.currentTarget.checked });
            }}
          />
          Redact environment and site names
        </label>
      </fieldset>
    </Modal>
  );
}
```

```diff file=src/features/inspector/InspectorPage.tsx
diff --git a/src/features/inspector/InspectorPage.tsx b/src/features/inspector/InspectorPage.tsx
index 44d077f..0a12bc5 100644
--- a/src/features/inspector/InspectorPage.tsx
+++ b/src/features/inspector/InspectorPage.tsx
@@ -1,4 +1,8 @@
+import { useEffect, useReducer } from 'react';
 import type { ReactElement } from 'react';
+import { useNotify } from '@/app/useNotify';
+import type { SiteResult } from '@/types/inspector';
+import { ExportDialog } from './ExportDialog';
 import { useActiveConnection } from '@/app/useActiveConnection';
 import { useInspector } from '@/app/inspector-site/useInspector';
 import { Button } from '@/components/Button';
@@ -6,9 +10,25 @@ import { Tile } from '@/components/Tile';
 import { InspectorContent } from './InspectorContent';
 import './inspector.css';
 
+type ExportSession = { snapshot: SiteResult; fileId: string | null; saving: boolean } | null;
 export function InspectorPage(): ReactElement {
   const connection = useActiveConnection();
   const { state, result, rescan, retrySites, cancel } = useInspector();
+  const notify = useNotify();
+  const [exportSession, setExportSession] = useReducer(
+    (_old: ExportSession, next: ExportSession) => next,
+    null,
+  );
+  const invalidExport =
+    exportSession !== null &&
+    !exportSession.saving &&
+    exportSession.snapshot.facts.scanId !== result?.facts.scanId;
+  useEffect(() => {
+    if (invalidExport) {
+      setExportSession(null);
+      notify({ title: 'Results changed, so the export was cancelled.', body: '', type: 'info' });
+    }
+  }, [invalidExport, notify]);
   const disabledReason = state.scanning
     ? 'Wait for the scan to finish'
     : result === null || result.files.length === 0
@@ -23,7 +43,18 @@ export function InspectorPage(): ReactElement {
         >
           Rescan
         </Button>
-        <Button variant="primary" disabledReason={disabledReason}>
+        <Button
+          variant="primary"
+          disabledReason={disabledReason}
+          onClick={() => {
+            if (result !== null)
+              setExportSession({
+                snapshot: structuredClone(result),
+                fileId: state.fileId,
+                saving: false,
+              });
+          }}
+        >
           Export report
         </Button>
       </div>
@@ -87,6 +118,18 @@ export function InspectorPage(): ReactElement {
           )}
         </>
       )}
+      {exportSession !== null && !invalidExport ? (
+        <ExportDialog
+          snapshot={exportSession.snapshot}
+          fileId={exportSession.fileId}
+          onClose={() => {
+            setExportSession(null);
+          }}
+          onSaving={() => {
+            setExportSession({ ...exportSession, saving: true });
+          }}
+        />
+      ) : null}
     </section>
   );
 }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx`

Expected: exit 0; all tests in the named files pass.

Run: `npx vitest run src/features/inspector/InspectorPage.test.tsx src/components/Modal.test.tsx src/components/PillGroup.test.tsx`

Expected: exit 0.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/features/inspector/ExportDialog.tsx src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx src/features/inspector/InspectorPage.tsx
git commit -m "feat(inspector): export frozen Markdown and PDF reviews"
```

## Integration verification

Run `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx vitest run` and `npx vite build`; expect exit 0. Run `npx prettier --check src/features/inspector/ExportDialog.tsx src/features/inspector/ExportDialog.test.tsx src/features/inspector/exportLifecycle.test.tsx src/features/inspector/InspectorPage.tsx`; expect formatted selected files.

◆ In PPTB, compare screen statuses/reasons to both exported formats for file and site; repeat with includes off, redaction on, Reviewed and stopped/Not scanned results. Verify Markdown/PDF rendering in readers, both tool themes, Modal focus trap/Esc/return. Confirm a local save and time from primary click to native dialog (≤5 s) and native confirm to toast (≤5 s); record host version, file size and times. Cancel native save and verify no toast/file. Use a read-only test-site scan and a local destination.

## Verified while planning

Detached scratch base42c2809, 2026-10-22: ExportDialog seven tests and snapshot lifecycle one test pass; assembled page/export/reducer/App run 22 tests in five files passed. Scoped ESLint clean, typecheck and build-shape pass. Full assembled gate evidence is in plan-inspector.md. Fullrepo formatting baseline176 failures remain unrelated; selected code is checked. Native save confirmation timing, reader/screen comparison and live PPTB remain unverified.

## Done when

- [ ] Source: snapshot is taken only on open, model/filename ownership retained, no environment writes.
- [ ] Tests/build: all exact commands above pass; cancelled save produces no notification.
- [ ] Rendered browser: dialog controls, focus and literal hostile names verified.
- [ ] Live PPTB: both formats match screen; native save/cancel and timing evidence recorded.
