import { expect } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';

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
