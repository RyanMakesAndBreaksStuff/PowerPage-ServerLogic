// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APPROVED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-3.0',
  'ISC',
  'AGPL-3.0-only',
];

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(path: string): Json {
  const parsed: unknown = JSON.parse(readFileSync(`${ROOT}${path}`, 'utf8'));
  if (!isRecord(parsed)) throw new Error(`${path} is not a JSON object`);
  return parsed;
}

const manifest = readJson('package.json');

describe('PPTB manifest (FR-12)', () => {
  it('declares an optional single connection and the first API version that allows it', () => {
    expect(manifest.features).toEqual({ connections: { min: 0, max: 1 }, minAPI: '1.2.7' });
  });

  it('has no CSP exceptions and does not enable the Power Platform API', () => {
    expect(manifest).not.toHaveProperty('cspExceptions');
    expect(manifest.features).not.toHaveProperty('enabledForPowerPlatformAPI');
  });

  it('has the required identity fields', () => {
    expect(manifest.displayName).toBe('Server Logic Tools');
    expect(typeof manifest.description === 'string' && manifest.description.length > 20).toBe(true);
    expect(manifest.main).toBe('index.html');
    expect(String(manifest.version)).toMatch(/^[1-9]\d*\.\d+\.\d+$/);
    expect(APPROVED_LICENSES).toContain(manifest.license);
    expect(manifest.contributors).toEqual([
      { name: 'Ryan Christopher', url: 'https://github.com/RyanMakesAndBreaksStuff' },
    ]);
  });

  it('is BSD-3-Clause and ships the licence text', () => {
    expect(manifest.license).toBe('BSD-3-Clause');
    expect(existsSync(`${ROOT}LICENSE`)).toBe(true);
    expect(readFileSync(`${ROOT}LICENSE`, 'utf8')).toContain('BSD 3-Clause License');
  });

  it('links the repository and a raw GitHub README', () => {
    expect(manifest.configurations).toEqual({
      repository: 'https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic',
      readmeUrl:
        'https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/main/README.md',
    });
  });

  it('uses the branded SVG logo as the icon, copied into dist', () => {
    expect(manifest.icon).toBe('icons/logo.svg');
    const path = 'public/icons/logo.svg';
    expect(existsSync(`${ROOT}${path}`)).toBe(true);
    expect(readFileSync(`${ROOT}${path}`, 'utf8')).toMatch(/^<svg\b/);
  });

  it('declares every runtime dependency the whole project needs (no later package.json edits)', () => {
    const dependencies = manifest.dependencies;
    if (!isRecord(dependencies)) throw new Error('dependencies missing');
    for (const name of [
      'react',
      'react-dom',
      'acorn',
      'fflate',
      'jspdf',
      'jspdf-autotable',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/language',
      '@codemirror/lang-javascript',
      '@lezer/highlight',
      '@fluentui/react-icons',
    ]) {
      expect(dependencies, name).toHaveProperty([name]);
    }
    expect(dependencies.jspdf).toBe('4.2.1');
    expect(dependencies['jspdf-autotable']).toBe('5.0.8');
  });
});
