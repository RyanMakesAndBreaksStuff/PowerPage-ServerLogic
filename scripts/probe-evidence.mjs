#!/usr/bin/env node
// Writes redacted live-probe status rows into findings/logic/probe_findings.md from the latest reports.
// Only pass/fail, version strings, whole-number counts and a latency median leave a report; never ids, paths, URLs or messages.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = join(ROOT, 'probes', 'reports'); // <group>/<scenario>.json, as written by scripts/probe-live.mjs
const FINDINGS = join(ROOT, 'findings', 'logic', 'probe_findings.md');
const START = '<!-- probe-evidence:start -->';
const END = '<!-- probe-evidence:end -->';
const VERSION = /^\d+\.\d+\.\d+$/;

/** Each 2026-11-01 observation and the report steps (probes/live, probes/generated/connected) that prove it. */
const ROWS = [
  { observation: 'Host and runtime versions', steps: [['live/s2-dev.json', 'record host and runtime versions']] },
  { observation: 'Populated handler: metadata, Data base64, byte count, UTF-8 text equality', steps: [['live/s2-dev.json', 'populated handler download matches']] },
  { observation: 'Site-scoped type-35 paging', steps: [['live/s2-dev.json', 'paging probe returned'], ['live/s2-dev.json', 'second page request was made']] },
  { observation: 'Second request URL equals the issued nextLink', steps: [['live/s2-dev.json', 'nextLink wire passed'], ['connected/site-paging.json', 'the tool passed the issued nextLink to the host unchanged']] },
  { observation: 'Apostrophe/space literal encoded once', steps: [['live/s2-dev.json', 'literal wire passed']] },
  { observation: 'Connection shape; callback argument shapes', steps: [['live/s2-dev.json', 'connection shape returned'], ['live/s2-dev.json', 'connection events reached the tool']] },
  { observation: 'Unsubscribe after a further connection change', steps: [['live/s2-dev.json', 'unsubscribe check passed']] },
  {
    observation: 'Nonsecret current/default/missing/denied',
    steps: [
      ['live/s2-dev.json', 'environment variable: current'],
      ['live/s2-dev.json', 'environment variable: default'],
      ['live/s2-dev.json', 'environment variable: missing'],
      ['live/s2-restricted.json', 'environment variable: denied'],
    ],
  },
  // s2-dev.json has no secret step until the Dev environment has a Key Vault-backed secret variable; this row reads "not run".
  { observation: 'Secret environment variable', steps: [['live/s2-dev.json', 'environment variable: secret']] },
  { observation: 'Explicit 403 denial', steps: [['live/s2-restricted.json', '403 denial is rejected'], ['live/s2-restricted.json', '403 host call failed']] },
  {
    observation: 'Network-loss and expired sign-in rejection shapes',
    steps: [['connected/site-list-failures.json', 'network: no host error text on screen'], ['connected/site-list-failures.json', 'expired sign-in: no host error text on screen']],
    note: 'injected host faults; a real network drop and token expiry stay manual',
  },
  { observation: 'Retrieval only at runtime', steps: [['live/s2-dev.json', 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock'], ['connected/scan-canned.json', 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock']] },
];

const reports = new Map();
function report(file) {
  if (!reports.has(file)) {
    const path = join(REPORTS, file);
    reports.set(file, existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);
  }
  return reports.get(file);
}
const result = (file, step) => report(file)?.results?.find((r) => r.name === step) ?? null;

function status(steps) {
  const found = steps.map(([file, step]) => result(file, step));
  if (found.some((r) => r !== null && !r.passed)) return 'failed';
  return found.every((r) => r !== null && r.passed) ? 'passed' : 'not run';
}

const version = (step) => {
  const value = result('live/s2-dev.json', step)?.value;
  return typeof value === 'string' && VERSION.test(value) ? value : 'unrecorded';
};
/** An unpackaged debug build reports Electron's version from getAppVersion, so PPTB's version comes from the fork checkout. */
function hostVersion() {
  const fork = process.env.PPTB_DESKTOP_APP_DIR ?? 'C:/Users/RyanDev/source/repos/desktop-app';
  const pkg = join(fork, 'package.json');
  const semver = existsSync(pkg) ? JSON.parse(readFileSync(pkg, 'utf8')).version : null;
  if (typeof semver !== 'string' || !VERSION.test(semver)) return 'unrecorded';
  const head = spawnSync('git', ['-C', fork, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() ?? '';
  return /^[0-9a-f]{7,12}$/.test(head) ? `${semver} (fork ${head})` : semver;
}
const inventory = result('live/s2-dev.json', 'site inventory counts')?.value;
const count = (key) => (Number.isSafeInteger(inventory?.[key]) ? String(inventory[key]) : 'unrecorded');

const durations = (result('live/scan-real.json', 'download calls for latency analysis')?.value ?? [])
  .map((call) => call?.durationMs)
  .filter((ms) => Number.isFinite(ms))
  .sort((a, b) => a - b);
const median = durations.length === 0 ? null : Math.round(durations[Math.floor(durations.length / 2)]);

const date = new Date().toISOString().slice(0, 10);
const block = [
  START,
  '## Automated live evidence',
  '',
  `Generated by \`node scripts/probe-evidence.mjs\` on ${date} from the latest \`npm run probe:live:connected\` reports. PPTB ${hostVersion()}, Electron ${version('Electron runtime version')}. Site inventory: ${count('serverLogic')} server logic records, ${count('envDefinitions')} environment variable definitions.`,
  '',
  '| Observation | Status | Proved by |',
  '| --- | --- | --- |',
  ...ROWS.map((row) => `| ${row.observation} | ${status(row.steps)} | ${row.steps.map(([file, step]) => `\`${file}\`: ${step}`).join('; ')}${row.note ? ` (${row.note})` : ''} |`),
  END,
].join('\n');

const current = readFileSync(FINDINGS, 'utf8');
const next = current.includes(START)
  ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
  : `${current.trimEnd()}\n\n${block}\n`;
writeFileSync(FINDINGS, next);
console.log(`Updated ${FINDINGS}`);
if (median !== null) console.log(`Median download call latency: ${median} ms. Set "latencyMs": "${median}" in probes/.local.json.`);
