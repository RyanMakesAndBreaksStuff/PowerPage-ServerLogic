// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { HostContext } from '@/session/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { FAKE_STARTER_DEPS } from './fakeStarterDeps';
import { LIQUID_RESET_NOTICE } from './starterReducer';
import { StarterSessionProvider } from './StarterSessionProvider';
import { useStarterSession } from '@/session/useStarterSession';

afterEach(cleanup);

function Probe(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  return (
    <div>
      <p>{`${derived.slug} ${state.language} ${String(derived.ready)}/3`}</p>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'setName', name: 'Orders' });
        }}
      >
        rename
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'setLanguage', language: 'liquid' });
        }}
      >
        liquid
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'editServer', text: 'const b = Server.Context.Body;', cursor: null });
        }}
      >
        read body
      </button>
    </div>
  );
}

function mount() {
  const host = createFakeHost();
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <StarterSessionProvider deps={FAKE_STARTER_DEPS}>
          <Probe />
        </StarterSessionProvider>
      </NotifyProvider>
    </HostContext>,
  );
  return host;
}

describe('StarterSessionProvider', () => {
  it('provides state, dispatch and derived values', () => {
    mount();
    expect(screen.getByText('customer-summary fetch 2/3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'rename' }));
    expect(screen.getByText('orders fetch 2/3')).toBeTruthy();
  });

  it('sends the Liquid reset notice once through useNotify and clears it (AC-4.7)', async () => {
    const host = mount();
    fireEvent.click(screen.getByRole('button', { name: 'liquid' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'read body' }));
      await Promise.resolve();
    });
    expect(screen.getByText('customer-summary fetch 2/3')).toBeTruthy();
    expect(host.callsOf('notify')).toEqual([{ method: 'notify', notice: LIQUID_RESET_NOTICE }]);
  });

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(
      'useStarterSession must be used inside StarterSessionProvider',
    );
  });

  it('renders server text holding a 10 000-segment member chain without throwing', () => {
    const longChain = `Server.Connector${'.a'.repeat(9998)};`;
    const deps = {
      ...FAKE_STARTER_DEPS,
      generateHandler: () => ({ text: longChain, highlightLines: [] }),
    };
    expect(() =>
      render(
        <HostContext value={createFakeHost()}>
          <NotifyProvider>
            <StarterSessionProvider deps={deps}>
              <Probe />
            </StarterSessionProvider>
          </NotifyProvider>
        </HostContext>,
      ),
    ).not.toThrow();
    expect(screen.getByText('customer-summary fetch 2/3')).toBeTruthy();
  });
});
