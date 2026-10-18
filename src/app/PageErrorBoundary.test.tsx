// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageErrorBoundary } from '@/app/PageErrorBoundary';

afterEach(cleanup);

function Broken(): never {
  throw new Error('not implemented: phase 07');
}

describe('PageErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <PageErrorBoundary label="Logic Starter">
        <p>fine</p>
      </PageErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });

  it('shows a plain fallback, with no error text, when a page throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <PageErrorBoundary label="Logic Starter">
        <Broken />
      </PageErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe("Logic Starter couldn't load. Close and reopen the tool.");
    expect(alert.textContent).not.toContain('phase 07');
  });
});
