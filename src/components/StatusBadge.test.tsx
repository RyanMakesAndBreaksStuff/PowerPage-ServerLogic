// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

afterEach(cleanup);

// The CheckStatus mapping and its rendered badges are tested with checkStatusBadge in features/inspector.
describe('StatusBadge', () => {
  it('uses a different glyph for ok and review', () => {
    const ok = render(<StatusBadge kind="ok" label="Browser checks" />)
      .container.querySelector('path')
      ?.getAttribute('d');
    const review = render(<StatusBadge kind="review" label="Permissions" />)
      .container.querySelector('path')
      ?.getAttribute('d');
    expect(ok).toBeTruthy();
    expect(review).toBeTruthy();
    expect(ok).not.toBe(review);
  });

  it('colours ok with the primary tone and review with the needs-review tone', () => {
    const ok = render(<StatusBadge kind="ok" label="Validation" />).container.firstElementChild;
    const review = render(<StatusBadge kind="review" label="Permissions" />).container
      .firstElementChild;
    expect(ok?.className).toContain('ui-pill--ok');
    expect(review?.className).toContain('ui-pill--review');
  });
});
