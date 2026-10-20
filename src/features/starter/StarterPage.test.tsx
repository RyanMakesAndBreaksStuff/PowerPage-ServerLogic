import { act, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StarterPage } from './StarterPage';
import { renderStarter } from './starterTestHarness';

// Scoped to their tiles, so the code panes' own pills and text (Phase 21) never match.
const methodTile = (): HTMLElement => screen.getByRole('region', { name: 'HTTP method' });
const radio = (name: string): HTMLElement => within(methodTile()).getByRole('radio', { name });
const nameInput = (): HTMLElement => screen.getByRole('textbox', { name: 'Logic name' });
const readiness = (): HTMLElement => screen.getByRole('region', { name: 'Readiness' });
const ring = (label: string): HTMLElement => within(readiness()).getByRole('img', { name: label });

async function pickRecipe(user: UserEvent, name: RegExp): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: 'Recipe' }));
  await user.click(screen.getByRole('option', { name }));
}

describe('StarterPage input tiles (Phase 18)', () => {
  it('shows the four input tiles (AC-2.1)', () => {
    renderStarter(<StarterPage />);
    for (const name of ['Logic name', 'HTTP method', 'Recipe', 'Readiness']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('10 recipes');
  });

  it('slugifies the name into the file line and warns about shared slugs (AC-2.2, AC-2.3, AC-2.11)', async () => {
    const { user } = renderStarter(<StarterPage />);
    expect(nameInput()).toHaveValue('customer-summary');
    expect(nameInput()).toHaveAccessibleDescription('File customer-summary.js');
    await user.clear(nameInput());
    await user.type(nameInput(), 'Customer Summary!');
    expect(nameInput()).toHaveAccessibleDescription(
      "File customer-summary.js Different names can produce the same slug, and so the same endpoint. Check that customer-summary isn't already used on your site.",
    );
    await user.clear(nameInput());
    expect(nameInput()).toHaveAccessibleDescription(/^File untitled\.js /);
  });

  it('shows five method pills and explains the disabled ones (AC-2.5, AC-2.6, AC-2.10)', () => {
    renderStarter(<StarterPage />);
    const group = screen.getByRole('radiogroup', { name: 'HTTP method' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(radio('POST')).toHaveAttribute('aria-disabled', 'true');
    expect(radio('POST')).toHaveAccessibleDescription(
      "Read Dataverse records doesn't export post()",
    );
    act(() => {
      radio('POST').focus();
    });
    expect(
      screen.getByRole('tooltip', { name: "Read Dataverse records doesn't export post()" }),
    ).toHaveAttribute('data-visible', 'true');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Exports function get()',
    );
  });

  it('lists every function of a multi-function recipe and marks the targeted one (AC-2.6, AC-3.4)', async () => {
    const { user } = renderStarter(<StarterPage />);
    await pickRecipe(user, /^Dataverse CRUD/);
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(radio('PATCH')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Exports function get() function post() function put() function del()',
    );
    expect(within(methodTile()).getByText('function get()')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await user.click(radio('PUT'));
    expect(within(methodTile()).getByText('function put()')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(methodTile()).getByText('function get()')).not.toHaveAttribute('aria-current');
  });

  it('disables every method for R8 and says Liquid only (AC-2.10, AC-3.8)', async () => {
    const { user } = renderStarter(<StarterPage />);
    await pickRecipe(user, /^Invoke from Liquid/);
    for (const r of within(methodTile()).getAllByRole('radio')) {
      expect(r).toHaveAttribute('aria-disabled', 'true');
      expect(r).toHaveAttribute('aria-checked', 'false');
    }
    expect(radio('GET')).toHaveAccessibleDescription('Liquid only: not callable over HTTP');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Liquid only · Exports function getSummary()',
    );
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('Uses Server.Context');
  });

  it('asks before a recipe change discards edits; Cancel keeps both (AC-2.9)', async () => {
    const h = renderStarter(<StarterPage />);
    h.dispatch({ type: 'editServer', text: 'function get() { return "mine"; }', cursor: null });
    await pickRecipe(h.user, /^Validate a request/);
    const dialog = screen.getByRole('dialog', { name: 'Discard your edits?' });
    expect(dialog).toHaveTextContent(
      'Switching to Validate a request regenerates the handler and discards your edits to customer-summary.js.',
    );
    await h.user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.session().state.recipe).toBe('R1');
    expect(h.session().state.serverText).toBe('function get() { return "mine"; }');
    await pickRecipe(h.user, /^Validate a request/);
    await h.user.click(screen.getByRole('button', { name: 'Discard edits' }));
    expect(h.session().state.recipe).toBe('R2');
    expect(h.session().derived.edited).toBe(false);
  });

  it('changes recipe without asking once the text is back to the generated text (AC-2.9)', async () => {
    const h = renderStarter(<StarterPage />);
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    h.dispatch({ type: 'editServer', text: h.session().state.generatedText, cursor: null });
    await pickRecipe(h.user, /^Validate a request/);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.session().state.recipe).toBe('R2');
  });

  it('shows K/3 with the three readiness items (AC-5.1, AC-5.2 state)', () => {
    const h = renderStarter(<StarterPage />);
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(readiness()).toHaveTextContent('2/3ready');
    const badge = (label: string): string | null | undefined =>
      within(readiness())
        .getByText(label)
        .querySelector('[data-glyph]')
        ?.getAttribute('data-glyph');
    expect([badge('Browser checks'), badge('Validation'), badge('Permissions')]).toEqual([
      'ok',
      'ok',
      'review',
    ]);
    h.dispatch({ type: 'editServer', text: 'eval("x");', cursor: null });
    expect(ring('1 of 3 ready')).toBeInTheDocument();
    expect(badge('Browser checks')).toBe('review');
  });

  it('explains that edited validation is not rechecked (AC-5.3)', () => {
    const h = renderStarter(<StarterPage />);
    expect(screen.queryByRole('button', { name: 'About validation' })).toBeNull();
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    expect(screen.getByRole('button', { name: 'About validation' })).toHaveAccessibleDescription(
      "Generated validation; edits aren't rechecked.",
    );
  });
});

