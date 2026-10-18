// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExternalLink } from '@/app/ExternalLink';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { createFakeHost } from '@/services/pptb/fakeHost';

afterEach(cleanup);

const LEARN = 'https://learn.microsoft.com/power-pages/configure/server-logic-overview';

function mount(openExternal: 'ok' | 'reject', notify: 'ok' | 'reject' = 'ok') {
  const host = createFakeHost({ openExternal, notify });
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <ExternalLink href={LEARN}>Server logic overview</ExternalLink>
      </NotifyProvider>
    </HostContext>,
  );
  return host;
}

describe('ExternalLink (FR-1)', () => {
  it('keeps a real href and opens nothing on render', () => {
    const host = mount('ok');
    expect(screen.getByRole('link', { name: 'Server logic overview' }).getAttribute('href')).toBe(
      LEARN,
    );
    expect(host.callsOf('openExternal')).toHaveLength(0);
  });

  it('opens the link through the host on click, without a _blank target', async () => {
    const host = mount('ok');
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBeNull();
    await act(async () => {
      fireEvent.click(link);
      await Promise.resolve();
    });
    expect(host.callsOf('openExternal')).toEqual([{ method: 'openExternal', url: LEARN }]);
  });

  it('shows an error notice when the host cannot open it', async () => {
    const host = mount('reject');
    await act(async () => {
      fireEvent.click(screen.getByRole('link'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(host.callsOf('notify')).toEqual([
      {
        method: 'notify',
        notice: {
          title: "Couldn't open the link",
          body: 'Open it from your browser instead.',
          type: 'error',
        },
      },
    ]);
  });
});
