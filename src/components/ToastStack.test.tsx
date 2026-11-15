// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastStack } from './ToastStack';
import type { ToastItem, ToastType } from './ToastStack';

function setReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string) => ({
      matches,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'matchMedia');
});

const toast = (type: ToastType, id: string = type): ToastItem => ({
  id,
  type,
  title: `${type} title`,
  body: `${type} body`,
});

function Harness({ initial }: { initial: readonly ToastItem[] }) {
  const [toasts, setToasts] = useState(initial);
  return (
    <ToastStack
      toasts={toasts}
      onClose={(id) => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }}
    />
  );
}

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('ToastStack, structure and roles (FR-1)', () => {
  it('shows a header with the title and a close button, and the body', () => {
    render(<Harness initial={[toast('success')]} />);
    const item = screen.getByRole('status');
    expect(within(item).getByText('success title')).toBeTruthy();
    expect(within(item).getByText('success body')).toBeTruthy();
    expect(within(item).getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('gives success and info role=status and error and warning role=alert', () => {
    render(
      <Harness initial={[toast('success'), toast('info'), toast('error'), toast('warning')]} />,
    );
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual([
      expect.stringContaining('success title'),
      expect.stringContaining('info title'),
    ]);
    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toEqual([
      expect.stringContaining('error title'),
      expect.stringContaining('warning title'),
    ]);
  });

  it('stacks several toasts in the order given', () => {
    render(<Harness initial={[toast('info', 'a'), toast('success', 'b')]} />);
    expect(
      screen.getAllByRole('status').map((el) => el.className.includes('ui-toast--info')),
    ).toEqual([true, false]);
  });
});

describe('ToastStack, auto-hide and close', () => {
  it('hides a success toast after 5 s, fading out first', () => {
    vi.useFakeTimers();
    render(<Harness initial={[toast('success')]} />);
    advance(4999);
    expect(screen.getByRole('status').className).not.toContain('ui-toast--leaving');
    advance(1);
    expect(screen.getByRole('status').className).toContain('ui-toast--leaving');
    advance(150);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides an info toast after 5 s', () => {
    vi.useFakeTimers();
    render(<Harness initial={[toast('info')]} />);
    advance(5000);
    advance(150);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('removes the toast at exactly 5 s under reduced motion, with no fade', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    render(<Harness initial={[toast('success')]} />);
    advance(4999);
    expect(screen.getByRole('status')).toBeTruthy();
    advance(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps error and warning toasts until they are closed', () => {
    vi.useFakeTimers();
    render(<Harness initial={[toast('error'), toast('warning')]} />);
    advance(60_000);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('closes from the close button after the fade, or at once under reduced motion', () => {
    vi.useFakeTimers();
    const first = render(<Harness initial={[toast('error')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('alert').className).toContain('ui-toast--leaving');
    advance(150);
    expect(screen.queryByRole('alert')).toBeNull();
    first.unmount();

    setReducedMotion(true);
    render(<Harness initial={[toast('error')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('times each toast from its own arrival', () => {
    vi.useFakeTimers();
    render(<Harness initial={[toast('success', 'first')]} />);
    advance(3000);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    advance(2000);
    advance(150);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('ToastStack, reduced motion', () => {
  it('adds the fade class when motion is allowed', () => {
    setReducedMotion(false);
    render(<Harness initial={[toast('success')]} />);
    expect(screen.getByRole('status').className).toContain('ui-toast--fade');
  });

  it('adds the fade class when the browser reports no preference API at all', () => {
    render(<Harness initial={[toast('success')]} />);
    expect(screen.getByRole('status').className).toContain('ui-toast--fade');
  });

  it('drops the fade class under prefers-reduced-motion', () => {
    setReducedMotion(true);
    render(<Harness initial={[toast('success')]} />);
    expect(screen.getByRole('status').className).not.toContain('ui-toast--fade');
  });
});