describe('StarterPage note and actions (Phase 18)', () => {
  it('shows the recipe permission note and its checklist (AC-5.5, AC-3.6, AC-5.4 label)', () => {
    renderStarter(<StarterPage />);
    const note = screen.getByRole('region', { name: 'Permissions note' });
    expect(note).toHaveTextContent(
      "Grant Read on contact with Account access to the caller's web role, then validate on your development site.",
    );
    expect(within(note).getByText('contact').tagName).toBe('CODE');
    expect(note).toHaveTextContent(
      "For the Read Dataverse records recipe. Review anything you've added.",
    );
    expect(note).toHaveTextContent(
      'Table permission: contact (entity set contacts): Read, access type Account',
    );
  });

  it('marks and undoes the review, tied to the reviewed text (AC-5.4)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.click(screen.getByRole('button', { name: 'Mark checklist reviewed' }));
    expect(ring('3 of 3 ready')).toBeInTheDocument();
    h.dispatch({
      type: 'editServer',
      text: `${h.session().state.serverText}// note\n`,
      cursor: null,
    });
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark checklist reviewed' })).toBeInTheDocument();
    h.dispatch({ type: 'editServer', text: h.session().state.generatedText, cursor: null });
    expect(ring('3 of 3 ready')).toBeInTheDocument();
    await h.user.click(screen.getByRole('button', { name: 'Undo review' }));
    expect(ring('2 of 3 ready')).toBeInTheDocument();
  });

  it('Start over resets every input to the defaults (AC-5.9)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.clear(nameInput());
    await h.user.type(nameInput(), 'Orders');
    await pickRecipe(h.user, /^Dataverse CRUD/);
    await h.user.click(radio('PUT'));
    await h.user.click(screen.getByRole('button', { name: 'Mark checklist reviewed' }));
    await h.user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(nameInput()).toHaveValue('customer-summary');
    expect(screen.getByRole('combobox', { name: 'Recipe' })).toHaveValue('Read Dataverse records');
    expect(radio('GET')).toHaveAttribute('aria-checked', 'true');
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(h.session().state.language).toBe('fetch');
  });
});
