// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { View } from '@/types/http';
import { TopTabs } from './TopTabs';

afterEach(cleanup);

function mount(view: View, released: readonly View[] = ['starter', 'objects', 'inspector']) {
  const onSelect = vi.fn<(v: View) => void>();
  render(<TopTabs view={view} released={released} onSelect={onSelect} />);
  return onSelect;
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('TopTabs', () => {
  it('shows the three tabs in order with Logic Starter selected (AC-1.1)', () => {
    mount('starter');
    expect(screen.getByRole('tablist', { name: 'Pages' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Logic Starter',
      'Server Objects',
      'Logic Inspector',
    ]);
    expect(tab('Logic Starter').getAttribute('aria-selected')).toBe('true');
    expect(tab('Logic Starter').getAttribute('aria-controls')).toBe('panel-starter');
    expect(tab('Logic Starter').tabIndex).toBe(0);
    expect(tab('Server Objects').tabIndex).toBe(-1);
  });

  it('draws an icon in each tab: code, cube (server colour) and target (review colour)', () => {
    mount('starter');
    expect(tab('Logic Starter').querySelector('.shell__tab-icon--starter svg')).not.toBeNull();
    expect(tab('Server Objects').querySelector('.shell__tab-icon--objects svg')).not.toBeNull();
    expect(tab('Logic Inspector').querySelector('.shell__tab-icon--inspector svg')).not.toBeNull();
  });

  it('selects on click, and on Enter or Space', () => {
    const onSelect = mount('starter');
    fireEvent.click(tab('Logic Inspector'));
    fireEvent.keyDown(tab('Server Objects'), { key: 'Enter' });
    fireEvent.keyDown(tab('Server Objects'), { key: ' ' });
    expect(onSelect.mock.calls).toEqual([['inspector'], ['objects'], ['objects']]);
  });

  it('moves focus and selects with the arrows (wrapping), Home and End', () => {
    const onSelect = mount('starter');
    fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Server Objects'));
    fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Logic Inspector'));
    fireEvent.keyDown(tab('Logic Starter'), { key: 'End' });
    fireEvent.keyDown(tab('Logic Inspector'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('Logic Starter'));
    expect(onSelect.mock.calls).toEqual([['objects'], ['inspector'], ['inspector'], ['starter']]);
  });

  describe('an unreleased page (AC-1.7)', () => {
    it('keeps its tab, disabled, in the arrow order, never selectable and with no tooltip', () => {
      const onSelect = mount('starter', ['starter', 'objects']);
      const inspector = tab('Logic Inspector');
      expect(inspector.getAttribute('aria-disabled')).toBe('true');
      expect(inspector.getAttribute('aria-describedby')).toBeNull();
      expect(inspector.getAttribute('title')).toBeNull();
      fireEvent.keyDown(tab('Logic Starter'), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(inspector);
      fireEvent.click(inspector);
      fireEvent.keyDown(inspector, { key: 'Enter' });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('has no aria-controls, because its panel never renders', () => {
      mount('objects', ['objects']);
      expect(tab('Logic Starter').getAttribute('aria-controls')).toBeNull();
      expect(tab('Server Objects').getAttribute('aria-selected')).toBe('true');
    });
  });
});
