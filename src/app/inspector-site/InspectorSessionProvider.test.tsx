// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_CANCELLED_BODY, EXPORT_CANCELLED_TITLE } from '@/features/inspector/export/exportCopy';
import type { SiteRef } from '@/types/inspector';
import { CONNECTION, createInspectorHost, OTHER_CONNECTION, SITE_ALPHA, SITE_BETA } from '@/test/inspectorWorld';
import { INSPECTOR_DEPS } from '@/features/inspector/inspectorDeps';
import type { InspectorDeps } from '@/features/inspector/inspectorDeps';
import { renderInspector } from '@/test/inspectorTestHarness';
import { useInspector } from '@/session/useInspector';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Records `connection|sites|scan` for every commit, so a test can see what any render showed. */
function Probe({ log }: { log: string[] }): ReactElement {
  const session = useInspector();
  const line = `${session.connection?.name ?? '-'}|${session.sites.status}|${session.scan.status}`;
  useEffect(() => {
    log.push(line);
  });
  const first = session.sites.status === 'ok' ? session.sites.sites[0] : undefined;
  return (
    <div>
      <p>{`sites:${session.sites.status}`}</p>
      <p>{`listed:${session.sites.status === 'ok' ? session.sites.sites.map((site) => site.name).join(',') : '-'}`}</p>
      <p>{`selected:${session.selectedSite?.name ?? 'none'}`}</p>
      <p>{`scan:${session.scan.status}`}</p>
      <p>{`connection:${session.connection?.name ?? 'none'}`}</p>
      <p>{`marks:${String(session.marks.size)}`}</p>
      <button
        type="button"
        onClick={() => {
          if (first !== undefined) session.selectSite(first);
        }}
      >
        scan first
      </button>
      <button
        type="button"
        onClick={() => {
          session.setReviewed('file-1:webRole', true);
        }}
      >
        mark
      </button>
    </div>
  );
}

async function scanFirst(user: ReturnType<typeof renderInspector>['user']) {
  await screen.findByText('sites:ok');
  await user.click(screen.getByRole('button', { name: 'scan first' }));
  await screen.findByText('scan:done');
  await user.click(screen.getByRole('button', { name: 'mark' }));
  await screen.findByText('marks:1');
}

async function changeConnection(
  host: ReturnType<typeof createInspectorHost>,
  next: typeof CONNECTION | null,
) {
  host.setConnection(next);
  await act(async () => {
    host.emit({ kind: 'connection-changed' });
    await Promise.resolve();
  });
}

