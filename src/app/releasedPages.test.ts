import { describe, expect, it } from 'vitest';
import { RELEASED_PAGES } from '@/app/releasedPages';

describe('RELEASED_PAGES', () => {
  it('lists all three pages in tab order when VITE_RELEASED_PAGES is unset', () => {
    expect(RELEASED_PAGES).toEqual(['starter', 'objects', 'inspector']);
  });
});
