import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecipeCombobox } from './RecipeCombobox';

function mount() {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<RecipeCombobox value="R1" onSelect={onSelect} />);
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
