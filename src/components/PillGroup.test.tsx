// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PillGroup } from './PillGroup';
import type { PillOption } from './PillGroup';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const PATCH_REASON = "Delete a record doesn't export `patch()`";
const OPTIONS: readonly PillOption<Method>[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH', disabledReason: PATCH_REASON },
  { value: 'DELETE', label: 'DELETE' },
];

function Harness({
  initial,
  onChange,
}: {
  initial: Method | null;
  onChange?: (value: Method) => void;
}) {
  const [value, setValue] = useState<Method | null>(initial);
  return (
    <PillGroup
      label="HTTP method"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function radio(name: string): HTMLElement {
  return screen.getByRole('radio', { name });
}

describe('PillGroup, APG radio group', () => {
  it('is a named radiogroup that shows all five options with aria-checked', () => {
    render(<Harness initial="GET" />);
    expect(screen.getByRole('radiogroup', { name: 'HTTP method' })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
    expect(radio('GET').getAttribute('aria-checked')).toBe('true');
    expect(radio('POST').getAttribute('aria-checked')).toBe('false');
    expect(radio('GET').className).toContain('ui-pill--selected');
  });

  it('uses a roving tabindex: only the checked option is in the tab order', () => {
    render(<Harness initial="POST" />);
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
      '-1',
      '-1',
    ]);
  });

  it('puts the first enabled option in the tab order when nothing is checked', () => {
    render(<Harness initial={null} />);
    expect(radio('GET').getAttribute('tabindex')).toBe('0');
  });

  it('moves focus and selection with the arrow keys and wraps at both ends', () => {
    const onChange = vi.fn();
    render(<Harness initial="GET" onChange={onChange} />);
    fireEvent.keyDown(radio('GET'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio('POST'));
    expect(radio('POST').getAttribute('aria-checked')).toBe('true');
    expect(radio('GET').getAttribute('aria-checked')).toBe('false');
    expect(onChange).toHaveBeenLastCalledWith('POST');
    fireEvent.keyDown(radio('POST'), { key: 'ArrowLeft' });
    fireEvent.keyDown(radio('GET'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(radio('DELETE'));
    fireEvent.keyDown(radio('DELETE'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(radio('GET'));
  });

  it('jumps to the first and last option with Home and End', () => {
    render(<Harness initial="PUT" />);
    fireEvent.keyDown(radio('PUT'), { key: 'End' });
    expect(document.activeElement).toBe(radio('DELETE'));
    fireEvent.keyDown(radio('DELETE'), { key: 'Home' });
    expect(document.activeElement).toBe(radio('GET'));
  });

  it('keeps the roving tab stop on the focused option and returns it to the checked one when focus leaves', () => {
    render(
      <>
        <Harness initial="PUT" />
        <button type="button">outside</button>
      </>,
    );
    fireEvent.keyDown(radio('PUT'), { key: 'ArrowRight' });
    expect(radio('PATCH').getAttribute('tabindex')).toBe('0');
    expect(radio('PUT').getAttribute('tabindex')).toBe('-1');
    // A bare focus() is a native event outside act, so React would flush the blur update after this test reads.
    act(() => {
      screen.getByRole('button', { name: 'outside' }).focus();
    });
    expect(radio('PUT').getAttribute('tabindex')).toBe('0');
    expect(radio('PATCH').getAttribute('tabindex')).toBe('-1');
  });

  it('selects an option on click', () => {
    const onChange = vi.fn();
    render(<Harness initial="GET" onChange={onChange} />);
    fireEvent.click(radio('PUT'));
    expect(onChange).toHaveBeenCalledWith('PUT');
    expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
  });
});

describe('PillGroup, disabled options (F47)', () => {
  it('marks a blocked option aria-disabled but leaves it focusable and described by its reason', () => {
    render(<Harness initial="PUT" />);
    const patch = radio('PATCH');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(patch.getAttribute('aria-disabled')).toBe('true');
    expect(patch.hasAttribute('disabled')).toBe(false);
    expect(patch.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe(PATCH_REASON);
    expect(radio('GET').getAttribute('aria-disabled')).toBeNull();
  });

  it('never selects a blocked option by click', () => {
    const onChange = vi.fn();
    render(<Harness initial="PUT" onChange={onChange} />);
    fireEvent.click(radio('PATCH'));
    expect(onChange).not.toHaveBeenCalled();
    expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
  });

  it('lets arrow keys land on a blocked option without selecting it, and shows its reason on focus', () => {
    const onChange = vi.fn();
    render(<Harness initial="PUT" onChange={onChange} />);
    fireEvent.keyDown(radio('PUT'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio('PATCH'));
    expect(radio('PATCH').getAttribute('aria-checked')).toBe('false');
    expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
    expect(radio('PATCH').getAttribute('tabindex')).toBe('0');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tooltip', { hidden: true }).getAttribute('data-visible')).toBe('true');
    fireEvent.keyDown(radio('PATCH'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio('DELETE'));
    expect(onChange).toHaveBeenCalledWith('DELETE');
  });

  it('shows the reason on hover and hides it when the pointer leaves', () => {
    render(<Harness initial="GET" />);
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.mouseEnter(radio('PATCH'));
    expect(tip.getAttribute('data-visible')).toBe('true');
    fireEvent.mouseLeave(radio('PATCH'));
    expect(tip.getAttribute('data-visible')).toBe('false');
  });
});
