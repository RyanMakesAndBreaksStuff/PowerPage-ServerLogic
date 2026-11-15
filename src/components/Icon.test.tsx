// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';
import { ICONS } from './icons';
import type { IconName } from './icons';

describe('Icon', () => {
  it('renders path data for every mapped Fluent icon', () => {
    const names = Object.keys(ICONS).filter((key): key is IconName => key in ICONS);
    expect(names.length).toBeGreaterThanOrEqual(22);
    for (const name of names) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelectorAll('svg path').length, name).toBeGreaterThan(0);
      unmount();
    }
  });

  it('is decorative by default', () => {
    const { container } = render(<Icon name="checkmark" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
  });

  it('becomes a named image when given a title', () => {
    render(<Icon name="warning" title="Warning" />);
    expect(screen.getByRole('img', { name: 'Warning' })).toBeTruthy();
  });

  it('scales with size and inherits the text colour', () => {
    const { container } = render(<Icon name={'copy' satisfies IconName} size={24} />);
    const svg = container.querySelector('svg');
    expect(svg?.style.width).toBe('24px');
    expect(svg?.style.height).toBe('24px');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(svg?.classList.contains('ui-icon')).toBe(true);
  });
});
