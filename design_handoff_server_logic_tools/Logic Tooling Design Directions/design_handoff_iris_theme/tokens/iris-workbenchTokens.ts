/**
 * Iris theme (heavier Segoe UI variant): drop-in replacement for packages/builder-ui/src/theme/workbenchTokens.ts
 *
 * Palette ids (porcelainLight, porcelainDark) are unchanged, so the switcher, persistence and
 * createPorcelainFluentTheme need no edits. Web and PPTB both consume builder-ui.
 *
 * After copying:
 *  1. Update tests that assert Porcelain values or labels.
 *  2. Accent-filled buttons placed on the code well (--code) must use background var(--code-accent)
 *     and color var(--code). In light mode --accent can be too close to the dark well.
 *  3. Build, run tests, check both themes in web and PPTB.
 * Contrast was checked on the color values only: text 4.5:1 on all surfaces, strokes 3:1.
 */
import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export type PorcelainThemeMode = 'light' | 'dark';
export type PaletteId = 'porcelainLight' | 'porcelainDark';

type PorcelainTokenSet = Partial<Theme> & {
  mode: PorcelainThemeMode;
  label: string;
  swatches: readonly string[];
  cssVariables: Record<`--${string}`, string>;
};

const fontFamilyBase = '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
const fontFamilyMonospace = '"Cascadia Mono", Consolas, ui-monospace, monospace';
// Heavier Segoe UI: base text 600, strong and captions 700.
const fontWeights = { fontWeightRegular: 600, fontWeightMedium: 600, fontWeightSemibold: 700, fontWeightBold: 700 } as const;

