// @vitest-environment node
import { parse } from 'acorn';
import type { Options } from 'acorn';
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  VALIDATION_MESSAGE,
  headerComment,
  logLine,
  validationFailureReturnFor,
} from '@/services/generators/handlers/snippets';
import { generateR2 } from '@/services/generators/handlers/r2';
import { assertZeroHits } from './tutorial.testkit';

const ACORN_OPTIONS = { ecmaVersion: 2023, sourceType: 'script' } as const satisfies Options;

function parsesEs2023(code: string): boolean {
  try {
    parse(code, ACORN_OPTIONS);
    return true;
  } catch {
    return false;
  }
}

describe('generateR2', () => {
  it('matches the golden file', () => {
    const text = generateR2().text;
    expect(text).toBe(readGolden(import.meta.url, 'R2.js.txt'));
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
    expect(text.startsWith(`${headerComment(getRecipe('R2'))}\n\n`)).toBe(true);
  });

  it('highlights the Body read', () => {
    const { text, highlightLines } = generateR2();
    expect(highlightLines).toEqual([6]);
    const line = text.split('\n')[5];
    expect(line).toContain('Server.Context.Body');
    expect(text.split('\n').filter((item) => item.includes('Server.Context.Body'))).toHaveLength(1);
  });

  it('has zero FR-4 hits', () => {
    const text = generateR2().text;
    expect(parsesEs2023(text)).toBe(true);
    assertZeroHits(text);
  });

  it('validates the contract row', () => {
    const text = generateR2().text;
    expect(text).toContain('function post() {');
    expect(text).toContain('JSON.parse(Server.Context.Body)');
    expect(text).toContain('typeof body.name === "string" ? body.name.trim() : body.name');
    expect(text).toContain('typeof body.email === "string" ? body.email.trim() : body.email');
    expect(text).toContain('name.length > 100');
    expect(text).toContain('email.length <= 254');
    expect(text).toContain('split("@")');
    expect(text).toContain('parts.length === 2');
    expect(text).toContain('parts[1].indexOf(".")');
    expect(text).toContain('Body must be a JSON object.');
    expect(text).toContain('Name is required and must be 100 characters or fewer.');
    expect(text).toContain('Email must be a valid address of 254 characters or fewer.');
    expect(text).toContain(validationFailureReturnFor('errors'));
    expect(text).toContain(VALIDATION_MESSAGE);
    expect(text).toContain('JSON.stringify({ status: "success", name, email })');
  });

  it('never uses the banned string methods', () => {
    const text = generateR2().text;
    expect(text).not.toContain('startsWith');
    expect(text).not.toContain('endsWith');
    expect(text).not.toContain('function (');
  });

  it('rejects before any data access', () => {
    const text = generateR2().text;
    expect(text).not.toContain('Server.Connector');
    expect(text).not.toContain('Server.SiteSetting');
    expect(text).not.toContain('toResult');
    expect(text).not.toContain('Server.User');
    expect(text).not.toContain('async');
    expect(text).not.toContain('await');
    const parseAt = text.indexOf('JSON.parse(Server.Context.Body)');
    const warn = logLine({ level: 'Warn', operation: 'R2 post rejected' });
    expect(parseAt).toBeGreaterThanOrEqual(0);
    expect(text.indexOf(warn)).toBeGreaterThan(parseAt);
    expect(
      text
        .split('\n')
        .filter((line) => line.includes('Server.Logger.'))
        .map((line) => line.trim()),
    ).toEqual([warn]);
  });
});
