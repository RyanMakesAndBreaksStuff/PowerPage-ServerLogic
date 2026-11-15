// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const primitives = readFileSync(
  new URL('../../components/primitives.css', import.meta.url),
  'utf8',
);

type Theme = 'light' | 'dark';

function themeTokens(theme: Theme): Map<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(tokens)?.[1] ?? '';
  const map = new Map<string, string>();
  for (const decl of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = decl[1];
    const value = decl[2];
    if (name !== undefined && value !== undefined) map.set(name, value.replace(/\s+/g, ' ').trim());
  }
  return map;
}

function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.[\]()]/g, '\\$&');
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

const light = themeTokens('light');
const dark = themeTokens('dark');

// 1a Graphite palette in the FR-11 token roles. [name, light, dark]
const SPEC_TOKENS: [string, string, string][] = [
  ['window', '#f6f6f6', '#000000'],
  ['surface', '#fbfbfb', '#060606'],
  ['tile', '#ffffff', '#0f0f0f'],
  ['code', '#ececec', '#000000'],
  ['border', '#cfcfcf', '#3a3a3a'],
  ['control-border', '#666666', '#a0a0a0'],
  ['text', '#0a0a0a', '#fafafa'],
  ['text-2', '#333333', '#d4d4d4'],
  ['muted', '#555555', '#a5a5a5'],
  ['primary', '#111111', '#f2f2f2'],
  ['primary-text', '#111111', '#f2f2f2'],
  ['review', '#a8281f', '#ff8f86'],
  ['server', '#0a5aa8', '#8ec5ff'],
  ['string', '#17663f', '#62d69b'],
  ['keyword', '#2a4bb0', '#92b2ff'],
  ['comment', '#555555', '#a5a5a5'],
  ['tile-glass', 'transparent', 'transparent'],
  ['tile-blur', 'none', 'none'],
];

// Design reference values for the pill, button, tooltip and scrim surfaces.
const DESIGN_TOKENS: [string, string, string][] = [
  ['on-primary', '#ffffff', '#0a0a0a'],
  ['ok-tint', '#e2e2e2', '#333333'],
  ['review-tint', '#f5e5e4', '#352422'],
  ['server-tint', '#e2ebf5', '#232c35'],
  ['ghost', '#eeeeee', '#191919'],
  ['tile-shadow', 'none', 'none'],
  ['tooltip-bg', '#111111', '#f2f2f2'],
  ['tooltip-text', '#ffffff', '#0a0a0a'],
  ['scrim', 'rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.62)'],
];

describe('theme tokens (FR-11)', () => {
  it.each(SPEC_TOKENS)('--%s is %s in light and %s in dark', (name, lightValue, darkValue) => {
    expect(light.get(name)).toBe(lightValue);
    expect(dark.get(name)).toBe(darkValue);
  });

  it.each(DESIGN_TOKENS)('--%s matches the design reference', (name, lightValue, darkValue) => {
    expect(light.get(name)).toBe(lightValue);
    expect(dark.get(name)).toBe(darkValue);
  });

  it('defines every remaining token in both themes', () => {
    for (const name of [
      'window-bg',
      'tile-shadow',
      'tooltip-bg',
      'tooltip-text',
      'scrim',
      'code-highlight',
    ]) {
      expect(light.get(name), `light --${name}`).toBeTruthy();
      expect(dark.get(name), `dark --${name}`).toBeTruthy();
    }
  });

  it('paints both windows with a flat background', () => {
    expect(dark.get('window-bg')).toBe('var(--window)');
    expect(light.get('window-bg')).toBe('var(--window)');
  });

  it('uses the system UI stack and the bundled JetBrains Mono', () => {
    expect(tokens).toContain(
      `--font-ui: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;`,
    );
    expect(tokens).toContain(`--font-mono: 'JetBrains Mono'`);
  });

  it('highlights code as 10% primary over the code surface plus a 2px inset primary bar', () => {
    const expected = 'color-mix(in srgb, var(--primary) 10%, var(--code))';
    expect(light.get('code-highlight')).toBe(expected);
    expect(dark.get('code-highlight')).toBe(expected);
    const highlight = rule(tokens, '.ui-code-highlight');
    expect(highlight).toContain('background: var(--code-highlight)');
    expect(highlight).toContain('box-shadow: inset 2px 0 0 var(--primary)');
  });
});

