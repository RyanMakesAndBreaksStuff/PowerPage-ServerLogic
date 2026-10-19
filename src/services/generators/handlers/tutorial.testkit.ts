import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';

/**
 * Golden file next to the handlers, read as UTF-8. `name` is the file name, such as `R4.js.txt`.
 * `fileURLToPath` avoids Vite's client rewrite of `new URL` and Windows paths that contain spaces.
 */
export function readGolden(name: string): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '__golden__', name), 'utf8');
}

/**
 * Decision 22: a Logger call may be only a fixed JSON string, then zero or more of
 * StatusCode, ReasonPhrase, `<var>.name` and Server.Context.ActivityId.
 */
const LOG_CALL =
  /^Server\.Logger\.(?:Log|Warn|Error)\("(?:[^"\\]|\\.)*"(?: \+ " " \+ (?:Server\.Context\.ActivityId|[A-Za-z_$][\w$]*\.(?:StatusCode|ReasonPhrase|name)))*\);$/;

const LOG_LEAK = /\.message\b|\bBody\b|\bUrl\b|\bHeaders\b|\bheader\b/i;

/** Lines that call `Server.Logger` but break the logging rule. Empty means the text is clean. */
export function loggingGuardViolations(text: string): readonly string[] {
  const violations: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.includes('Server.Logger.')) continue;
    if (!LOG_CALL.test(trimmed) || LOG_LEAK.test(trimmed)) violations.push(trimmed);
  }
  return violations;
}

/** FR-4: no restricted-pattern hits and the text parses as ECMAScript 2023. */
export function assertZeroHits(text: string): void {
  const result = runBrowserChecks(text);
  expect(result.parseFailed).toBe(false);
  expect(result.hits).toEqual([]);
}
