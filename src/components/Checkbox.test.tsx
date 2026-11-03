// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

afterEach(cleanup);

const REASON = 'Wait for the export to finish, or close this dialog.';

function Harness({
  initial = false,
  disabledReason,
  onChange,
}: {
  initial?: boolean;
  disabledReason?: string | null;
  onChange?: (checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <Checkbox
      label="Questions to consider"
      checked={checked}
      {...(disabledReason === undefined ? {} : { disabledReason })}
      onChange={(next) => {
        setChecked(next);
        onChange?.(next);
      }}
    />
  );
}

function box(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('checkbox', { name: 'Questions to consider' });
}

describe('Checkbox', () => {
  it('is a labelled checkbox that reflects checked', () => {
    const first = render(<Harness initial />);
    expect(box().checked).toBe(true);
    expect(box().closest('label')?.className).toContain('ui-checkbox');
    first.unmount();
    render(<Harness initial={false} />);
    expect(box().checked).toBe(false);
    expect(box().getAttribute('aria-disabled')).toBeNull();
  });

  it('toggles on click and on Space and reports the new value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={false} onChange={onChange} />);
    await user.click(box());
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(box().checked).toBe(true);
    box().focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(box().checked).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('Checkbox, blocked (F47)', () => {
  it('marks a blocked checkbox aria-disabled but leaves it focusable and described by its reason', () => {
    render(<Harness disabledReason={REASON} />);
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(box().getAttribute('aria-disabled')).toBe('true');
    expect(box().hasAttribute('disabled')).toBe(false);
    expect(box().getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe(REASON);
    box().focus();
    expect(document.activeElement).toBe(box());
  });

  it('never toggles a blocked checkbox by click or Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial disabledReason={REASON} onChange={onChange} />);
    await user.click(box());
    box().focus();
    await user.keyboard(' ');
    expect(onChange).not.toHaveBeenCalled();
    expect(box().checked).toBe(true);
  });

  it('shows the reason on hover and focus and hides it when they end', () => {
    render(<Harness disabledReason={REASON} />);
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.mouseEnter(box());
    expect(tip.getAttribute('data-visible')).toBe('true');
    fireEvent.mouseLeave(box());
    expect(tip.getAttribute('data-visible')).toBe('false');
    fireEvent.focus(box());
    expect(tip.getAttribute('data-visible')).toBe('true');
    fireEvent.blur(box());
    expect(tip.getAttribute('data-visible')).toBe('false');
  });
});
