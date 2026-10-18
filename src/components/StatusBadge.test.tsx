// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CheckStatus } from '@/types/inspector';
import { StatusBadge } from './StatusBadge';
import { checkStatusBadge } from './checkStatusBadge';

afterEach(cleanup);

const CASES: [CheckStatus, string, string][] = [
  ['configured', 'ok', 'Configured'],
  ['reviewed', 'ok', 'Reviewed'],
  ['needs-review', 'review', 'Needs review'],
  ['not-scanned', 'unknown', 'Not scanned'],
];

describe('checkStatusBadge', () => {
  it.each(CASES)('maps %s to the %s badge reading "%s"', (status, kind, label) => {
    expect(checkStatusBadge(status)).toEqual({ kind, label });
  });
});

describe('StatusBadge', () => {
  it.each(CASES)('%s carries a glyph and a word, never colour alone', (status, kind, label) => {
    const { container } = render(<StatusBadge {...checkStatusBadge(status)} />);
    expect(container.textContent).toBe(label);
    const glyph = container.querySelector('[data-glyph]');
    expect(glyph?.getAttribute('data-glyph')).toBe(kind);
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
    expect(glyph?.querySelector('svg path')).not.toBeNull();
  });

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
