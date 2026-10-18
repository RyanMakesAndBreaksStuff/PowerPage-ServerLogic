// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Pill } from './Pill';

afterEach(cleanup);

describe('Pill', () => {
  it('is a neutral capsule by default', () => {
    render(<Pill>fetch()</Pill>);
    expect(screen.getByText('fetch()').className).toBe('ui-pill ui-pill--neutral');
  });

  it('applies tone, compact and mono and passes other attributes through', () => {
    render(
      <Pill tone="review" compact mono title="Needs review">
        ! Permissions
      </Pill>,
    );
    const pill = screen.getByText('! Permissions');
    expect(pill.className).toBe('ui-pill ui-pill--review ui-pill--compact ui-pill--mono');
    expect(pill.getAttribute('title')).toBe('Needs review');
  });
});
