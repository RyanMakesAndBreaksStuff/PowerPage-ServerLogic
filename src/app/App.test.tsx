import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/app/App';

describe('App skeleton', () => {
  it('renders the three tabs and three page placeholders without a PPTB host', () => {
    expect('toolboxAPI' in window).toBe(false);

    render(<App />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Logic Starter',
      'Server Objects',
      'Logic Inspector',
    ]);
    expect(screen.getByText('Logic Starter page placeholder')).toBeInTheDocument();
    expect(screen.getByText('Server Objects page placeholder')).toBeInTheDocument();
    expect(screen.getByText('Logic Inspector page placeholder')).toBeInTheDocument();
  });
});
