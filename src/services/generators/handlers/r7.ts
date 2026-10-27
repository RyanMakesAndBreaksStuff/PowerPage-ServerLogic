import type { GeneratedHandler } from '@/types/recipe';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  TO_RESULT,
  failureReturn,
  headerComment,
  logLine,
  requireSettingsCode,
  validationFailureReturnFor,
} from './snippets';
import type { LogField } from './snippets';

/** Differences from the Learn Graph and SharePoint tutorial (AC-3.7, Decision 16). */
export const R7_DIFFERENCES: readonly { change: string; reason: string }[] = [
  {
    change: 'Site settings are read inside post with fail-closed checks, not at top level.',
    reason: 'A missing site setting fails closed before any outbound call (F57).',
  },
  {
    change: 'The token body is form-encoded.',
    reason:
      'The token request declares application/x-www-form-urlencoded, so each value is passed through encodeURIComponent (correction 17).',
  },
  {
    change: 'Every call has a status check and each stage has its own failure.',
    reason: 'Each stage logs its own operation name and returns its own fixed message (F06).',
  },
  {
    change: 'Ticket HTML is escaped.',
    reason: 'Every value placed in the ticket HTML is escaped so markup cannot be injected (F05).',
  },
  {
    change: 'The ticket file name is built from ActivityId and a name slug, not the raw name.',
    reason:
      'The ActivityId prefix and the slug keep a slash, quote, percent or hash from changing the upload path (F05).',
  },
  {
    change: 'The upload sets conflictBehavior=fail.',
    reason:
      'Graph PUT replaces a file by default, and this asks a collision to fail the upload; that behavior stays unverified until the probe passes (F05).',
  },
  {
    change: 'No err.message, id or URL logging.',
    reason:
      'Logs keep a fixed operation name, status, reason phrase, exception name or ActivityId, and never a body, message, URL or token (F09).',
  },
  {
    change: 'The return shape is the fixed { status, id }.',
    reason:
      'Success returns status and the created record id, and a failure returns status and a fixed message (FR-3).',
  },
  {
    change: "Input is validated against the table's columns before any call.",
    reason:
      'Input that fails the local checks stops before any outbound call. A later Dataverse rejection can still leave an uploaded ticket (FR-3).',
  },
  {
    change: 'The optional email step and toBase64 are not generated.',
    reason: 'The FR-3 R7 row says the optional email step is not generated (FR-3).',
  },
  {
    change: 'The stray ;; is removed.',
    reason:
      'Learn correction 17 drops the stray double semicolon in the sample configuration block (correction 17).',
  },
  {
    change: 'The table permission is Global with Create only.',
    reason:
      'The sample table grant is Global Create, which Inspector flags for review and the recipe keeps (F04).',
  },
];

const SETTINGS = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'HOSTNAME', 'SITE_PATH'] as const;
const CONNECT = "Couldn't connect to SharePoint.";
const UPLOAD = "Couldn't upload the ticket.";
const CREATE = 'Registration failed after the ticket was uploaded.';
const CONNECT_OP = 'R7 connect';
const UPLOAD_OP = 'R7 upload';
const CREATE_OP = 'R7 create after upload';
const BODY = 'Body must be a JSON object.';
const FULLNAME = 'fullname is required and must be 200 characters or fewer.';
const EMAIL = 'email must be a valid address of 100 characters or fewer.';
const PHONE = 'phone is required and must be 100 characters or fewer.';
const EVENT = 'event must be a whole number.';
const EVENT_TEXT = 'eventText is required and must be 200 characters or fewer.';
const DATE = 'date must look like 2026-11-05.';
const IN = '  ';
const TRY = '    ';
const BLOCK = '      ';

function q(value: string): string {
  return JSON.stringify(value);
}

function fieldError(field: string, message: string): string {
  return `{ field: ${q(field)}, message: ${q(message)} }`;
}

function stageReturn(
  operation: string,
  message: string,
  indent: string,
  fields: readonly LogField[],
  result?: string,
): string[] {
  return [
    logLine({
      level: 'Error',
      operation,
      fields,
      indent,
      ...(result === undefined ? {} : { result }),
    }),
    failureReturn(message, indent),
  ];
}

function highlightLinesOf(text: string): readonly number[] {
  const rows = text.split('\n');
  const needles = ['PostAsync(', 'GetAsync(', 'GetAsync(', 'PutAsync(', 'CreateRecord('];
  const found: number[] = [];
  let start = 0;
  for (const needle of needles) {
    const index = rows.findIndex((row, i) => i >= start && row.includes(needle));
    if (index < 0) throw new Error(`R7 highlight missing ${needle}`);
    found.push(index + 1);
    start = index + 1;
  }
  return found;
}

