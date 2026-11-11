#!/usr/bin/env node
// Release gate: runs every check a publish needs and fails on the first one that does not pass.
// Runs from `prepack`, so `npm pack` and `npm publish` both go through it. Usage: npm run verify:release
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WINDOWS = process.platform === 'win32';

/** Gzip size of the default build's single JS bundle on 2026-11-11 (goodplan Wave 0), in KiB. */
const BASELINE_GZIP_KIB = 742.7;
const BUDGET_GZIP_KIB = BASELINE_GZIP_KIB * 1.1;

/** Text only the Logic Inspector page renders; tests/buildShape.test.ts uses the same markers. */
const INSPECTOR_MARKERS = [
  'Review server logic readiness',
  'useInspector must be used inside the Inspector session provider',
  'No site selected',
];

/** Files npm adds to every tarball whatever `files` says, besides the `main` file. */
const NPM_DEFAULT_FILE = /^(package\.json|(readme|license|licence|copying)(\.[^/]*)?)$/i;

const run = (command, args, options = {}) =>
  spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: WINDOWS, ...options });

async function step(name, check) {
  console.log(`\n== ${name}`);
  if (!(await check())) {
    console.error(`\nverify:release failed at: ${name}`);
    process.exit(1);
  }
}

const npmRun = (script) => () => run('npm', ['run', script]).status === 0;

/**
 * The checks `pptb-validate` runs, with URL checks skipped. @pptb/validate 1.0.5 (installed by @pptb/types) ignores
 * its CLI arguments, so `--skip-url-checks` on the binary has no effect and the unpublished repository URLs fail.
 */
async function validateManifest() {
  const { default: pptb } = await import('@pptb/validate');
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const results = [['package.json', await pptb.validatePackageJson(manifest, { skipUrlChecks: true })]];
  const configPath = join(ROOT, 'pptb.config.json');
  if (existsSync(configPath)) {
    results.push(['pptb.config.json', pptb.validatePPTBConfig(JSON.parse(readFileSync(configPath, 'utf8')), manifest)]);
  }
  for (const [name, result] of results) {
    console.log(`${name}: ${result.valid ? 'valid' : 'invalid'}`);
    for (const error of result.errors) console.error(`  error: ${error}`);
    for (const warning of result.warnings) console.warn(`  warning: ${warning}`);
  }
  return results.every(([, result]) => result.valid);
}

/** Lists the tarball without running lifecycle scripts, so the dry run cannot re-enter prepack. */
function packList() {
  const result = run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  if (result.status !== 0) return undefined;
  const parsed = JSON.parse(result.stdout);
  const files = Array.isArray(parsed) ? parsed[0]?.files : undefined;
  if (!Array.isArray(files)) return undefined;
  return files.map((file) => file.path);
}

function checkTarball() {
  const paths = packList();
  if (paths === undefined) {
    console.error('npm pack --dry-run did not return a file list.');
    return false;
  }
  for (const path of paths) console.log(`  ${path}`);
  // npm also always packs the `main` file (the manifest's `main` is index.html, the Vite source entry).
  const { main } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const stray = paths.filter((path) => !path.startsWith('dist/') && !NPM_DEFAULT_FILE.test(path) && path !== main);
  if (stray.length > 0) console.error(`Outside dist/ and npm's default files: ${stray.join(', ')}`);
  if (!paths.includes('dist/index.html')) console.error('dist/index.html is missing from the tarball.');
  // v1.0.0 is the full build (spec 4.5.0): a tarball without the Inspector page is a partial build.
  const scripts = paths
    .filter((path) => path.startsWith('dist/') && path.endsWith('.js'))
    .map((path) => readFileSync(join(ROOT, path), 'utf8'));
  const missing = INSPECTOR_MARKERS.filter((marker) => !scripts.some((text) => text.includes(marker)));
  if (missing.length > 0) console.error(`Inspector page text missing from the tarball: ${missing.join(', ')}`);
  return stray.length === 0 && missing.length === 0 && paths.includes('dist/index.html');
}

function checkSize() {
  console.log(`Budget ${BUDGET_GZIP_KIB.toFixed(1)} KiB gzip (baseline ${BASELINE_GZIP_KIB} KiB + 10 %).`);
  const assets = join(ROOT, 'dist', 'assets');
  if (readdirSync(assets).filter((file) => file.endsWith('.js')).length !== 1) {
    console.error('Expected exactly one JS bundle in dist/assets.');
    return false;
  }
  return run(process.execPath, [join('scripts', 'bundle-size.mjs'), assets, '--budget-kib', BUDGET_GZIP_KIB.toFixed(1)], { shell: false }).status === 0;
}

await step('typecheck', npmRun('typecheck'));
await step('lint', npmRun('lint'));
await step('test', npmRun('test'));
await step('build', npmRun('build'));
await step('validate', validateManifest);
await step('size budget', checkSize);
await step('tarball contents', checkTarball);
console.log('\nverify:release passed.');
