// @vitest-environment node
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { ClientLanguage } from '@/types/http';
import { generateClient } from './client';

type Chain = { done: (callback: (token: string) => void) => Chain; fail: () => Chain };

const INVALID = 'The response was not a valid envelope.';
const UNREADABLE = 'The response data could not be read.';
const data = (value: unknown): string => JSON.stringify(value);

// Fixtures from docs/spec-build-ccompare.md §5. `errors` are the texts the client must send to console.error.
const FIXTURES: readonly {
  name: string;
  envelope: unknown;
  logs: unknown[][];
  errors: string[];
}[] = [
  {
    name: 'valid payload',
    envelope: { success: true, data: data({ status: 'success', contacts: [1] }) },
    logs: [[[1]]],
    errors: [],
  },
  { name: 'null envelope', envelope: null, logs: [], errors: [INVALID] },
  { name: 'data "null"', envelope: { success: true, data: 'null' }, logs: [], errors: [UNREADABLE] },
  {
    name: 'malformed data',
    envelope: { success: true, data: '{oops' },
    logs: [],
    errors: [UNREADABLE],
  },
  {
    name: 'missing success',
    envelope: { data: data({ status: 'success', contacts: [1] }) },
    logs: [],
    errors: [INVALID],
  },
  {
    name: 'PascalCase Success and Data',
    envelope: { Success: true, Data: data({ status: 'success' }) },
    logs: [],
    errors: [INVALID],
  },
  {
    name: 'success false',
    envelope: { success: false, error: 'denied' },
    logs: [],
    errors: ['denied'],
  },
  {
    name: 'handler status error',
    envelope: { success: true, data: data({ status: 'error', message: 'nope' }) },
    logs: [],
    errors: ['nope'],
  },
];

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Runs the generated client in a fresh realm. Returns what it logged, what it reported and what it threw, as JSON. */
async function runClient(language: ClientLanguage, envelope: unknown): Promise<string> {
  const logs: unknown[][] = [];
  const errors: unknown[][] = [];
  const thrown: string[] = [];
  const chain: Chain = {
    done: (callback) => {
      callback('token');
      return chain;
    },
    fail: () => chain,
  };
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args),
      error: (...args: unknown[]) => errors.push(args),
    },
    shell: {
      getTokenDeferred: () => chain,
      ajaxSafePost: (options: { success: (response: unknown) => void }) => {
        try {
          options.success(envelope);
        } catch (error) {
          thrown.push(error instanceof Error ? error.name : 'unknown');
        }
        return chain;
      },
    },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(envelope) }),
  };
  createContext(sandbox);
  runInContext(
    generateClient({ slug: 'read-contacts', recipe: 'R1', fn: 'get', method: 'GET', language }),
    sandbox,
  );
  await settle();
  return JSON.stringify({ logs, errors, thrown });
}

describe.each(['fetch', 'jquery'] as const)(
  'generated %s client envelope handling (AC-4.5, AC-4.6)',
  (language) => {
    it.each(FIXTURES)('$name', async ({ envelope, logs, errors }) => {
      const expected = JSON.stringify({ logs, errors: errors.map((text) => [text]), thrown: [] });
      expect(await runClient(language, envelope)).toBe(expected);
    });
  },
);