function helpers(): string[] {
  return [
    'const escapeHtml = (value) =>',
    '  value',
    `    .split(${q('&')})`,
    `    .join(${q('&amp;')})`,
    `    .split(${q('<')})`,
    `    .join(${q('&lt;')})`,
    `    .split(${q('>')})`,
    `    .join(${q('&gt;')})`,
    `    .split(${q('"')})`,
    `    .join(${q('&quot;')})`,
    `    .split(${q("'")})`,
    `    .join(${q('&#39;')});`,
    '',
    'const nameSlug = (value) => {',
    '  const slug = value',
    '    .toLowerCase()',
    `    .replace(/[^a-z0-9]+/g, ${q('-')})`,
    `    .replace(/^-+|-+$/g, ${q('')})`,
    '    .slice(0, 50)',
    `    .replace(/-+$/g, ${q('')});`,
    `  return slug.length === 0 ? ${q('registrant')} : slug;`,
    '};',
    '',
    'const parseJsonObject = () => {',
    '  try {',
    '    const value = JSON.parse(Server.Context.Body);',
    `    if (value !== null && !Array.isArray(value) && typeof value === ${q('object')}) {`,
    '      return value;',
    '    }',
    '  } catch {',
    '    return null;',
    '  }',
    '  return null;',
    '};',
    '',
    'const getAccessToken = async (tenantId, clientId, clientSecret) => {',
    `  const url = ${q('https://login.microsoftonline.com/')} + encodeURIComponent(tenantId) + ${q('/oauth2/v2.0/token')};`,
    '  const form =',
    `    ${q('client_id=')} + encodeURIComponent(clientId) +`,
    `    ${q('&client_secret=')} + encodeURIComponent(clientSecret) +`,
    `    ${q('&scope=')} + encodeURIComponent(${q('https://graph.microsoft.com/.default')}) +`,
    `    ${q('&grant_type=client_credentials')};`,
    `  return toResult(await Server.Connector.HttpClient.PostAsync(url, form, { ${q('Content-Type')}: ${q('application/x-www-form-urlencoded')} }, ${q('application/x-www-form-urlencoded')}));`,
    '};',
  ];
}

function validateLines(): string[] {
  return [
    '  const parsed = parseJsonObject();',
    '  if (parsed === null) {',
    `    const errors = [${fieldError('body', BODY)}];`,
    validationFailureReturnFor('errors', TRY),
    '  }',
    `  const fullname = typeof parsed.fullname === ${q('string')} ? parsed.fullname.trim() : parsed.fullname;`,
    `  const email = typeof parsed.email === ${q('string')} ? parsed.email.trim() : parsed.email;`,
    `  const phone = typeof parsed.phone === ${q('string')} ? parsed.phone.trim() : parsed.phone;`,
    `  const eventText = typeof parsed.eventText === ${q('string')} ? parsed.eventText.trim() : parsed.eventText;`,
    '  const event = parsed.event;',
    '  const date = parsed.date;',
    '  const errors = [];',
    `  if (typeof fullname !== ${q('string')} || fullname.length === 0 || fullname.length > 200) {`,
    `    errors.push(${fieldError('fullname', FULLNAME)});`,
    '  }',
    '  let emailOk = false;',
    `  if (typeof email === ${q('string')} && email.length > 0 && email.length <= 100) {`,
    `    const parts = email.split(${q('@')});`,
    `    emailOk = parts.length === 2 && parts[1].indexOf(${q('.')}) !== -1;`,
    '  }',
    '  if (!emailOk) {',
    `    errors.push(${fieldError('email', EMAIL)});`,
    '  }',
    `  if (typeof phone !== ${q('string')} || phone.length === 0 || phone.length > 100) {`,
    `    errors.push(${fieldError('phone', PHONE)});`,
    '  }',
    '  if (!Number.isInteger(event)) {',
    `    errors.push(${fieldError('event', EVENT)});`,
    '  }',
    `  if (typeof eventText !== ${q('string')} || eventText.length === 0 || eventText.length > 200) {`,
    `    errors.push(${fieldError('eventText', EVENT_TEXT)});`,
    '  }',
    `  if (typeof date !== ${q('string')} || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {`,
    `    errors.push(${fieldError('date', DATE)});`,
    '  }',
    '  if (errors.length > 0) {',
    validationFailureReturnFor('errors', TRY),
    '  }',
  ];
}

