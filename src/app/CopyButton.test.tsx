import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';
import { CopyButton } from '@/app/CopyButton';

function mount(init: FakeHostInit = {}) {
  const host = createFakeHost(init);
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <CopyButton text={'a\nb'} label="Copy sample" />
      </NotifyProvider>
    </HostContext>,
  );
  return { host, user: userEvent.setup() };
}

describe('CopyButton (AC-4.9, AC-6.7, F49)', () => {
  it('copies the text and says "Code copied"', async () => {
    const { host, user } = mount();
    await user.click(screen.getByRole('button', { name: 'Copy sample' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: 'Code copied', body: '', type: 'success' } },
      ]);
    });
    expect(host.callsOf('copyText')).toEqual([{ method: 'copyText', text: 'a\nb' }]);
  });

  it('says "Couldn\'t copy" when the clipboard write fails, logging the error name only', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { host, user } = mount({ copy: 'reject' });
    await user.click(screen.getByRole('button', { name: 'Copy sample' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: "Couldn't copy", body: '', type: 'error' } },
      ]);
    });
    expect(log).toHaveBeenCalledWith('HostCallError');
  });
});