export const porcelainTokens = {
  porcelainLight: {
    mode: 'light' as const,
    label: 'Iris',
    swatches: ['#f5f5fd', '#ffffff', '#3640c8', '#0a6a60'] as const,
    colorBrandBackground: '#3640c8',
    colorBrandBackgroundHover: '#2630a8',
    colorBrandBackgroundPressed: '#2630a8',
    colorBrandBackgroundSelected: '#2630a8',
    colorBrandForeground1: '#3640c8',
    colorBrandStroke1: '#3640c8',
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#ececf9',
    colorNeutralBackground3: '#dcdcf0',
    colorNeutralForeground1: '#0d0d24',
    colorNeutralForeground2: '#34345a',
    colorNeutralForeground3: '#34345a',
    colorNeutralForegroundOnBrand: '#ffffff',
    colorNeutralStroke1: '#cacae6',
    colorNeutralStroke2: '#9898c8',
    colorNeutralStrokeAccessible: '#5c5c94',
    colorPaletteRedBackground1: 'rgba(168, 40, 31, 0.12)',
    colorPaletteRedForeground1: '#a8281f',
    colorPaletteRedBorder1: '#a8281f',
    colorPaletteYellowBackground1: 'rgba(122, 77, 0, 0.12)',
    colorPaletteYellowForeground1: '#7a4d00',
    colorPaletteYellowBorder1: '#7a4d00',
    colorPaletteGreenBackground1: 'rgba(23, 102, 63, 0.12)',
    colorPaletteGreenForeground1: '#17663f',
    colorPaletteGreenBorder1: '#17663f',
    colorPaletteBlueBackground2: 'rgba(31, 95, 168, 0.12)',
    colorPaletteBlueForeground2: '#1f5fa8',
    colorPaletteBlueBorderActive: '#1f5fa8',
    fontFamilyBase,
    fontFamilyMonospace,
    ...fontWeights,
    cssVariables: {
      '--bg': '#f5f5fd',
      '--bg2': '#fbfbff',
      '--surface': '#ffffff',
      '--surface2': '#ececf9',
      '--surface3': '#dcdcf0',
      '--panel': 'rgba(255, 255, 255, 0.94)',
      '--border': '#cacae6',
      '--border-strong': '#9898c8',
      '--interactive-stroke': '#5c5c94',
      '--text': '#0d0d24',
      '--text2': '#34345a',
      '--text3': '#34345a',
      '--accent': '#3640c8',
      '--accent-strong': '#2630a8',
      '--accent-ink': '#ffffff',
      '--accent-soft': 'rgba(54, 64, 200, 0.12)',
      '--accent-2': '#0a6a60',
      '--danger': '#a8281f',
      '--danger-soft': 'rgba(168, 40, 31, 0.12)',
      '--warn': '#7a4d00',
      '--warn-soft': 'rgba(122, 77, 0, 0.12)',
      '--good': '#17663f',
      '--good-soft': 'rgba(23, 102, 63, 0.12)',
      '--info': '#1f5fa8',
      '--info-soft': 'rgba(31, 95, 168, 0.12)',
      '--code': '#0c0c18',
      '--code-text': '#f3f3ff',
      '--code-text2': '#cecff0',
      '--code-text3': '#9d9ec9',
      '--code-accent': '#8e9cff',
      '--code-good': '#62d69b',
      '--code-warn': '#f0c45c',
      '--code-danger': '#ff8f86',
      '--code-seg-track': 'rgba(243, 243, 255, 0.08)',
      '--code-seg-selected': 'rgba(243, 243, 255, 0.16)',
      '--header-glass': 'rgba(236, 236, 249, 0.92)',
      '--panel-glass': 'rgba(255, 255, 255, 0.85)',
      '--glow-1': 'rgba(54, 64, 200, 0.14)',
      '--glow-2': 'rgba(10, 106, 96, 0.12)',
      '--seg-track': 'rgba(13, 13, 36, 0.06)',
      '--seg-selected': 'rgba(13, 13, 36, 0.12)',
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.14)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.14)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.18)',
    },
  },
  porcelainDark: {
    mode: 'dark' as const,
    label: 'Iris Dark',
    swatches: ['#000000', '#0c0c18', '#8e9cff', '#5fd8c4'] as const,
    colorBrandBackground: '#8e9cff',
    colorBrandBackgroundHover: '#7482f5',
    colorBrandBackgroundPressed: '#7482f5',
    colorBrandBackgroundSelected: '#7482f5',
    colorBrandForeground1: '#8e9cff',
    colorBrandStroke1: '#8e9cff',
    colorNeutralBackground1: '#0c0c18',
    colorNeutralBackground2: '#151527',
    colorNeutralBackground3: '#212138',
    colorNeutralForeground1: '#f3f3ff',
    colorNeutralForeground2: '#cecff0',
    colorNeutralForeground3: '#cecff0',
    colorNeutralForegroundOnBrand: '#0a0c2a',
    colorNeutralStroke1: '#303050',
    colorNeutralStroke2: '#4c4c7a',
    colorNeutralStrokeAccessible: '#9a9ad0',
    colorPaletteRedBackground1: 'rgba(255, 143, 134, 0.16)',
    colorPaletteRedForeground1: '#ff8f86',
    colorPaletteRedBorder1: '#ff8f86',
    colorPaletteYellowBackground1: 'rgba(240, 196, 92, 0.16)',
    colorPaletteYellowForeground1: '#f0c45c',
    colorPaletteYellowBorder1: '#f0c45c',
    colorPaletteGreenBackground1: 'rgba(98, 214, 155, 0.16)',
    colorPaletteGreenForeground1: '#62d69b',
    colorPaletteGreenBorder1: '#62d69b',
    colorPaletteBlueBackground2: 'rgba(122, 192, 255, 0.16)',
    colorPaletteBlueForeground2: '#7ac0ff',
    colorPaletteBlueBorderActive: '#7ac0ff',
    fontFamilyBase,
    fontFamilyMonospace,
    ...fontWeights,
    cssVariables: {
      '--bg': '#000000',
      '--bg2': '#050509',
      '--surface': '#0c0c18',
      '--surface2': '#151527',
      '--surface3': '#212138',
      '--panel': 'rgba(12, 12, 24, 0.94)',
      '--border': '#303050',
      '--border-strong': '#4c4c7a',
      '--interactive-stroke': '#9a9ad0',
      '--text': '#f3f3ff',
      '--text2': '#cecff0',
      '--text3': '#cecff0',
      '--accent': '#8e9cff',
      '--accent-strong': '#7482f5',
      '--accent-ink': '#0a0c2a',
      '--accent-soft': 'rgba(142, 156, 255, 0.16)',
      '--accent-2': '#5fd8c4',
      '--danger': '#ff8f86',
      '--danger-soft': 'rgba(255, 143, 134, 0.16)',
      '--warn': '#f0c45c',
      '--warn-soft': 'rgba(240, 196, 92, 0.16)',
      '--good': '#62d69b',
      '--good-soft': 'rgba(98, 214, 155, 0.16)',
      '--info': '#7ac0ff',
      '--info-soft': 'rgba(122, 192, 255, 0.16)',
      '--code': '#000000',
      '--code-text': '#f3f3ff',
      '--code-text2': '#cecff0',
      '--code-text3': '#9d9ec9',
      '--code-accent': '#8e9cff',
      '--code-good': '#62d69b',
      '--code-warn': '#f0c45c',
      '--code-danger': '#ff8f86',
      '--code-seg-track': 'rgba(243, 243, 255, 0.08)',
      '--code-seg-selected': 'rgba(243, 243, 255, 0.16)',
      '--header-glass': 'rgba(21, 21, 39, 0.92)',
      '--panel-glass': 'rgba(12, 12, 24, 0.85)',
      '--glow-1': 'rgba(142, 156, 255, 0.2)',
      '--glow-2': 'rgba(95, 216, 196, 0.16)',
      '--seg-track': 'rgba(243, 243, 255, 0.08)',
      '--seg-selected': 'rgba(243, 243, 255, 0.16)',
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.22)',
      '--shadow-md': '0 18px 48px rgba(0, 0, 0, 0.22)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.35)',
    },
  },
} as const satisfies Record<PaletteId, PorcelainTokenSet>;

export function createPorcelainFluentTheme(paletteId: PaletteId): Theme {
  const { cssVariables, mode: _mode, label: _label, swatches: _swatches, ...fluentTokens } = porcelainTokens[paletteId];
  const baseTheme = porcelainTokens[paletteId].mode === 'dark' ? webDarkTheme : webLightTheme;
  void cssVariables;
  void _mode;
  void _label;
  void _swatches;

  return {
    ...baseTheme,
    ...fluentTokens,
  };
}

export function migratePaletteId(value: string | null): PaletteId | null {
  if (value === 'porcelainLight' || value === 'porcelainDark') return value;
  if (value === 'graphiteLight') return 'porcelainLight';
  if (value === 'graphiteDark') return 'porcelainDark';
  return null;
}
