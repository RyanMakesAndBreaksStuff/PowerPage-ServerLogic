// @vitest-environment node
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { generateR7 } from '@/services/generators/handlers/r7';

type Reply = {
  StatusCode: number;
  Body: string;
  IsSuccessStatusCode: boolean;
  ReasonPhrase: string;
  Headers?: Record<string, string>;
};
type Call = { op: string; args: unknown[] };
type Run = { reply: unknown; calls: Call[]; logs: string[] };
type Options = {
  body?: unknown;
  settings?: Record<string, string>;
  http?: Reply[];
  create?: Reply;
};

const ACTIVITY_ID = 'act-123';
const SECRET = 'S3CRET';
const TOKEN = 'TOKEN123';
const TICKET_URL = 'https://contoso.sharepoint.com/Tickets/t.html';
const SETTINGS: Record<string, string> = {
  CLIENT_ID: 'cid',
  CLIENT_SECRET: SECRET,
  TENANT_ID: 'tid',
  HOSTNAME: 'contoso.sharepoint.com',
  SITE_PATH: '/sites/events',
};
const BODY = {
  fullname: 'Ada <b>Lovelace</b>',
  email: 'ada@example.com',
  phone: '555-0100',
  event: 1,
  eventText: 'Launch <script>',
  date: '2026-11-05',
};
const CREATED: Reply = {
  StatusCode: 204,
  Body: '',
  IsSuccessStatusCode: true,
  ReasonPhrase: 'No Content',
  Headers: { entityid: 'rec-1' },
};
const ALL_STAGES = ['PostAsync', 'GetAsync', 'GetAsync', 'PutAsync', 'CreateRecord'];

const ok = (body: unknown): Reply => ({
  StatusCode: 200,
  Body: JSON.stringify(body),
  IsSuccessStatusCode: true,
  ReasonPhrase: 'OK',
});
const failed = (code: number, phrase: string): Reply => ({
  StatusCode: code,
  Body: '',
  IsSuccessStatusCode: false,
  ReasonPhrase: phrase,
});
/** Token, site and drive replies, then the given upload reply. */
const connected = (upload: Reply): Reply[] => [
  ok({ access_token: TOKEN }),
  ok({ id: 'site-1' }),
  ok({ id: 'drive-1' }),
  upload,
];

/** Runs the generated handler in a fresh realm. Outbound calls take the next queued reply and are recorded. */
async function runR7(options: Options = {}): Promise<Run> {
  const {
    body = BODY,
    settings = SETTINGS,
    http = connected(ok({ webUrl: TICKET_URL })),
    create = CREATED,
  } = options;
  const calls: Call[] = [];
  const logs: string[] = [];
  const replies = [...http];
  const outbound =
    (op: string) =>
    (...args: unknown[]): Promise<Reply> => {
      calls.push({ op, args });
      const next = replies.shift();
      if (next === undefined) throw new Error(`unexpected ${op}`);
      return Promise.resolve(next);
    };
  const log = (message: string): void => {
    logs.push(message);
  };
  const sandbox = {
    Server: {
      Context: { ActivityId: ACTIVITY_ID, Body: JSON.stringify(body) },
      SiteSetting: { Get: (name: string) => settings[name] },
      Logger: { Log: log, Warn: log, Error: log },
      Connector: {
        HttpClient: {
          PostAsync: outbound('PostAsync'),
          GetAsync: outbound('GetAsync'),
          PutAsync: outbound('PutAsync'),
        },
        Dataverse: {
          CreateRecord: (...args: unknown[]): Reply => {
            calls.push({ op: 'CreateRecord', args });
            return create;
          },
        },
      },
    },
  };
  createContext(sandbox);
  runInContext(generateR7().text, sandbox);
  const text: unknown = await runInContext('post()', sandbox);
  if (typeof text !== 'string') throw new Error('post() did not return a string');
  const reply: unknown = JSON.parse(text);
  return { reply, calls, logs };
}

