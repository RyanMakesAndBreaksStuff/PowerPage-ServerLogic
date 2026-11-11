// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { deriveStarter } from '@/session/deriveStarter';
import { STARTER_DEPS } from '@/session/starterDeps';
import { initialStarterState } from '@/session/starterReducer';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import type {
  StarterAction,
  StarterDerived,
  StarterState,
} from '@/types/starter';
import { StarterSessionContext, useStarterSession } from '@/session/useStarterSession';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostControls } from '@/services/pptb/fakeHost';
import type { PptbHost, SaveResult } from '@/services/pptb/host.types';
import { DownloadStarterButton } from './DownloadStarterButton';

afterEach(() => {
  vi.restoreAllMocks();
});

type Host = PptbHost & FakeHostControls;

type Session = {
  state: StarterState;
  derived: StarterDerived;
  dispatch: (action: StarterAction) => void;
};

function SelectR4(): ReactElement {
  const { dispatch } = useStarterSession();
  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'selectRecipe', recipe: 'R4' });
      }}
    >
      select r4
    </button>
  );
}

function renderReal(host: Host, selectR4 = false): void {
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <StarterSessionProvider>
          {selectR4 ? <SelectR4 /> : null}
          <DownloadStarterButton />
        </StarterSessionProvider>
      </NotifyProvider>
    </HostContext>,
  );
}

function renderSession(host: Host, session: Session): void {
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <StarterSessionContext value={session}>
          <DownloadStarterButton />
        </StarterSessionContext>
      </NotifyProvider>
    </HostContext>,
  );
}

async function clickDownload(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Download starter' }));
    await Promise.resolve();
  });
}

function rejectNonError(reason: unknown): Promise<SaveResult> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test is a non-Error
  return Promise.reject(reason);
}

function zipBytes(content: string | Uint8Array): Uint8Array {
  if (typeof content === 'string') throw new Error('expected zip bytes');
  return content;
}

function baseSession(): Session {
  const state = initialStarterState(STARTER_DEPS);
  return { state, derived: deriveStarter(state, STARTER_DEPS), dispatch: vi.fn() };
}

describe('DownloadStarterButton', () => {
  it('renders a primary Download starter button', () => {
    renderReal(createFakeHost());
    const button = screen.getByRole('button', { name: 'Download starter' });
    expect(button.classList.contains('ui-button--primary')).toBe(true);
    expect(button.classList.contains('ui-button--block')).toBe(true);
    expect(button.querySelector('.ui-icon')).not.toBeNull();
  });

  it('saves the zip once and shows the success toast', async () => {
    const host = createFakeHost();
    renderReal(host);
    await clickDownload();
    const saves = host.callsOf('saveFile');
    expect(saves).toHaveLength(1);
    const save = saves[0];
    if (save === undefined) throw new Error('missing save');
    expect(save.defaultName).toBe('customer-summary.zip');
    expect(save.filters).toEqual([{ name: 'Zip archive', extensions: ['zip'] }]);
    expect(Object.keys(unzipSync(zipBytes(save.content)))).toHaveLength(4);
    expect(host.callsOf('notify')).toEqual([
      {
        method: 'notify',
        notice: { title: 'customer-summary.zip downloaded', body: '', type: 'success' },
      },
    ]);
  });

  it('five files for R4', async () => {
    const host = createFakeHost();
    renderReal(host, true);
    fireEvent.click(screen.getByRole('button', { name: 'select r4' }));
    await clickDownload();
    const save = host.callsOf('saveFile')[0];
    if (save === undefined) throw new Error('missing save');
    expect(Object.keys(unzipSync(zipBytes(save.content)))).toHaveLength(5);
  });

  it('cancel shows no toast and writes nothing', async () => {
    const host = createFakeHost({ save: 'cancel' });
    renderReal(host);
    await clickDownload();
    expect(host.callsOf('notify')).toEqual([]);
    expect(host.savedFiles).toEqual([]);
  });

  it('a rejected save shows the error toast with a plain-language reason', async () => {
    const host = createFakeHost({ save: 'reject' });
    renderReal(host);
    await clickDownload();
    expect(host.savedFiles).toEqual([]);
    const notice = host.callsOf('notify')[0]?.notice;
    expect(notice).toEqual({
      title: "Couldn't save customer-summary.zip",
      body: 'The file could not be written. Check the folder and try again.',
      type: 'error',
    });
    expect(notice?.body.includes('\n')).toBe(false);
  });

  it('a build failure shows the error toast and never calls saveFile', async () => {
    const session = baseSession();
    const host = createFakeHost();
    renderSession(host, { ...session, derived: { ...session.derived, fn: 'post' } });
    await clickDownload();
    expect(host.callsOf('saveFile')).toEqual([]);
    expect(host.callsOf('notify')[0]?.notice).toEqual({
      title: "Couldn't save customer-summary.zip",
      body: 'method GET does not match function post',
      type: 'error',
    });
  });

  it('a non-Error host throw gives the plain-language reason and leaks nothing', async () => {
    const host = createFakeHost();
    host.saveFile = () => rejectNonError('boom-secret');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderReal(host);
    await clickDownload();
    expect(host.callsOf('notify')[0]?.notice).toEqual({
      title: "Couldn't save customer-summary.zip",
      body: 'The file could not be written. Check the folder and try again.',
      type: 'error',
    });
    expect(spy.mock.calls.flat().map(String).join(' ')).not.toContain('boom-secret');
  });

  it('state is unchanged after a failure and after a success', async () => {
    const failing = baseSession();
    const failHost = createFakeHost();
    const { unmount } = render(
      <HostContext value={failHost}>
        <NotifyProvider>
          <StarterSessionContext
            value={{ ...failing, derived: { ...failing.derived, fn: 'post' } }}
          >
            <DownloadStarterButton />
          </StarterSessionContext>
        </NotifyProvider>
      </HostContext>,
    );
    await clickDownload();
    expect(failing.dispatch).not.toHaveBeenCalled();
    expect(failing.state.serverText).toBe(initialStarterState(STARTER_DEPS).serverText);
    unmount();

    const succeeding = baseSession();
    const okHost = createFakeHost();
    renderSession(okHost, succeeding);
    await clickDownload();
    expect(succeeding.dispatch).not.toHaveBeenCalled();
    expect(succeeding.state.serverText).toBe(initialStarterState(STARTER_DEPS).serverText);
  });

  it('is busy while the save is pending', async () => {
    const host = createFakeHost();
    let resolveSave: ((result: SaveResult) => void) | null = null;
    host.saveFile = () =>
      new Promise<SaveResult>((resolve) => {
        resolveSave = resolve;
      });
    renderReal(host);
    const button = screen.getByRole('button', { name: 'Download starter' });
    fireEvent.click(button);
    await act(async () => {
      await Promise.resolve();
    });
    expect(button.getAttribute('aria-busy')).toBe('true');
    await act(async () => {
      if (resolveSave === null) throw new Error('save did not start');
      resolveSave({ status: 'saved', path: 'C:\\fake\\customer-summary.zip' });
      await Promise.resolve();
    });
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(host.callsOf('notify')[0]?.notice).toEqual({
      title: 'customer-summary.zip downloaded',
      body: '',
      type: 'success',
    });
  });

  it('logs only the error name', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const host = createFakeHost({ save: 'reject' });
    renderReal(host);
    await clickDownload();
    expect(spy).toHaveBeenCalledWith('HostCallError');
    expect(spy.mock.calls.flat().map(String).join(' ')).not.toContain(
      'Host call failed: saveFile.',
    );
  });
});
