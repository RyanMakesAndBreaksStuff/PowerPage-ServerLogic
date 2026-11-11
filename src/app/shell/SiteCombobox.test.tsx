// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteCombobox } from './SiteCombobox';
import type { SiteComboboxProps, SiteOption } from './SiteCombobox';

const OPTIONS: readonly SiteOption[] = [
  { id: 'a', label: 'Alpha portal', detail: 'alpha.example.com', disabled: false },
  { id: 'r', label: 'Retired portal', detail: 'retired.example.com', disabled: true },
  { id: 'b', label: 'Beta portal', detail: 'beta.example.com', disabled: false },
];

function mount(props: Partial<SiteComboboxProps> = {}) {
  const onSelect = vi.fn<(id: string) => void>();
  const user = userEvent.setup();
  render(
    <SiteCombobox
      label="Power Pages site"
      placeholder="No site selected"
      options={OPTIONS}
      selectedId={null}
      unavailableReason={null}
      onSelect={onSelect}
      {...props}
    />,
  );
  const combobox = screen.getByRole('combobox', { name: 'Power Pages site' });
  return { onSelect, user, combobox };
}

const optionNamed = (name: RegExp) => screen.getByRole('option', { name });
const active = (combobox: HTMLElement) => combobox.getAttribute('aria-activedescendant');

describe('SiteCombobox (APG select-only combobox)', () => {
  it('starts collapsed with the placeholder, a listbox popup and nothing selected', async () => {
    const { combobox, user } = mount();
    expect(combobox.textContent).toBe('No site selected');
    expect(combobox.getAttribute('aria-haspopup')).toBe('listbox');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();
    combobox.focus();
    await user.keyboard('{Enter}');
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('aria-selected')).toBe('false');
    }
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
    ['Down Arrow', '{ArrowDown}'],
    ['Alt+Down Arrow', '{Alt>}{ArrowDown}{/Alt}'],
  ])('opens with %s', async (_name, keys) => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard(keys);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: 'Power Pages site' })).toBeTruthy();
    expect(combobox.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  });

  it('lists inactive sites disabled and labelled "Inactive", and highlights the first active one', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    const retired = optionNamed(/Retired portal/);
    expect(retired.getAttribute('aria-disabled')).toBe('true');
    expect(within(retired).getByText('Inactive')).toBeTruthy();
    expect(optionNamed(/Alpha portal/).getAttribute('aria-disabled')).toBeNull();
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
  });

  it('moves the highlight with arrows, Home and End, and never wraps', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    expect(active(combobox)).toBe(optionNamed(/Retired portal/).id);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
    await user.keyboard('{Home}');
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
    await user.keyboard('{ArrowUp}');
    expect(active(combobox)).toBe(optionNamed(/Alpha portal/).id);
    await user.keyboard('{End}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it('opens on the last option with End', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('{End}');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
    ['Alt+Up Arrow', '{Alt>}{ArrowUp}{/Alt}'],
  ])('commits the highlighted active option with %s and closes', async (_name, keys) => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{End}');
    await user.keyboard(keys);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(combobox);
  });

  it('does not commit an inactive option, and stays open', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
  });

  it('commits on Tab only after the highlight was moved', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{Tab}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    combobox.focus();
    await user.keyboard('{Enter}{End}{Tab}');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('cancels with Escape and selects nothing', async () => {
    const { combobox, onSelect, user } = mount();
    combobox.focus();
    await user.keyboard('{Enter}{End}{Escape}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(combobox.textContent).toBe('No site selected');
  });

  it('moves the highlight by type-ahead, opening the list if needed', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('be');
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
  });

  it('reaches an inactive option by type-ahead so it can be read', async () => {
    const { combobox, user } = mount();
    combobox.focus();
    await user.keyboard('r');
    expect(active(combobox)).toBe(optionNamed(/Retired portal/).id);
  });

  it('commits an active option by click and ignores an inactive one', async () => {
    const { combobox, onSelect, user } = mount();
    await user.click(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    await user.click(optionNamed(/Retired portal/));
    expect(onSelect).not.toHaveBeenCalled();
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    await user.click(optionNamed(/Beta portal/));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a press outside and on blur, without committing', async () => {
    const { combobox, onSelect, user } = mount();
    await user.click(combobox);
    fireEvent.pointerDown(document.body);
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    combobox.focus();
    await user.keyboard('{Enter}{End}');
    fireEvent.blur(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the selected site, opens on it and marks it selected', async () => {
    const { combobox, onSelect, user } = mount({ selectedId: 'b' });
    expect(combobox.textContent).toBe('Beta portal');
    expect(combobox.getAttribute('title')).toBe('Beta portal');
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(optionNamed(/Beta portal/).getAttribute('aria-selected')).toBe('true');
    expect(active(combobox)).toBe(optionNamed(/Beta portal/).id);
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('is unavailable with a reason on focus: it does not open and explains itself', async () => {
    const { combobox, onSelect, user } = mount({ unavailableReason: 'Loading sites…' });
    expect(combobox.getAttribute('aria-disabled')).toBe('true');
    await user.click(combobox);
    await user.keyboard('{Enter}{ArrowDown}');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
    const reason = screen.getByRole('tooltip');
    expect(reason.textContent).toBe('Loading sites…');
    expect(combobox.getAttribute('aria-describedby')).toBe(reason.id);
  });

  it('stays closed when there are no options', async () => {
    const { combobox, user } = mount({ options: [] });
    combobox.focus();
    await user.keyboard('{Enter}');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SiteCombobox: a selection the options do not carry', () => {
  it('falls back to the placeholder (D-19 C clears such a selection in the store, so this is a guard)', () => {
    expect(mount({ selectedId: 'gone' }).combobox.textContent).toBe('No site selected');
  });
});