const ops = (run: Run): string[] => run.calls.map((call) => call.op);

/** The JSON the handler sent to Dataverse CreateRecord. */
function createdRecord(run: Run): unknown {
  const json = run.calls.find((call) => call.op === 'CreateRecord')?.args[1];
  if (typeof json !== 'string') throw new Error('CreateRecord did not get a JSON string');
  return JSON.parse(json);
}

describe('generated R7 handler, run in node:vm (AC-3.7, FR-3 R7)', () => {
  it('connects, uploads, then creates the record and returns its id', async () => {
    const run = await runR7();
    expect(ops(run)).toEqual(ALL_STAGES);
    expect(run.reply).toEqual({ status: 'success', id: 'rec-1' });
    expect(run.logs).toEqual([]);
    expect(createdRecord(run)).toMatchObject({
      crd69_name: 'Ada <b>Lovelace</b>',
      crd69_ticketurl: TICKET_URL,
    });
  });

  it('escapes the ticket HTML and builds the file path from ActivityId and a slug', async () => {
    const run = await runR7();
    const [url, html] = run.calls[3]?.args ?? [];
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/drives/drive-1/root:/Tickets/act-123-ada-b-lovelace-b.html:/content?@microsoft.graph.conflictBehavior=fail',
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('rejects invalid input before any outbound call', async () => {
    const run = await runR7({ body: { ...BODY, email: 'nope', event: 1.5 } });
    expect(run.reply).toMatchObject({
      status: 'error',
      message: "The request isn't valid.",
      errors: [{ field: 'email' }, { field: 'event' }],
    });
    expect(run.calls).toEqual([]);
    expect(run.logs).toEqual([]);
  });

  it('fails closed on a missing site setting before any outbound call', async () => {
    const run = await runR7({ settings: { ...SETTINGS, HOSTNAME: '' } });
    expect(run.reply).toEqual({
      status: 'error',
      message: "Server logic isn't configured: missing site setting HOSTNAME",
    });
    expect(run.calls).toEqual([]);
    expect(run.logs).toEqual(['Missing site setting HOSTNAME']);
  });

  it('stops at the first failing connect call', async () => {
    const run = await runR7({ http: [failed(401, 'Unauthorized')] });
    expect(run.reply).toEqual({ status: 'error', message: "Couldn't connect to SharePoint." });
    expect(ops(run)).toEqual(['PostAsync']);
    expect(run.logs).toEqual(['R7 connect 401 Unauthorized']);
  });

  it('creates no record when the upload fails, and leaks no secret or token', async () => {
    const run = await runR7({ http: connected(failed(500, 'Server Error')) });
    expect(run.reply).toEqual({ status: 'error', message: "Couldn't upload the ticket." });
    expect(ops(run)).toEqual(['PostAsync', 'GetAsync', 'GetAsync', 'PutAsync']);
    expect(run.logs).toEqual(['R7 upload 500 Server Error']);
    const visible = JSON.stringify({ reply: run.reply, logs: run.logs });
    expect(visible).not.toContain(SECRET);
    expect(visible).not.toContain(TOKEN);
  });

  it('reports the orphaned ticket when the create fails after the upload', async () => {
    const run = await runR7({ create: failed(400, 'Bad Request') });
    expect(run.reply).toEqual({
      status: 'error',
      message: 'Registration failed after the ticket was uploaded.',
    });
    expect(ops(run)).toEqual(ALL_STAGES);
    expect(run.logs).toEqual(['R7 create after upload 400 Bad Request act-123']);
  });

  it('still creates the record, with a null ticket URL, when Graph returns no link', async () => {
    const run = await runR7({ http: connected(ok({})) });
    expect(run.reply).toEqual({ status: 'success', id: 'rec-1' });
    expect(createdRecord(run)).toMatchObject({ crd69_ticketurl: null });
  });
});