describe('focus ring and selection (AC-1.5)', () => {
  it('draws a 2px primary outline at a 2px offset on keyboard focus', () => {
    const focus = rule(tokens, ':focus-visible');
    expect(focus).toContain('outline: 2px solid var(--primary)');
    expect(focus).toContain('outline-offset: 2px');
  });

  it('never colours the selected pill with the needs-review colour', () => {
    expect(rule(primitives, '.ui-pill--selected')).not.toContain('review');
  });
});

describe('flat tiles, window and assets', () => {
  it('disables backdrop blur through the shared tile token', () => {
    expect(rule(primitives, '.ui-tile')).toContain('backdrop-filter: var(--tile-blur)');
    expect(dark.get('tile-blur')).toBe('none');
  });

  it('keeps the 1024x700 floor on the body', () => {
    const body = rule(tokens, 'body');
    expect(body).toContain('min-width: 1024px');
    expect(body).toContain('min-height: 700px');
    expect(body).toContain('font-weight: 600');
  });

  it('loads nothing from another origin', () => {
    expect(tokens + primitives).not.toMatch(/https?:\/\//);
  });

  it('uses the Phase 00 woff2 fonts and declares no font files of its own', () => {
    expect(tokens).not.toContain('@font-face');
    const fontsUrl = new URL('../../assets/fonts/fonts.css', import.meta.url);
    const urls = Array.from(
      readFileSync(fontsUrl, 'utf8').matchAll(/url\('([^']+\.woff2)'\)/g),
      (m) => m[1] ?? '',
    );
    expect(urls).toHaveLength(3);
    for (const url of urls) {
      expect(existsSync(new URL(url, fontsUrl)), url).toBe(true);
    }
  });
});

// WCAG 2.2 AA (4.5:1) for every text pair the design uses.
type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const n = (i: number): number => parseInt(hex.slice(i, i + 2), 16);
  return [n(1), n(3), n(5)];
}

function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  const mix = (i: 0 | 1 | 2): number => top[i] * alpha + bottom[i] * (1 - alpha);
  return [mix(0), mix(1), mix(2)];
}

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function surface(map: Map<string, string>, name: string): Rgb {
  return rgb(map.get(name) ?? '#000000');
}

function tileSurface(map: Map<string, string>): Rgb {
  const tile = surface(map, 'tile');
  const glass = /^rgba\(255, 255, 255, ([0-9.]+)\)$/.exec(map.get('tile-glass') ?? '');
  return glass?.[1] === undefined ? tile : over([255, 255, 255], Number(glass[1]), tile);
}

const THEMES: [string, Map<string, string>][] = [
  ['light', light],
  ['dark', dark],
];

describe.each(THEMES)('contrast in %s', (_name, map) => {
  const texts = [
    'text',
    'text-2',
    'muted',
    'primary-text',
    'review',
    'server',
    'string',
    'keyword',
    'comment',
  ];

  it.each(texts)('--%s reaches 4.5:1 on the tile and on the code surface', (token) => {
    const fg = surface(map, token);
    expect(contrast(fg, tileSurface(map))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fg, surface(map, 'code'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['primary-text', 'ok-tint'],
    ['review', 'review-tint'],
    ['server', 'server-tint'],
    ['on-primary', 'primary'],
    ['text', 'ghost'],
    ['tooltip-text', 'tooltip-bg'],
  ])('--%s on --%s reaches 4.5:1', (fgToken, bgToken) => {
    expect(contrast(surface(map, fgToken), surface(map, bgToken))).toBeGreaterThanOrEqual(4.5);
  });
});
