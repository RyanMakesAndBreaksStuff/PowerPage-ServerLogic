// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { HostContext, useHost } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { useNotify } from '@/session/useNotify';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { NotifyBehaviour } from '@/services/pptb/fakeHost';
import type { Notice } from '@/services/pptb/host.types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Trigger({ notice }: { notice: Notice }): ReactElement {
  const notify = useNotify();
  return (
    <button
      type="button"
      onClick={() => {
        notify(notice);
      }}
    >
      Send
    </button>
  );
}

async function send(behaviour: NotifyBehaviour, notice: Notice) {
  const host = createFakeHost({ notify: behaviour });
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <Trigger notice={notice} />
      </NotifyProvider>
    </HostContext>,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await Promise.resolve();
  });
  return host;
}

const SAVED: Notice = { title: 'Code copied', body: '', type: 'success' };
const FAILED: Notice = {
  title: "Couldn't copy",
  body: 'The clipboard is not available.',
  type: 'error',
};

describe('useHost', () => {
  it('throws outside the App', () => {
    function Probe(): null {
      useHost();
      return null;
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useHost must be used inside the App');
  });
});

describe('useNotify (FR-1)', () => {
  it('sends the notice to the host and shows no in-tool toast when the host succeeds', async () => {
    const host = await send('ok', SAVED);
    expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice: SAVED }]);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['reject', 'throw', 'missing'] as const)(
    'falls back to an in-tool toast when the host notify %s, and calls the host once',
    async (behaviour) => {
      const host = await send(behaviour, FAILED);
      const toast = screen.getByRole('alert');
      expect(toast.textContent).toContain("Couldn't copy");
      expect(toast.textContent).toContain('The clipboard is not available.');
      expect(host.callsOf('notify')).toHaveLength(1);
    },
  );

  it('uses role="status" for a success fallback and hides it after 5 s', async () => {
    vi.useFakeTimers();
    await send('reject', SAVED);
    expect(screen.getByRole('status').textContent).toContain('Code copied');
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    act(() => {
      vi.advanceTimersByTime(150); // Phase 04's fade-out
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps an error fallback until it is closed', async () => {
    vi.useFakeTimers();
    await send('reject', FAILED);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    const toast = screen.getByRole('alert');
    fireEvent.click(within(toast).getByRole('button', { name: /close/i }));
    act(() => {
      vi.advanceTimersByTime(150); // Phase 04's fade-out
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
