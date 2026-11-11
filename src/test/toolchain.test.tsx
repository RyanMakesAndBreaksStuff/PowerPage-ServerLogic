// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('renders React 19 under jsdom with jest-dom matchers', () => {
    render(<button type="button">Ready</button>);
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument();
  });
});
