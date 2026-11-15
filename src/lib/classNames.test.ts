import { describe, expect, it } from 'vitest';
import { classNames } from './classNames';

describe('classNames', () => {
  it('joins the truthy strings and drops every other part', () => {
    expect(classNames('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing is left', () => {
    expect(classNames(false, undefined)).toBe('');
  });
});
