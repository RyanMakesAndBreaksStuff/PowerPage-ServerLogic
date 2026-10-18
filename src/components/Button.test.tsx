// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('runs onClick and shows no tooltip when it has no disabled reason', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Copy</Button>);
    const button = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
  });

  it('stays focusable, blocks the click and describes itself when it has a disabled reason', () => {
    const onClick = vi.fn();
    render(
      <Button disabledReason="Select a handler first" onClick={onClick}>
        Insert into handler
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Insert into handler' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe('Select a handler first');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows the reason on hover and on focus and hides it again; Esc dismisses it', () => {
    render(<Button disabledReason="Not available yet">Insert</Button>);
    const button = screen.getByRole('button', { name: 'Insert' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.mouseEnter(button);
    expect(tip.getAttribute('data-visible')).toBe('true');
    fireEvent.mouseLeave(button);
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.focus(button);
    expect(tip.getAttribute('data-visible')).toBe('true');
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.blur(button);
    fireEvent.focus(button);
    expect(tip.getAttribute('data-visible')).toBe('true');
  });

  it('treats an empty reason as no reason', () => {
    const onClick = vi.fn();
    render(
      <Button disabledReason="" onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is natively disabled and busy while its own action runs (F49)', () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Download starter
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Download starter' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the variant and full-width classes', () => {
    render(
      <Button variant="primary" fullWidth>
        Download starter
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Download starter' });
    expect(button.className).toContain('ui-button--primary');
    expect(button.className).toContain('ui-button--block');
    expect(button.parentElement?.className).toContain('ui-reason-anchor--block');
  });
});
