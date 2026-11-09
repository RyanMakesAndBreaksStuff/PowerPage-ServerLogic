#!/usr/bin/env node
// Builds the tool and runs live PPTB probe scenarios through the pptb-live-probe skill.
// Usage: node scripts/probe-live.mjs [--pack] [group ...]   Groups and prerequisites: probes/README.md
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKILL_SCRIPTS = join(process.env.PPTB_LIVE_PROBE_DIR ?? join(homedir(), '.claude', 'skills', 'pptb-live-probe'), 'scripts');
const LOCAL_VARS = join(ROOT, 'probes', '.local.json');
const GROUPS = {
  basic: { dir: 'probes', gating: true, local: false },
  host: { dir: 'probes/generated/host', gating: true, local: false },
  connected: { dir: 'probes/generated/connected', gating: true, local: true },
  live: { dir: 'probes/live', gating: true, local: true },
  pending: { dir: 'probes/generated/pending', gating: false, local: true },
};
const WINDOWS = process.platform === 'win32';

const npm = (args, cwd = ROOT) => spawnSync('npm', args, { cwd, stdio: 'inherit', shell: WINDOWS }).status ?? 1;
const node = (script, args) => spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: 'inherit' }).status ?? 1;

function localVarArgs() {
  const parsed = JSON.parse(readFileSync(LOCAL_VARS, 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('probes/.local.json must be a JSON object of string values.');
  }
  return Object.entries(parsed).flatMap(([key, value]) => {
    if (typeof value !== 'string') throw new Error(`probes/.local.json: "${key}" must be a string.`);
    return ['--var', `${key}=${value}`];
  });
}

/** RG-006: load what npm would publish, not the working tree. */
function packedToolPath() {
  const out = mkdtempSync(join(tmpdir(), 'sl-probe-pack-'));
  if (npm(['pack', '--pack-destination', out]) !== 0) throw new Error('npm pack failed.');
  const tarball = readdirSync(out).find((name) => name.endsWith('.tgz'));
  if (tarball === undefined) throw new Error('npm pack wrote no tarball.');
  if (spawnSync('tar', ['-xzf', tarball], { cwd: out, stdio: 'inherit' }).status !== 0) throw new Error('tar failed.');
  return join(out, 'package');
}

const argv = process.argv.slice(2);
const pack = argv.includes('--pack');
const selected = argv.filter((arg) => arg !== '--pack');
if (selected.length === 0) selected.push('basic');
const unknown = selected.filter((name) => !(name in GROUPS));
if (unknown.length > 0) {
  console.error(`Unknown group ${unknown.join(', ')}. Groups: ${Object.keys(GROUPS).join(', ')}`);
  process.exit(2);
}
if (selected.some((name) => GROUPS[name].local) && !existsSync(LOCAL_VARS)) {
  console.error('These groups need probes/.local.json. See probes/README.md.');
  process.exit(2);
}
if (npm(['run', 'build']) !== 0) process.exit(1);
const toolPath = pack ? packedToolPath() : ROOT;
if (node(join(SKILL_SCRIPTS, 'pptb.mjs'), ['start']) !== 0) process.exit(1);

const lines = [];
let gatingFailures = 0;
for (const name of selected) {
  const group = GROUPS[name];
  const dir = join(ROOT, group.dir);
  const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.json') && !file.startsWith('.')).sort() : [];
  const reportDir = join(ROOT, 'probes', 'reports', name);
  mkdirSync(reportDir, { recursive: true });
  if (files.length === 0) {
    lines.push(`EMPTY ${name}`);
    if (group.gating) gatingFailures += 1;
  }
  for (const file of files) {
    const args = [join(dir, file), '--report', join(reportDir, file), '--var', `toolPath=${toolPath}`];
    if (group.local) args.push(...localVarArgs());
    const status = node(join(SKILL_SCRIPTS, 'scenario.mjs'), args);
    lines.push(`${status === 0 ? 'PASS ' : group.gating ? 'FAIL ' : 'RED  '} ${name}/${file}`);
    if (status !== 0 && group.gating) gatingFailures += 1;
  }
}
console.log(`\n${lines.join('\n')}`);
process.exitCode = gatingFailures === 0 ? 0 : 1;
