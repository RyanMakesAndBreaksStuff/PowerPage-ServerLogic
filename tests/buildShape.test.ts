// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = `${ROOT}node_modules/.cache/build-shape`;
const BUILD_TIMEOUT = 300_000;

async function buildTool(
  name: string,
  releasedPages: string | undefined,
  mode?: string,
): Promise<string> {
  const outDir = `${CACHE}/${name}`;
  const previous = process.env.VITE_RELEASED_PAGES;
  if (releasedPages === undefined) delete process.env.VITE_RELEASED_PAGES;
  else process.env.VITE_RELEASED_PAGES = releasedPages;
  try {
    await build({
      root: ROOT,
      configFile: `${ROOT}vite.config.ts`,
      logLevel: 'silent',
      ...(mode === undefined ? {} : { mode }),
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    if (previous === undefined) delete process.env.VITE_RELEASED_PAGES;
    else process.env.VITE_RELEASED_PAGES = previous;
  }
  return outDir;
}

function filesIn(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith(extension),
  );
}

function read(dir: string, file: string): string {
  return readFileSync(`${dir}/${file}`, 'utf8');
}

describe('built tool: PPTB loading shape (all pages released)', () => {
  let dist = '';
  beforeAll(async () => {
    dist = await buildTool('all', undefined);
  }, BUILD_TIMEOUT);

  it('emits exactly one JavaScript file', () => {
    expect(filesIn(dist, '.js')).toHaveLength(1);
  });

  it('compiles the bundle as a classic script, not a module', () => {
    const [file] = filesIn(dist, '.js');
    if (file === undefined) throw new Error('no bundle emitted');
    const code = read(dist, file);
    expect(() => new Script(code)).not.toThrow();
    expect(code).not.toContain('import.meta');
  });

  it('has no type="module" and no crossorigin in index.html', () => {
    const html = read(dist, 'index.html');
    expect(html).not.toContain('type="module"');
    expect(html).not.toContain('crossorigin');
  });

  it('puts every script tag at the end of the body', () => {
    const html = read(dist, 'index.html');
    expect(html.slice(0, html.indexOf('<body'))).not.toContain('<script');
    const afterLastScript = html.slice(html.lastIndexOf('</script>') + '</script>'.length);
    expect(afterLastScript.replace('</body>', '').replace('</html>', '').trim()).toBe('');
  });

  it('references no external http(s) URL in index.html', () => {
    expect(read(dist, 'index.html')).not.toMatch(/https?:\/\//);
  });

  it('inlines the JetBrains Mono fonts as data: URIs and loads nothing else from CSS', () => {
    const css = filesIn(dist, '.css')
      .map((file) => read(dist, file))
      .join('\n');
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((match) =>
      (match[1] ?? '').replace(/["']/g, ''),
    );
    expect(urls.length).toBeGreaterThanOrEqual(3);
    for (const url of urls) expect(url.startsWith('data:')).toBe(true);
  });

  it('copies the manifest icon into dist', () => {
    expect(existsSync(`${dist}/icons/server-logic-tools.svg`)).toBe(true);
  });

  it('includes all three page placeholders', () => {
    const [file] = filesIn(dist, '.js');
    if (file === undefined) throw new Error('no bundle emitted');
    const code = read(dist, file);
    expect(code).toContain('Logic Starter page placeholder');
    expect(code).toContain('Server Objects page placeholder');
    expect(code).toContain('Logic Inspector page placeholder');
  });
});

describe('released pages (FR-1): unreleased page code is left out of the bundle', () => {
  it(
    'keeps only the Starter page when VITE_RELEASED_PAGES=starter',
    async () => {
      const dist = await buildTool('starter-only', 'starter');
      const [file] = filesIn(dist, '.js');
      if (file === undefined) throw new Error('no bundle emitted');
      const code = read(dist, file);
      expect(code).toContain('Logic Starter page placeholder');
      expect(code).not.toContain('Server Objects page placeholder');
      expect(code).not.toContain('Logic Inspector page placeholder');
    },
    BUILD_TIMEOUT,
  );

  it(
    'fails the build for an unknown page name',
    async () => {
      await expect(buildTool('invalid', 'starter,bogus')).rejects.toThrow(/unknown page/i);
    },
    BUILD_TIMEOUT,
  );
});

describe('library probe build', () => {
  it(
    'bundles jsPDF, autotable, a TTF font, fflate, CodeMirror, acorn and a Fluent icon as one IIFE',
    async () => {
      const dist = await buildTool('probe', undefined, 'probe');
      const files = filesIn(dist, '.js');
      expect(files).toEqual(['probe.js']);
      const code = read(dist, 'probe.js');
      expect(() => new Script(code)).not.toThrow();
      // jsPDF's optional dependencies are aliased to an empty module and must not be bundled.
      expect(code).not.toContain('ALLOWED_TAGS'); // DOMPurify
      expect(code).not.toContain('Unable to find element in cloned iframe'); // html2canvas
    },
    BUILD_TIMEOUT,
  );
});
