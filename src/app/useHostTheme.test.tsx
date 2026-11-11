// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { applyTheme, useHostTheme } from '@/app/useHostTheme';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { PptbHost } from '@/services/pptb/host.types';

function Themed({ host }: { host: PptbHost }): ReactElement | null {
  useHostTheme(host);
  return null;
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeEach(() => {
  applyTheme('light');
});

describe('useHostTheme (AC-1.6)', () => {
  it('re-reads the theme on settings-updated', async () => {
    const host = createFakeHost({ theme: 'light' });
    render(<Themed host={host} />);
    host.setTheme('dark');
    host.emit({ kind: 'settings-updated' });
    await flush();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('re-reads the theme on window focus and when the document becomes visible', async () => {
    const host = createFakeHost({ theme: 'light' });
    render(<Themed host={host} />);
    host.setTheme('dark');
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(document.documentElement.dataset.theme).toBe('dark');
    host.setTheme('light');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps the current theme when the host cannot answer', async () => {
    applyTheme('dark');
    const failing: PptbHost = {
      ...createFakeHost(),
      getTheme: () => Promise.reject(new Error('x')),
    };
    render(<Themed host={failing} />);
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('removes its listeners on unmount', async () => {
    const host = createFakeHost({ theme: 'light' });
    const { unmount } = render(<Themed host={host} />);
    unmount();
    expect(host.listenerCount()).toBe(0);
    host.setTheme('dark');
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
