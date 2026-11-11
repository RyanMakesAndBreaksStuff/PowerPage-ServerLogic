import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpMethod } from '@/types/http';
import { describe, expect, it, vi } from 'vitest';
import { RecipeCombobox } from './RecipeCombobox';

type MountOptions = {
  methodFilter?: HttpMethod | null;
};

function Harness({
  methodFilter,
  onSelect,
}: {
  methodFilter: HttpMethod | null;
  onSelect: () => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  return (
    <RecipeCombobox
      value="R1"
      methodFilter={methodFilter}
      query={query}
      onQueryChange={setQuery}
      onSelect={onSelect}
    />
  );
}

function mount({ methodFilter = null }: MountOptions = {}) {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<Harness methodFilter={methodFilter} onSelect={onSelect} />);
  return { user, onSelect, input: screen.getByRole('combobox', { name: 'Recipe' }) };
}

const optionNames = (): string[] =>
  screen.queryAllByRole('option').map((o) => o.textContent.replace(/Server\..*$/, '').trim());

function activeOption(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant');
  return id === null ? null : document.getElementById(id);
}

describe('RecipeCombobox (AC-3.1, APG combobox)', () => {
  it('shows the selected recipe and starts closed', () => {
    const { input } = mount();
    expect(input).toHaveValue('Read Dataverse records');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lists the ten recipes with their objects under three groups', async () => {
    const { user, input } = mount();
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const group = (name: string): string[] =>
      within(screen.getByRole('group', { name }))
        .getAllByRole('option')
        .map((o) => o.textContent);
    expect(group('Core')).toEqual([
      'Read Dataverse records Server.Connector.Dataverse',
      'Validate a request Server.Context',
      'Call an external API Server.Connector.HttpClient',
    ]);
    expect(group('Learn tutorials')).toHaveLength(4);
    expect(group('Learn reference samples')).toEqual([
      'Invoke from Liquid Server.Context',
      'Trigger a cloud flow Server.Connector.CloudFlow',
      'Call a Dataverse custom API Server.Connector.Dataverse',
    ]);
  });

  it('filters by recipe name or object, ignoring case', async () => {
    const { user, input } = mount();
    await user.clear(input);
    await user.type(input, 'crud');
    expect(optionNames()).toEqual(['Dataverse CRUD', 'External service CRUD']);
    await user.clear(input);
    await user.type(input, 'CLOUDFLOW');
    expect(optionNames()).toEqual(['Trigger a cloud flow']);
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(optionNames()).toEqual([]);
    expect(screen.getByText('No recipes match')).toBeInTheDocument();
  });

  it('moves with the arrow keys, wraps, and selects with Enter', async () => {
    const { user, input, onSelect } = mount();
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Read Dataverse records');
    expect(activeOption(input)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Validate a request');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(activeOption(input)).toHaveTextContent('Call a Dataverse custom API');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('R10');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes with Esc or on blur without selecting, and restores the name', async () => {
    const { user, input, onSelect } = mount();
    await user.clear(input);
    await user.type(input, 'flow');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Read Dataverse records');
    await user.click(input);
    await user.tab();
    await user.tab();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('scrolls the keyboard-active option into view and selects it with Enter', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    try {
      const { user, input, onSelect } = mount();
      await user.click(input);
      for (let i = 0; i < 9; i += 1) await user.keyboard('{ArrowDown}');
      const active = activeOption(input);
      expect(active).toHaveTextContent('Call a Dataverse custom API');
      expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
      await user.keyboard('{ArrowDown}');
      expect(activeOption(input)).not.toHaveTextContent('Call a Dataverse custom API');
      await user.keyboard('{ArrowUp}');
      expect(activeOption(input)).toHaveTextContent('Call a Dataverse custom API');
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledWith('R10');
    } finally {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      } else {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalDescriptor);
      }
    }
  });

  it('combines method and text filters', async () => {
    const { user, input } = mount({ methodFilter: 'PATCH' });
    await user.click(input);
    expect(optionNames()).toEqual(['Call a Dataverse custom API']);
    await user.clear(input);
    await user.type(input, 'cloudflow');
    expect(optionNames()).toEqual([]);
    expect(screen.getByText('No recipes match')).toBeInTheDocument();
  });

  it('opens and closes through an accessible real chevron toggle', async () => {
    const { user, input, onSelect } = mount();
    const toggle = screen.getByRole('button', { name: 'Toggle recipes' });
    await user.click(toggle);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Recipes' })).toBeVisible();
    await user.click(toggle);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects an option and dismisses by Escape or outside pointer without selection', async () => {
    const { user, input, onSelect } = mount();
    const toggle = screen.getByRole('button', { name: 'Toggle recipes' });
    await user.click(toggle);
    await user.click(screen.getByRole('option', { name: /^Dataverse CRUD/ }));
    expect(onSelect).toHaveBeenCalledWith('R4');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    onSelect.mockClear();
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects an option on click', async () => {
    const { user, input, onSelect } = mount();
    await user.click(input);
    await user.click(screen.getByRole('option', { name: /^Dataverse CRUD/ }));
    expect(onSelect).toHaveBeenCalledWith('R4');
    expect(input).toHaveFocus();
  });
});
