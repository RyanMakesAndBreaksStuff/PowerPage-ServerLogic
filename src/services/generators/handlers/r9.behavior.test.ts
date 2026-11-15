// @vitest-environment node
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { generateR9 } from '@/services/generators/handlers/r9';

type Reply = {
  StatusCode: number;
  Body: string;
  IsSuccessStatusCode: boolean;
  ReasonPhrase: string;
};
type Call = { op: string; args: unknown[] };
type Run = { reply: unknown; calls: Call[]; logs: string[] };
type Options = {
  body?: unknown;
  getSetting?: (name: string) => string | undefined;
  trigger?: Reply;
};

const FLOW_ID = 'flow-1';
const BODY = { orderId: 42 };
const TRIGGERED: Reply = {
  StatusCode: 200,
  Body: JSON.stringify({ accepted: true }),
  IsSuccessStatusCode: true,
  ReasonPhrase: 'OK',
};

/** Runs the generated handler in a fresh realm. The flow trigger is recorded and answers with `trigger`. */
async function runR9(options: Options = {}): Promise<Run> {
  const {
    body = BODY,
    trigger = TRIGGERED,
    getSetting = (name: string) => (name === 'CLOUD_FLOW_ID' ? FLOW_ID : undefined),
  } = options;
  const calls: Call[] = [];
  const logs: string[] = [];
  const log = (message: string): void => {
    logs.push(message);
  };
  const sandbox = {
    Server: {
      Context: { ActivityId: 'act-1', Body: JSON.stringify(body) },
      SiteSetting: { Get: getSetting },
      Logger: { Log: log, Warn: log, Error: log },
      Connector: {
        CloudFlow: {
          TriggerAsync: (...args: unknown[]): Promise<Reply> => {
            calls.push({ op: 'TriggerAsync', args });
            return Promise.resolve(trigger);
          },
        },
      },
    },
  };
  createContext(sandbox);
  runInContext(generateR9().text, sandbox);
  const text: unknown = await runInContext('post()', sandbox);
  if (typeof text !== 'string') throw new Error('post() did not return a string');
  const reply: unknown = JSON.parse(text);
  return { reply, calls, logs };
}

describe('generated R9 handler, run in node:vm (FR-3 R9)', () => {
  it('triggers the flow with the body and returns the flow response', async () => {
    const run = await runR9();
    expect(run.calls).toEqual([{ op: 'TriggerAsync', args: [FLOW_ID, JSON.stringify(BODY)] }]);
    expect(run.reply).toEqual({ status: 'success', flowResponse: { accepted: true } });
    expect(run.logs).toEqual([]);
  });

  it('fails closed when reading the site setting throws, before triggering the flow', async () => {
    const run = await runR9({
      getSetting: () => {
        throw new TypeError('setting store unavailable');
      },
    });
    expect(run.reply).toEqual({ status: 'error', message: "Couldn't trigger the flow." });
    expect(run.calls).toEqual([]);
    expect(run.logs).toEqual(['R9 trigger TypeError']);
  });
});
