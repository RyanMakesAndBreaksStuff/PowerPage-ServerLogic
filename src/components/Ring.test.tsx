// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RingState } from '@/lib/ringGeometry';
import { Ring } from './Ring';

const many = (n: number, state: RingState): RingState[] => Array.from({ length: n }, () => state);
const states = (ring: HTMLElement): (string | null)[] =>
  Array.from(ring.querySelectorAll('path'), (p) => p.getAttribute('data-state'));

describe('Ring', () => {
  it('draws one arc per check, with a text count and label, named for assistive tech', () => {
    render(<Ring segments={['done', 'done', 'review']} label="ready" />);
    const ring = screen.getByRole('img', { name: '2 of 3 ready' });
    expect(within(ring).getByText('2/3')).toBeTruthy();
    expect(within(ring).getByText('ready')).toBeTruthy();
    expect(states(ring)).toEqual(['done', 'done', 'review']);
  });

  it('always shows the count, even with no checks, and draws no arcs', () => {
    render(<Ring segments={[]} label="ready" />);
    const ring = screen.getByRole('img', { name: '0 of 0 ready' });
    expect(within(ring).getByText('0/0')).toBeTruthy();
    expect(states(ring)).toEqual([]);
  });

  it('draws at most one arc per check up to 30', () => {
    render(<Ring segments={many(30, 'done')} label="addressed" />);
    expect(states(screen.getByRole('img'))).toHaveLength(30);
  });

  it('switches to proportional arcs above 30 and omits the empty ones', () => {
    render(
      <Ring
        segments={[...many(35, 'done'), ...many(5, 'review')]}
        label="checks addressed"
        size={120}
      />,
    );
    const ring = screen.getByRole('img', { name: '35 of 40 checks addressed' });
    expect(within(ring).getByText('35/40')).toBeTruthy();
    expect(states(ring)).toEqual(['done', 'review']);
    expect(ring.querySelector('svg')?.getAttribute('width')).toBe('120');
  });

  it('marks each arc with its state class', () => {
    render(<Ring segments={['done', 'review', 'not-scanned']} label="ready" />);
    const classes = Array.from(screen.getByRole('img').querySelectorAll('path'), (p) =>
      p.getAttribute('class'),
    );
    expect(classes).toEqual([
      'ui-ring__arc ui-ring__arc--done',
      'ui-ring__arc ui-ring__arc--review',
      'ui-ring__arc ui-ring__arc--not-scanned',
    ]);
  });
});