describe('InspectorSessionProvider', () => {
  it('adopts the confirmed connection, loads its sites and selects nothing', async () => {
    renderInspector(<Probe log={[]} />);
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(await screen.findByText('sites:ok')).toBeTruthy();
    expect(screen.getByText('scan:none')).toBeTruthy();
    expect(screen.getByText('connection:Development')).toBeTruthy();
  });

  it('adds no host subscription of its own', async () => {
    const { host } = renderInspector(<Probe log={[]} />);
    await screen.findByText('sites:ok');
    expect(host.listenerCount()).toBe(1);
  });

  it('keeps results, marks and the site list when a connection event only renames the connection (D-16 A)', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    await changeConnection(host, { ...CONNECTION, name: 'Renamed', environment: 'Production' });
    await screen.findByText('connection:Renamed');
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'powerpagesites')).toHaveLength(1);
  });

  it('clears results and marks for a changed connection without ever rendering them for the new one', async () => {
    const log: string[] = [];
    const { host, user } = renderInspector(<Probe log={log} />);
    await scanFirst(user);
    const before = log.length;
    await changeConnection(host, OTHER_CONNECTION);
    await screen.findByText('connection:Fabrikam');
    await screen.findByText('sites:ok');
    expect(screen.getByText('scan:none')).toBeTruthy();
    expect(screen.getByText('marks:0')).toBeTruthy();
    expect(log.slice(before).some((line) => line.endsWith('|done'))).toBe(false);
    expect(log.slice(before)).toContain('Fabrikam|loading|none');
  });

  it('clears results for a successful null connection', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    await changeConnection(host, null);
    await screen.findByText('scan:none');
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(screen.getByText('connection:none')).toBeTruthy();
  });

  it('keeps results through a rejected refresh and recovers on focus', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />);
    await scanFirst(user);
    host.setConnectionRead('reject');
    await changeConnection(host, CONNECTION);
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    host.setConnectionRead('ok');
    host.setConnection(OTHER_CONNECTION);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    await screen.findByText('connection:Fabrikam');
    expect(screen.getByText('scan:none')).toBeTruthy();
  });

  it('waits for the first confirmed connection before reading anything', async () => {
    const host = createInspectorHost();
    host.setConnectionRead('hold');
    renderInspector(<Probe log={[]} />, { host });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('sites:idle')).toBeTruthy();
    expect(host.callsOf('queryAll')).toHaveLength(0);
    host.settleConnectionRead(0, CONNECTION);
    expect(await screen.findByText('sites:ok')).toBeTruthy();
  });

  it('survives StrictMode double effects and still loads the sites', async () => {
    const { host } = renderInspector(<Probe log={[]} />, { strict: true });
    expect(await screen.findByText('sites:ok')).toBeTruthy();
    expect(host.listenerCount()).toBe(1);
  });

  it('aborts a running scan on unmount and ignores whatever arrives later', async () => {
    const host = createInspectorHost();
    const { unmount, user } = renderInspector(<Probe log={[]} />, { host });
    await screen.findByText('sites:ok');
    host.holdDataReads(true);
    await user.click(screen.getByRole('button', { name: 'scan first' }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    unmount();
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(0);
    });
    host.holdDataReads(false);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('InspectorSessionProvider: no site list reload for a same-identity event (D-16 A)', () => {
  /** `listSites` answers from a script of outcomes; the real reader is not involved. */
  function scripted(outcomes: readonly (readonly SiteRef[] | Error)[]) {
    const queue = [...outcomes];
    let calls = 0;
    return {
      deps: {
        ...INSPECTOR_DEPS,
        listSites: () => {
          calls += 1;
          const next = queue.shift();
          if (next === undefined) return Promise.reject(new Error('unexpected read'));
          return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        },
      },
      calls: () => calls,
    };
  }

  it('leaves the list, results and marks alone when an event confirms the same identity, or its re-read rejects', async () => {
    const script = scripted([[SITE_ALPHA, SITE_BETA]]);
    const { host, user } = renderInspector(<Probe log={[]} />, { deps: script.deps });
    await scanFirst(user);
    await changeConnection(host, { ...CONNECTION });
    host.setConnectionRead('reject');
    await changeConnection(host, { ...CONNECTION });
    host.setConnectionRead('ok');
    expect(screen.getByText('listed:Alpha portal,Beta portal')).toBeTruthy();
    expect(screen.getByText('scan:done')).toBeTruthy();
    expect(screen.getByText('marks:1')).toBeTruthy();
    expect(screen.getByText('selected:Alpha portal')).toBeTruthy();
    expect(script.calls()).toBe(1);
    expect(host.listenerCount()).toBe(1);
    expect(host.callsOf('notify')).toHaveLength(0);
  });

  it('does not reload for a focus or visibility re-read', async () => {
    const script = scripted([[SITE_ALPHA, SITE_BETA]]);
    const { user } = renderInspector(<Probe log={[]} />, { deps: script.deps });
    await scanFirst(user);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(script.calls()).toBe(1);
    expect(screen.getByText('listed:Alpha portal,Beta portal')).toBeTruthy();
  });

  it('shows no site in the picker after the connection changed under a scan (D-14, S-08)', async () => {
    const { host, user } = renderInspector(<Probe log={[]} />, { host: createInspectorHost() });
    await screen.findByText('sites:ok');
    host.holdDataReads(true);
    await user.click(screen.getByRole('button', { name: 'scan first' }));
    await waitFor(() => {
      expect(host.dataReads.inFlight).toBe(4);
    });
    expect(screen.getByText('selected:Alpha portal')).toBeTruthy();
    host.setConnection(OTHER_CONNECTION);
    host.holdDataReads(false);
    expect(await screen.findByText('scan:connection-changed')).toBeTruthy();
    expect(screen.getByText('selected:none')).toBeTruthy();
  });
});

/** Drives an export through the real provider chain and shows the job's phase. */
function ExportProbe(): ReactElement {
  const session = useInspector();
  const first = session.sites.status === 'ok' ? session.sites.sites[0] : undefined;
  return (
    <div>
      <p>{`sites:${session.sites.status}`}</p>
      <p>{`scan:${session.scan.status}`}</p>
      <p>{`job:${session.exportJob?.phase ?? 'none'}`}</p>
      <button
        type="button"
        onClick={() => {
          if (first !== undefined) session.selectSite(first);
        }}
      >
        scan first
      </button>
      <button
        type="button"
        onClick={() => {
          session.openExport();
        }}
      >
        open export
      </button>
      <button
        type="button"
        onClick={() => {
          session.submitExport();
        }}
      >
        submit export
      </button>
    </div>
  );
}

describe('InspectorSessionProvider: export job (P5.7)', () => {
  it('commits a confirmed connection synchronously when the host answers, so a job building at that moment is cancelled before the handoff (E-04 B)', async () => {
    const host = createInspectorHost();
    const deps: InspectorDeps = {
      ...INSPECTOR_DEPS,
      renderMarkdown: (...args) => {
        host.setConnection(OTHER_CONNECTION);
        host.emit({ kind: 'connection-changed' });
        return INSPECTOR_DEPS.renderMarkdown(...args);
      },
    };
    const { user } = renderInspector(<ExportProbe />, { host, deps });
    await screen.findByText('sites:ok');
    await user.click(screen.getByRole('button', { name: 'scan first' }));
    await screen.findByText('scan:done');
    await user.click(screen.getByRole('button', { name: 'open export' }));
    await screen.findByText('job:idle');
    await user.click(screen.getByRole('button', { name: 'submit export' }));
    await waitFor(() => {
      expect(host.callsOf('releasePreventClose')).toHaveLength(1);
    });
    expect(host.callsOf('saveFile')).toHaveLength(0);
    expect(host.callsOf('notify').map((call) => call.notice)).toEqual([
      { title: EXPORT_CANCELLED_TITLE, body: EXPORT_CANCELLED_BODY, type: 'info' },
    ]);
    expect(await screen.findByText('job:none')).toBeTruthy();
    expect(screen.getByText('scan:none')).toBeTruthy();
  });
});