function connectLines(): string[] {
  const status: readonly LogField[] = ['status', 'reason'];
  return [
    `  let token = ${q('')};`,
    `  let siteId = ${q('')};`,
    `  let driveId = ${q('')};`,
    '  try {',
    '    const auth = await getAccessToken(tenantId, clientId, clientSecret);',
    '    if (!auth.IsSuccessStatusCode) {',
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'auth'),
    '    }',
    '    const authBody = JSON.parse(auth.Body);',
    '    token = authBody.access_token;',
    `    if (typeof token !== ${q('string')} || token.length === 0) {`,
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'auth'),
    '    }',
    `    const siteUrl = ${q('https://graph.microsoft.com/v1.0/sites/')} + hostname + ${q(':')} + sitePath;`,
    `    const site = toResult(await Server.Connector.HttpClient.GetAsync(siteUrl, { Authorization: ${q('Bearer ')} + token }));`,
    '    if (!site.IsSuccessStatusCode) {',
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'site'),
    '    }',
    '    const siteBody = JSON.parse(site.Body);',
    '    siteId = siteBody.id;',
    `    if (typeof siteId !== ${q('string')} || siteId.length === 0) {`,
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'site'),
    '    }',
    `    const driveUrl = ${q('https://graph.microsoft.com/v1.0/sites/')} + siteId + ${q('/drive')};`,
    `    const drive = toResult(await Server.Connector.HttpClient.GetAsync(driveUrl, { Authorization: ${q('Bearer ')} + token }));`,
    '    if (!drive.IsSuccessStatusCode) {',
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'drive'),
    '    }',
    '    const driveBody = JSON.parse(drive.Body);',
    '    driveId = driveBody.id;',
    `    if (typeof driveId !== ${q('string')} || driveId.length === 0) {`,
    ...stageReturn(CONNECT_OP, CONNECT, BLOCK, status, 'drive'),
    '    }',
    '  } catch (e) {',
    ...stageReturn(CONNECT_OP, CONNECT, TRY, ['exception']),
    '  }',
  ];
}

function uploadLines(): string[] {
  return [
    '  let webUrl = null;',
    '  try {',
    `    const fileName = Server.Context.ActivityId + ${q('-')} + nameSlug(fullname) + ${q('.html')};`,
    '    const ticketHtml =',
    `      ${q('<html>')} +`,
    `      ${q('<body style="font-family: Arial, sans-serif;">')} +`,
    `      ${q('<h2>Event Registration Confirmation</h2>')} +`,
    `      ${q('<p><b>Name:</b> ')} + escapeHtml(fullname) + ${q('</p>')} +`,
    `      ${q('<p><b>Event:</b> ')} + escapeHtml(eventText) + ${q('</p>')} +`,
    `      ${q('<p><b>Date:</b> ')} + escapeHtml(date) + ${q('</p>')} +`,
    `      ${q('<p>Thank you for registering! Please save this confirmation.</p>')} +`,
    `      ${q('</body>')} +`,
    `      ${q('</html>')};`,
    `    const uploadUrl = ${q('https://graph.microsoft.com/v1.0/drives/')} + driveId + ${q('/root:/')} + TICKETS_FOLDER + ${q('/')} + fileName + ${q(':/content?@microsoft.graph.conflictBehavior=fail')};`,
    `    const upload = toResult(await Server.Connector.HttpClient.PutAsync(uploadUrl, ticketHtml, { Authorization: ${q('Bearer ')} + token, ${q('Content-Type')}: ${q('text/html')} }, ${q('text/html')}));`,
    '    if (!upload.IsSuccessStatusCode) {',
    ...stageReturn(UPLOAD_OP, UPLOAD, BLOCK, ['status', 'reason'], 'upload'),
    '    }',
    '    try {',
    '      const uploaded = JSON.parse(upload.Body);',
    '      const link = uploaded.webUrl;',
    `      if (typeof link === ${q('string')} && link.length > 0) {`,
    '        webUrl = link;',
    '      }',
    '    } catch {',
    '      webUrl = null;',
    '    }',
    '  } catch (e) {',
    ...stageReturn(UPLOAD_OP, UPLOAD, TRY, ['exception']),
    '  }',
  ];
}

function createLines(): string[] {
  return [
    '  try {',
    '    const r = toResult(Server.Connector.Dataverse.CreateRecord(REGISTRATION_SET, JSON.stringify({ crd69_name: fullname, crd69_email: email, crd69_phone: phone, crd69_event: event, crd69_preferreddate: date, crd69_ticketurl: webUrl })));',
    '    if (!r.IsSuccessStatusCode) {',
    ...stageReturn(CREATE_OP, CREATE, BLOCK, ['status', 'reason', 'activity'], 'r'),
    '    }',
    '    const id = r.Headers && (r.Headers.entityid ?? r.Headers.entityId);',
    '    if (!id) {',
    ...stageReturn(CREATE_OP, CREATE, BLOCK, ['status', 'reason', 'activity'], 'r'),
    '    }',
    `    return JSON.stringify({ status: ${q('success')}, id });`,
    '  } catch (e) {',
    ...stageReturn(CREATE_OP, CREATE, TRY, ['exception', 'activity']),
    '  }',
  ];
}

export function generateR7(): GeneratedHandler {
  const recipe = getRecipe('R7');
  const table = recipe.tables[0];
  if (table === undefined) throw new Error('R7 has no table');
  const lines = [
    ...headerComment(recipe).split('\n'),
    '',
    TO_RESULT,
    '',
    `const TICKETS_FOLDER = ${q('Tickets')};`,
    `const REGISTRATION_SET = ${q(table.entitySetName)};`,
    '',
    ...helpers(),
    '',
    'async function post() {',
    ...validateLines(),
    ...requireSettingsCode(SETTINGS, IN).split('\n'),
    ...connectLines(),
    ...uploadLines(),
    ...createLines(),
    '}',
  ];
  const text = [...lines, ''].join('\n');
  return { text, highlightLines: highlightLinesOf(text) };
}
