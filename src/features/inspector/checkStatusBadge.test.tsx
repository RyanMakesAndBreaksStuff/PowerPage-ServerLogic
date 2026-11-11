// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/StatusBadge';
import type { CheckStatus } from '@/types/inspector';
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
});
