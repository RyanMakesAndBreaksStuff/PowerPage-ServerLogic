import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const ALL_PAGES = ['starter', 'objects', 'inspector'] as const;
type Page = (typeof ALL_PAGES)[number];

function isPage(value: string): value is Page {
  return ALL_PAGES.some((page) => page === value);
}

/**
 * FR-1 released pages. VITE_RELEASED_PAGES is a comma list such as "starter,objects".
 * Unset means all three. Anything unknown (including an empty value) fails the build,
 * so a typo can never silently ship a build with no pages.
 */
function parseReleasedPages(raw: string | undefined): ReadonlySet<Page> {
  if (raw === undefined) return new Set(ALL_PAGES);
  const names = raw.split(',').map((name) => name.trim());
  const unknown = names.filter((name) => !isPage(name));
  if (unknown.length > 0) {
    throw new Error(
      `VITE_RELEASED_PAGES has unknown page(s): ${unknown.map((n) => JSON.stringify(n)).join(', ')}. Use any of: ${ALL_PAGES.join(', ')}.`,
    );
  }
  return new Set(names.filter(isPage));
}

/**
 * Plugin to fix HTML for PPTB compatibility (ported unchanged from the yo pptb 1.0.6 template)
 * - Removes type="module" and crossorigin attributes since we're using IIFE format
 * - Moves script tags from head to end of body so DOM is ready when IIFE executes
 */
function fixHtmlForPPTB(): Plugin {
  return {
    name: 'fix-html-for-pptb',
    enforce: 'post',
    transformIndexHtml(html) {
      // Remove type="module" and crossorigin from script tags
      // IIFE format doesn't need module type, and file:// URLs don't need crossorigin
      html = html.replace(/\s*type="module"/g, '');
      html = html.replace(/\s*crossorigin/g, '');
      // Clean up extra spaces around attributes
      html = html.replace(/\s+>/g, '>');

      // Move script tags from head to end of body
      // IIFE executes immediately, so DOM must be ready
      const scriptRegex = /(<script[^>]*src="[^"]*"[^>]*><\/script>)/g;
      const scripts: string[] = [];

      // Extract all script tags
      html = html.replace(scriptRegex, (match) => {
        scripts.push(match);
        return ''; // Remove from current position
      });

      // Insert scripts before closing body tag
      if (scripts.length > 0) {
        const scriptsHtml = '\n  ' + scripts.join('\n  ');
        html = html.replace('</body>', scriptsHtml + '\n</body>');
      }

      return html;
    },
  };
}

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
const EMPTY_MODULE = fromRoot('./src/lib/emptyModule.ts');

// https://vitejs.dev/config/
export default defineConfig((configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), 'VITE_');
  const released = parseReleasedPages(env.VITE_RELEASED_PAGES);
  const isProbe = configEnv.mode === 'probe';

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), fixHtmlForPPTB()],
    base: './',
    resolve: {
      alias: {
        '@': fromRoot('./src'),
        // jsPDF imports these only for doc.html() and doc.addSvgAsImage(), which we never call.
        html2canvas: EMPTY_MODULE,
        canvg: EMPTY_MODULE,
        dompurify: EMPTY_MODULE,
      },
    },
    // Static booleans: Rolldown folds `__PAGE_X__ ? <XPage /> : null` and drops the unused page module.
    define: {
      __PAGE_STARTER__: JSON.stringify(released.has('starter')),
      __PAGE_OBJECTS__: JSON.stringify(released.has('objects')),
      __PAGE_INSPECTOR__: JSON.stringify(released.has('inspector')),
    },
    build: {
      outDir: isProbe ? 'dist-probe' : 'dist',
      assetsDir: 'assets',
      // Fonts and small images become data: URIs; the PPTB default CSP allows data: fonts and images.
      assetsInlineLimit: 100_000,
      sourcemap: configEnv.mode === 'development',
      lib: isProbe
        ? {
            entry: fromRoot('./src/probe/libraryProbe.ts'),
            name: 'LibraryProbe',
            formats: ['iife'],
            fileName: () => 'probe.js',
          }
        : false,
      rolldownOptions: {
        output: {
          // Use IIFE format for compatibility with iframe srcdoc loading
          // ES modules can have issues when loaded via file:// URLs in iframes
          format: 'iife',
          // One file: dynamic imports are inlined (Rolldown's replacement for inlineDynamicImports)
          codeSplitting: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    },
  };
});
