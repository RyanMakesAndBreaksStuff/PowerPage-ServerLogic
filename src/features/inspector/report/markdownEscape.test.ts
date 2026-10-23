import { describe, expect, it } from 'vitest';
import { escapeCell, escapeInline } from './markdownEscape';

describe('Markdown escaping', () => {
  it('escapes each table delimiter and collapses all newline forms', () => {
    expect(escapeCell('\\ | * _ ` [ ] < > #\r\nnext\rline\nend')).toBe(
      '\\\\ \\| \\* \\_ \\` \\[ \\] \\< \\> # next line end',
    );
  });

  it('also escapes heading syntax outside cells', () => {
    expect(escapeInline('# [x](y) <script>\n*value*')).toBe(
      '\\# \\[x\\](y) \\<script\\> \\*value\\*',
    );
  });
});
