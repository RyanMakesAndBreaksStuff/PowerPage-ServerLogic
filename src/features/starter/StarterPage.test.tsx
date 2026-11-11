// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { recipeCountLabel } from './inputs/starterOptions';
import { StarterPage } from './StarterPage';
import { editorView, renderStarter } from '@/test/starterTestHarness';

// Scoped to their tiles, so the code panes' own pills and text never match.
const methodTile = (): HTMLElement => screen.getByRole('region', { name: 'HTTP method' });
const radio = (name: string): HTMLElement => within(methodTile()).getByRole('radio', { name });
const nameInput = (): HTMLElement => screen.getByRole('textbox', { name: 'Logic name' });
const readiness = (): HTMLElement => screen.getByRole('region', { name: 'Readiness' });
const ring = (label: string): HTMLElement => within(readiness()).getByRole('img', { name: label });

async function pickRecipe(user: UserEvent, name: RegExp): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: 'Recipe' }));
  await user.click(screen.getByRole('option', { name }));
}

describe('StarterPage input tiles', () => {
  it('shows the four input tiles (AC-2.1)', () => {
    renderStarter(<StarterPage />);
    for (const name of ['Logic name', 'HTTP method', 'Recipe', 'Readiness']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('10 recipes');
  });

  it('keeps both R7 editors focusable and every checklist item mounted when expanded', async () => {
    const h = renderStarter(<StarterPage />);
    await pickRecipe(h.user, /Microsoft Graph & SharePoint/);
    await h.user.click(screen.getByText('View checklist', { exact: true }));

    const note = screen.getByRole('region', { name: 'Permissions note' });
    const list = within(note).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).getByText(/Hold the client secret/)).toBeInTheDocument();

    const server = editorView('Server code');
    server.focus();
    expect(server.hasFocus).toBe(true);
    const client = editorView('Client call code');
    client.focus();
    expect(client.hasFocus).toBe(true);
  });

  it.each(['R1', 'R8'] as const)(
    'omits the request-path strip for %s and retains both code panes',
    async (recipe) => {
      const h = renderStarter(<StarterPage />);
      if (recipe === 'R8') await pickRecipe(h.user, /Invoke from Liquid/);

      expect(screen.queryByRole('region', { name: 'Request path' })).not.toBeInTheDocument();
      for (const label of ['Page script', 'Token', 'Endpoint', 'Handler', 'Returns']) {
        expect(screen.queryByText(label, { exact: true })).not.toBeInTheDocument();
      }
      expect(screen.getByRole('textbox', { name: 'Server code' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Client call code' })).toBeInTheDocument();
    },
  );

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

  it('offers five enabled method filters, initially with no filter selected', async () => {
    const h = renderStarter(<StarterPage />);
    expect(within(methodTile()).getAllByRole('radio').map((pill) => pill.textContent)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
    for (const pill of within(methodTile()).getAllByRole('radio')) {
      expect(pill).not.toHaveAttribute('aria-disabled', 'true');
      expect(pill).toHaveAttribute('aria-checked', 'false');
    }
    await h.user.click(radio('POST'));
    expect(radio('POST')).toHaveAttribute('aria-checked', 'true');
    expect(h.session().state.method).toBe('GET');
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Exports function get()',
    );
  });

  it('keeps the R4 handler method and export target when the PUT filter changes', async () => {
    const h = renderStarter(<StarterPage />);
    await pickRecipe(h.user, /^Dataverse CRUD/);
    expect(h.session().state.method).toBe('GET');
    await h.user.click(radio('PUT'));
    expect(radio('PUT')).toHaveAttribute('aria-checked', 'true');
    expect(h.session().state.method).toBe('GET');
    expect(within(methodTile()).getByText('function get()')).toHaveAttribute('aria-current', 'true');
    expect(within(methodTile()).getByText('function put()')).not.toHaveAttribute('aria-current');
  });

  it('keeps every HTTP filter enabled for R8', async () => {
    const h = renderStarter(<StarterPage />);
    await pickRecipe(h.user, /^Invoke from Liquid/);
    for (const pill of within(methodTile()).getAllByRole('radio')) {
      expect(pill).not.toHaveAttribute('aria-disabled', 'true');
      expect(pill).toHaveAttribute('aria-checked', 'false');
    }
    expect(screen.getByRole('region', { name: 'HTTP method' })).toHaveTextContent(
      'Liquid only · Exports function getSummary()',
    );
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

  it('applies the filter when reselecting the loaded recipe without discarding edits', async () => {
    const h = renderStarter(<StarterPage />);
    await pickRecipe(h.user, /^Dataverse CRUD/);
    const text = `${h.session().state.serverText}\n// retained edit`;
    h.dispatch({ type: 'editServer', text, cursor: null });
    await h.user.click(radio('PUT'));
    await h.user.click(screen.getByRole('combobox', { name: 'Recipe' }));
    await h.user.click(screen.getByRole('option', { name: /^Dataverse CRUD/ }));
    expect(h.session().state.method).toBe('PUT');
    expect(h.session().state.serverText).toBe(text);
    expect(screen.queryByRole('dialog', { name: 'Discard your edits?' })).not.toBeInTheDocument();
  });

  it('filters recipes without changing session state until a confirmed selection', async () => {
    const h = renderStarter(<StarterPage />);
    const before = h.session().state;
    const editedText = `${before.serverText}// note\n`;
    h.dispatch({ type: 'editServer', text: editedText, cursor: null });
    await h.user.click(radio('POST'));
    expect(radio('POST')).toHaveAttribute('aria-checked', 'true');
    expect(h.session().state.method).toBe(before.method);
    expect(h.session().state.serverText).toBe(editedText);

    const input = screen.getByRole('combobox', { name: 'Recipe' });
    await h.user.click(input);
    expect(screen.queryAllByRole('option').length).toBeGreaterThan(0);
    await h.user.clear(input);
    await h.user.type(input, 'api');
    const filteredCount = screen.queryAllByRole('option').length;
    expect(filteredCount).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent(
      recipeCountLabel(filteredCount),
    );
    await h.user.clear(input);
    await h.user.click(screen.getByRole('button', { name: 'Clear method filter' }));
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('10 recipes');
    await h.user.click(input);
    expect(screen.getByRole('option', { name: /^Invoke from Liquid/ })).toBeInTheDocument();
    await h.user.keyboard('{Escape}');

    await h.user.click(radio('PATCH'));
    await h.user.click(input);
    await h.user.click(screen.getByRole('option', { name: /^Call a Dataverse custom API/ }));
    expect(screen.getByRole('dialog', { name: 'Discard your edits?' })).toBeInTheDocument();
    expect(h.session().state.recipe).toBe(before.recipe);
    expect(h.session().state.method).toBe(before.method);
    expect(h.session().state.serverText).toBe(editedText);
    await h.user.click(screen.getByRole('button', { name: 'Discard edits' }));
    expect(h.session().state.recipe).toBe('R10');
    expect(h.session().state.method).toBe('PATCH');
    expect(h.session().state.serverText).toBe(h.session().state.generatedText);
  });

  it('explains on the Validation pill that edited validation is not rechecked (AC-5.3)', () => {
    const h = renderStarter(<StarterPage />);
    const pill = (): HTMLElement => within(readiness()).getByText('Validation');
    expect(within(pill()).queryByRole('button', { name: 'About validation' })).toBeNull();
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    expect(
      within(pill()).getByRole('button', { name: 'About validation' }),
    ).toHaveAccessibleDescription("Generated validation; edits aren't rechecked.");
  });
});

describe('StarterPage note and actions', () => {
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
    expect(radio('GET')).toHaveAttribute('aria-checked', 'false');
    expect(h.session().state.method).toBe('GET');
    expect(h.session().state.recipeMethodFilter).toBeNull();
    expect(ring('2 of 3 ready')).toBeInTheDocument();
    expect(h.session().state.language).toBe('fetch');
  });

  it('opens Server Objects from "Browse all in Server Objects" (AC-6.10)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.click(screen.getByRole('button', { name: 'Browse all in Server Objects' }));
    expect(h.views).toEqual(['objects']);
  });
});
