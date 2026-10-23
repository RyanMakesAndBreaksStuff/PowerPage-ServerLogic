import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom has no layout, so a Range has no client rects; CodeMirror measures text through them.
// Node-environment test files have no Range at all.
if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects = function getClientRects(): DOMRectList {
    const rects: DOMRect[] = [];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null });
  };
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
