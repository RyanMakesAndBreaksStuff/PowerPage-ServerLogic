import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STARTER_DEPS } from '@/app/starter-session/starterDeps';
import { generateClient } from '@/services/generators/client/client';
import { StarterPage } from '../StarterPage';
import { editorView, renderStarter } from '../starterTestHarness';
import { ClientPane } from './ClientPane';
import { RequestPathStrip } from './RequestPathStrip';

const clientText = (): string => editorView('Client call code').state.doc.toString();
const radio = (name: string): HTMLElement => screen.getByRole('radio', { name });

function Panes() {
  return (
    <>
      <RequestPathStrip />
      <ClientPane />
    </>
  );
}

describe('ClientPane and RequestPathStrip (Phase 21)', () => {
  it('shows the generated client call, read-only, matching the download (AC-4.4, Phase 14 Risk 2)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    const { state, derived } = h.session();
    expect(clientText()).toBe(
      generateClient({
        slug: derived.slug,
        recipe: state.recipe,
        fn: derived.fn,
        method: state.method,
        language: state.language,
      }),
    );
    expect(screen.getByRole('textbox', { name: 'Client call code' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Client call' })).toHaveTextContent(
      "Paste into a page's custom JavaScript",
    );
  });

  it('follows the slug in the endpoint and the client URL (AC-2.4)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    h.dispatch({ type: 'setName', name: 'Orders' });
    expect(clientText()).toContain('/_api/serverlogics/orders');
    expect(screen.getByRole('region', { name: 'Request path' })).toHaveTextContent(
      'Endpoint /_api/serverlogics/orders',
    );
  });

  it('shows the five HTTP steps, or the four Liquid steps (AC-4.8)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    const steps = (): string[] =>
      within(screen.getByRole('region', { name: 'Request path' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(steps()).toEqual([
      'Page script fetch()',
      'Token __RequestVerificationToken',
      'Endpoint /_api/serverlogics/customer-summary',
      'Handler function get()',
      'Returns JSON string',
    ]);
    h.dispatch({ type: 'setLanguage', language: 'liquid' });
    expect(steps()).toEqual([
      'Page render Liquid page',
      'Tag serverlogic',
      'Handler function get()',
      'Returns result object',
    ]);
    expect(screen.getByRole('region', { name: 'Client call' })).toHaveTextContent(
      'Paste into a page or web template',
    );
  });

  it('switches language with the pills and explains a disabled Liquid pill (AC-4.4, AC-4.7)', () => {
    const h = renderStarter(<Panes />, { deps: STARTER_DEPS });
    fireEvent.click(radio('jQuery'));
    expect(h.session().state.language).toBe('jquery');
    expect(clientText()).toContain('shell.ajaxSafePost');
    h.dispatch({ type: 'selectRecipe', recipe: 'R2' });
    expect(radio('Liquid')).toHaveAttribute('aria-disabled', 'true');
    expect(radio('Liquid')).toHaveAccessibleDescription(
      "Liquid can't call this handler: it reads HTTP-only request properties",
    );
  });

  // The 300 ms wall-clock budget is a release-smoke check in PPTB: timing assertions flake under the parallel suite.
  it('updates both panes in the same render as an input change, with no debounce (AC-4.1)', () => {
    renderStarter(<StarterPage />, { deps: STARTER_DEPS });
    act(() => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Logic name' }), {
        target: { value: 'Orders' },
      });
    });
    expect(clientText()).toContain('/_api/serverlogics/orders');
    expect(screen.getByRole('region', { name: 'Server handler' })).toHaveTextContent('orders.js');
  });
});
