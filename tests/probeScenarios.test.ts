import { describe, expect, it } from 'vitest';
import { COMPONENT_TYPE, componentQuery } from '@/features/inspector/scan/queries';
import { DEFAULT_WORLD, PLAIN_CODE, ROLE_STAFF, fileId, guid, worldComponentRows, worldSiteRows } from '@/test/inspectorWorld';
import type { World, WorldSite } from '@/test/inspectorWorld';

/**
 * Generates the live-probe scenarios under probes/generated/ for the pptb-live-probe skill.
 * `npx vitest run tests/probeScenarios.test.ts -u` rewrites them; a plain run fails when they drift.
 * Step contract: desktop-app/.omc/plans/host-call-interception-for-e2e.md §2.6.
 */
type Step = Record<string, unknown>;
type Scenario = { name: string; vars: Record<string, string>; steps: readonly Step[] };

const TOOL = '{{tool}}';
const TOOL_PATH = 'C:/Users/RyanDev/source/repos/Server Logic';

/** Host channels this tool must never call (spec FR-7, .claude/rules/pptb-host-and-output.md; desktop-app channels.ts). */
const WRITE_CHANNELS = [
  'dataverse.create',
  'dataverse.update',
  'dataverse.delete',
  'dataverse.createMultiple',
  'dataverse.updateMultiple',
  'dataverse.associate',
  'dataverse.disassociate',
  'dataverse.publishCustomizations',
  'dataverse.deploySolution',
  'dataverse.executeBatch',
  'dataverse.executeTransaction',
  'dataverse.createEntityDefinition',
  'dataverse.updateEntityDefinition',
  'dataverse.deleteEntityDefinition',
  'dataverse.createAttribute',
  'dataverse.updateAttribute',
  'dataverse.deleteAttribute',
  'dataverse.createPolymorphicLookupAttribute',
  'dataverse.createRelationship',
  'dataverse.updateRelationship',
  'dataverse.deleteRelationship',
  'dataverse.createGlobalOptionSet',
  'dataverse.updateGlobalOptionSet',
  'dataverse.deleteGlobalOptionSet',
  'dataverse.insertOptionValue',
  'dataverse.updateOptionValue',
  'dataverse.deleteOptionValue',
  'dataverse.orderOption',
  'tool-settings-set',
  'tool-settings-set-all',
] as const;

const clickText = (selector: string, text: string): string =>
  `([...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)}).click(), true)`;

const markCalls = (name: string): Step => ({ name: `mark host calls (${name})`, calls: TOOL, mark: name, expect: { type: 'array' } });

const openTool = (connected: boolean): Step[] => [
  {
    name: 'open the built tool',
    open: connected ? { localPath: '{{toolPath}}', connectionName: '{{connectionName}}' } : '{{toolPath}}',
    as: 'tool',
    critical: true,
  },
  { name: 'remove intercepts left by an earlier run', clearIntercepts: 'all' },
  markCalls('c0'),
];

/** Retrieval only, at runtime: no write channel, and execute only for the two file-download actions (spec FR-7, 4.1.0). */
const retrievalOnlyGuard = (since: string): Step[] => [
  ...WRITE_CHANNELS.map((channel) => ({ name: `no ${channel} call`, calls: TOOL, channel, since: `{{${since}}}`, limit: 2000, expect: { length: 0 } })),
  {
    name: 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock',
    calls: TOOL,
    channel: 'dataverse.execute',
    since: `{{${since}}}`,
    limit: 2000,
    argsExcludes: ['InitializeFileBlocksDownload', 'DownloadBlock'],
    expect: { length: 0 },
  },
];

const scenarioJson = (scenario: Scenario): string => `${JSON.stringify(scenario, null, 2)}\n`;

function hostCalls(): Scenario {
  const download = clickText('#panel-starter button', 'Download starter');
  const saveFile = (name: string, action: Record<string, unknown>): Step => ({
    name,
    intercept: TOOL,
    channel: 'filesystem:save-file',
    times: 1,
    action,
  });
  return {
    name: 'Host calls without a connection: event subscription after reload, Starter save paths, retrieval-only guard',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(false),
      { name: 'reload the tool', reload: TOOL },
      {
        name: 'Starter is selected after reload',
        eval: "document.querySelector('[role=tab][aria-selected=true]')?.id",
        waitFor: { timeoutMs: 10000 },
        expect: { equals: 'tab-starter' },
      },
      markCalls('beforeEvent'),
      { name: 'the host raises settings:updated', event: 'settings:updated', data: {} },
      { name: 'let the theme re-read settle', sleep: 1500 },
      {
        name: 'the theme is re-read exactly once after a reload (fix-7 #7)',
        calls: TOOL,
        channel: 'get-current-theme',
        since: '{{beforeEvent}}',
        expect: { length: 1 },
      },
      saveFile('save dialog returns a path', { kind: 'respond', value: 'C:/probe-out/customer-summary.zip' }),
      markCalls('save1'),
      { name: 'choose Download starter', eval: download },
      {
        name: 'success notification within 2 s (AC-5.11)',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save1}}',
        argsContains: 'customer-summary.zip downloaded',
        waitFor: { timeoutMs: 2000 },
        expect: { minLength: 1 },
      },
      {
        name: 'the zip reaches the host as bytes',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{save1}}',
        expect: { all: [{ path: '0.args.1.binary', equals: true }, { path: '0.args.1.head', matches: '^504b0304' }] },
      },
      saveFile('save dialog is cancelled', { kind: 'respond', value: null }),
      markCalls('save2'),
      { name: 'choose Download starter again', eval: download },
      {
        name: 'the cancelled save call arrives',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{save2}}',
        waitFor: { timeoutMs: 5000 },
        expect: { length: 1 },
      },
      { name: 'wait for any late notification', sleep: 1500 },
      { name: 'a cancelled save shows no notification', calls: TOOL, channel: 'show-notification', since: '{{save2}}', expect: { length: 0 } },
      saveFile('the host fails the save', { kind: 'error', message: 'EACCES: permission denied' }),
      markCalls('save3'),
      { name: 'choose Download starter a third time', eval: download },
      {
        name: 'failure notification names the file',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save3}}',
        argsContains: "Couldn't save customer-summary.zip",
        waitFor: { timeoutMs: 5000 },
        expect: { minLength: 1 },
      },
      {
        name: 'the notification carries no host error text',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save3}}',
        argsContains: 'Error invoking remote method',
        expect: { length: 0 },
      },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

/** A server-issued nextLink as Dataverse sends it: the paging cookie is already percent-encoded twice. */
const NEXT_LINK_PATH =
  'powerpagesites?$select=powerpagesiteid,name,primarydomainname,statecode&$orderby=name,powerpagesiteid&$skiptoken=%3Ccookie%20pagenumber=%222%22%20pagingcookie=%22%253ccookie%2520page%253d%25221%2522%253e%22%20/%3E';

type Respond = (value: unknown) => Record<string, unknown>;
const respondNow: Respond = (value) => ({ kind: 'respond', value });
const respondAfter =
  (ms: string): Respond =>
  (value) => ({ kind: 'delay-then-respond', ms, value });

function alphaSite(): WorldSite {
  const site = DEFAULT_WORLD.sites[0];
  if (site === undefined) throw new Error('DEFAULT_WORLD starts with the Alpha site.');
  return site;
}
const ALPHA = alphaSite();
const SCALE_SITE: WorldSite = {
  ref: { id: guid(0x50), name: 'Scale portal', domain: 'scale.example.com', active: true },
  files: Array.from({ length: 50 }, (_, index) => ({ n: 0x100 + index, roleIds: [ROLE_STAFF], code: PLAIN_CODE })),
};
const SCALE_WORLD: World = { sites: [SCALE_SITE] };

/** Real host error texts (desktop-app dataverseManager.ts:967-987, :200) for site-list reads, with the spec's plain-language message. */
const HOST_FAILURES = [
  { label: '401', message: 'HTTP 401', times: 1, expected: 'Authentication failed. Please reconnect.' },
  { label: '403', message: '0x80040220: Principal user is missing prvReadmspp_website privilege.', times: 1, expected: "You don't have permission to read this data." },
  { label: '404', message: "0x80060888: Resource not found for the segment 'powerpagesites'.", times: 1, expected: 'The requested data was not found.' },
  { label: '429', message: '0x80072322: Number of requests exceeded the limit of 6000 over time window of 300 seconds.', times: 4, expected: 'Too many requests. Please wait and try again.' },
  { label: '503', message: 'HTTP 503', times: 4, expected: 'The server had a problem. Please try again later.' },
  { label: 'network', message: 'Request failed: getaddrinfo ENOTFOUND example.crm.dynamics.com', times: 1, expected: null },
  { label: 'expired sign-in', message: "Authentication expired for connection 'Dev'. Please reconnect to continue.", times: 1, expected: 'Authentication failed. Please reconnect.' },
] as const;

const headingIs = (label: string, text: string, timeoutMs: number): Step => ({
  name: `${label}: Inspector shows "${text}"`,
  eval: "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())",
  waitFor: { timeoutMs },
  expect: { contains: text },
});
/** After a reload React mounts only once the theme IPC answers (main.tsx:21-25), so wait for the tab. */
const openInspector: Step = {
  name: 'open Logic Inspector',
  eval: "(document.querySelector('#tab-inspector').click(), true)",
  waitFor: { timeoutMs: 10000 },
  expect: { equals: true },
};
const openPicker: Step = {
  name: 'open the site picker',
  eval: "(document.querySelector('[role=combobox][aria-label=\"Power Pages site\"]').click(), true)",
};
const SITE_OPTIONS = '[role=listbox][aria-label="Power Pages site"] [role=option]';

const cannedSiteList = (world: World, respond: Respond): Step => ({
  name: 'canned site list',
  intercept: TOOL,
  channel: 'dataverse.queryData',
  argsContains: 'powerpagesites?',
  action: respond({ value: worldSiteRows(world) }),
});

/** Every read a scan of `site` makes, answered from the world without reaching Dataverse. */
function cannedScan(world: World, site: WorldSite, respond: Respond): Step[] {
  const steps: Step[] = [cannedSiteList(world, respond)];
  for (const type of Object.values(COMPONENT_TYPE)) {
    const { filter } = componentQuery(site.ref.id, type);
    if (filter === null) throw new Error('componentQuery always filters by site and type.');
    steps.push({
      name: `canned component type ${String(type)}`,
      intercept: TOOL,
      channel: 'dataverse.queryData',
      argsContains: filter,
      action: respond({ value: worldComponentRows(site, type) }),
    });
  }
  site.files.forEach((file, index) => {
    if (file.code === null) throw new Error('Probe worlds hold readable files only.');
    const code = file.code ?? PLAIN_CODE;
    const token = `probe-block-${String(index).padStart(3, '0')}`;
    steps.push(
      {
        name: `canned download start ${String(index)}`,
        intercept: TOOL,
        channel: 'dataverse.execute',
        argsContains: fileId(file.n),
        action: respond({ FileContinuationToken: token, FileSizeInBytes: Buffer.byteLength(code, 'utf8'), FileName: `handler-${String(index)}.js`, IsChunkingSupported: true }),
      },
      {
        name: `canned download block ${String(index)}`,
        intercept: TOOL,
        channel: 'dataverse.execute',
        argsContains: token,
        action: respond({ Data: Buffer.from(code, 'utf8').toString('base64') }),
      },
    );
  });
  return steps;
}

const scanSite = (siteName: string, timeoutMs: number): Step[] => [
  { name: 'reload so every read goes through the intercepts', reload: TOOL },
  openInspector,
  headingIs('scan', 'Select a site', 15000),
  openPicker,
  {
    name: `pick ${siteName} and start the clock`,
    eval: `(window.__probeScanStart = performance.now(), [...document.querySelectorAll(${JSON.stringify(SITE_OPTIONS)})].find((o) => o.textContent.includes(${JSON.stringify(siteName)})).click(), true)`,
    waitFor: { timeoutMs: 5000 },
    expect: { equals: true },
  },
  headingIs('scan', 'Review server logic readiness', timeoutMs),
];

const openExport = (label: string, format: 'Markdown' | 'PDF'): Step[] => [
  { name: `${label}: open Export report`, eval: clickText('#panel-inspector button', 'Export report'), waitFor: { timeoutMs: 5000 }, expect: { equals: true } },
  { name: `${label}: export dialog is open`, eval: "document.querySelector('[role=dialog][aria-modal=true]') !== null", waitFor: { timeoutMs: 5000 }, expect: { equals: true } },
  { name: `${label}: choose ${format}`, eval: clickText('[role=dialog] [role=radio]', format) },
  { name: `${label}: choose Export ${format}`, eval: clickText('[role=dialog] button', `Export ${format}`), waitFor: { timeoutMs: 3000 }, expect: { equals: true } },
];

function sitePaging(): Scenario {
  const sites = worldSiteRows(DEFAULT_WORLD);
  return {
    name: 'Site list paging: the issued nextLink reaches the host unchanged (RG-001 tool half)',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(true),
      {
        name: 'first page carries a nextLink',
        intercept: TOOL,
        channel: 'dataverse.queryData',
        argsContains: 'powerpagesites?',
        times: 1,
        action: respondNow({ value: sites.slice(0, 1), '@odata.nextLink': `https://example.crm.dynamics.com/api/data/v9.2/${NEXT_LINK_PATH}` }),
      },
      { name: 'second page ends the list', intercept: TOOL, channel: 'dataverse.queryData', argsContains: '$skiptoken', action: respondNow({ value: sites.slice(1) }) },
      markCalls('paging'),
      { name: 'reload so the site list is read through the intercepts', reload: TOOL },
      openInspector,
      headingIs('paging', 'Select a site', 15000),
      {
        name: 'the tool passed the issued nextLink to the host unchanged',
        calls: TOOL,
        channel: 'dataverse.queryData',
        since: '{{paging}}',
        argsContains: '$skiptoken',
        expect: { path: '0.args.0', equals: NEXT_LINK_PATH },
      },
      openPicker,
      { name: 'both pages are listed', eval: `document.querySelectorAll(${JSON.stringify(SITE_OPTIONS)}).length`, waitFor: { timeoutMs: 5000 }, expect: { equals: sites.length } },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

function siteListFailures(): Scenario {
  const steps: Step[] = [...openTool(true)];
  for (const failure of HOST_FAILURES) {
    const label = failure.label;
    steps.push(
      { name: `${label}: clear intercepts`, clearIntercepts: TOOL },
      {
        name: `${label}: the host rejects the site list read`,
        intercept: TOOL,
        channel: 'dataverse.queryData',
        argsContains: 'powerpagesites?',
        times: failure.times,
        action: { kind: 'error', message: failure.message },
      },
      { name: `${label}: reload`, reload: TOOL },
      openInspector,
      headingIs(label, "Couldn't load sites", 15000),
      {
        name: `${label}: no host error text on screen`,
        eval: "document.querySelector('#panel-inspector').innerText",
        expect: { all: [{ notContains: 'Error invoking remote method' }, { notContains: '0x8' }, { notContains: 'ENOTFOUND' }] },
      },
      ...(failure.expected === null
        ? []
        : [
            {
              name: `${label}: plain-language message`,
              eval: "document.querySelector('#panel-inspector p.inspector-state__text')?.textContent.trim()",
              expect: { equals: failure.expected },
            },
          ]),
      { name: `${label}: recover`, clearIntercepts: TOOL },
      cannedSiteList(DEFAULT_WORLD, respondNow),
      { name: `${label}: retry`, eval: clickText('#panel-inspector button', 'Retry') },
      headingIs(label, 'Select a site', 15000),
    );
  }
  steps.push(...retrievalOnlyGuard('c0'));
  return { name: 'Site list host failures map to plain-language messages (A3)', vars: { toolPath: TOOL_PATH }, steps };
}

function scanCanned(): Scenario {
  return {
    name: 'Canned Alpha scan: downloads, PDF save, cancelled save, close guard held during a slow save',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(true),
      ...cannedScan(DEFAULT_WORLD, ALPHA, respondNow),
      markCalls('scan'),
      ...scanSite(ALPHA.ref.name, 30000),
      { name: 'both Alpha handlers are listed', eval: "document.querySelectorAll('#panel-inspector ul.inspector-files > li').length", expect: { equals: ALPHA.files.length } },
      { name: 'each handler took one start and one block call', calls: TOOL, channel: 'dataverse.execute', since: '{{scan}}', expect: { length: ALPHA.files.length * 2 } },
      { name: 'no unreadable-row notice', eval: "document.querySelector('#panel-inspector').innerText.includes(\"couldn't be read\")", expect: { equals: false } },
      { name: 'PDF save returns a path', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: respondNow('C:/probe-out/report.pdf') },
      markCalls('pdf'),
      ...openExport('pdf', 'PDF'),
      {
        name: 'pdf: exported notification within 5 s (AC-9.9)',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{pdf}}',
        argsContains: 'exported',
        waitFor: { timeoutMs: 5000 },
        expect: { minLength: 1 },
      },
      {
        name: 'pdf: the PDF reaches the host as bytes',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{pdf}}',
        expect: { all: [{ path: '0.args.1.binary', equals: true }, { path: '0.args.1.head', matches: '^255044462d' }] },
      },
      { name: 'pdf: close guard taken once', calls: TOOL, channel: 'tool-window:prevent-close', since: '{{pdf}}', expect: { length: 1 } },
      { name: 'pdf: close guard released once', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{pdf}}', waitFor: { timeoutMs: 5000 }, expect: { length: 1 } },
      { name: 'Markdown save is cancelled', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: respondNow(null) },
      markCalls('md'),
      ...openExport('cancel', 'Markdown'),
      { name: 'cancel: the save call arrives', calls: TOOL, channel: 'filesystem:save-file', since: '{{md}}', waitFor: { timeoutMs: 10000 }, expect: { length: 1 } },
      { name: 'cancel: wait for any late notification', sleep: 1500 },
      { name: 'cancel: no exported notification', calls: TOOL, channel: 'show-notification', since: '{{md}}', argsContains: 'exported', expect: { length: 0 } },
      { name: 'Markdown save takes 3 s', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: { kind: 'delay-then-respond', ms: 3000, value: 'C:/probe-out/report.md' } },
      markCalls('held'),
      ...openExport('held', 'Markdown'),
      // The tool's waitFor counts settled calls only, so wait on the close guard (it settles before the save starts), then read the save without waiting.
      { name: 'held: close guard taken', calls: TOOL, channel: 'tool-window:prevent-close', since: '{{held}}', waitFor: { timeoutMs: 5000 }, expect: { length: 1 } },
      { name: 'held: let the save call start', sleep: 500 },
      { name: 'held: the save is pending', calls: TOOL, channel: 'filesystem:save-file', since: '{{held}}', expect: { path: '0.outcome', equals: 'pending' } },
      { name: 'held: close guard still held', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{held}}', expect: { length: 0 } },
      { name: 'held: close guard released after the save', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{held}}', waitFor: { timeoutMs: 8000 }, expect: { length: 1 } },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

function scanScale(): Scenario {
  return {
    name: 'Canned 50-handler scan at measured latency (RG-004)',
    vars: { toolPath: TOOL_PATH, latencyMs: '250' },
    steps: [
      ...openTool(true),
      ...cannedScan(SCALE_WORLD, SCALE_SITE, respondAfter('{{latencyMs}}')),
      markCalls('scale'),
      ...scanSite(SCALE_SITE.ref.name, 120000),
      { name: 'all 50 handlers are listed', eval: "document.querySelectorAll('#panel-inspector ul.inspector-files > li').length", expect: { equals: SCALE_SITE.files.length } },
      { name: 'scan wall time under 30 s (RG-004)', eval: 'Math.round(performance.now() - window.__probeScanStart)', expect: { lt: 30000 }, report: true },
      {
        name: 'download calls for concurrency analysis',
        calls: TOOL,
        channel: 'dataverse.execute',
        since: '{{scale}}',
        limit: 2000,
        expect: { length: SCALE_SITE.files.length * 2 },
        report: true,
      },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

describe('live probe scenarios', () => {
  it('host-calls', async () => {
    await expect(scenarioJson(hostCalls())).toMatchFileSnapshot('../probes/generated/host/host-calls.json');
  });
  it('connected/site-paging', async () => {
    await expect(scenarioJson(sitePaging())).toMatchFileSnapshot('../probes/generated/connected/site-paging.json');
  });
  it('connected/scan-canned', async () => {
    await expect(scenarioJson(scanCanned())).toMatchFileSnapshot('../probes/generated/connected/scan-canned.json');
  });
  it('connected/scan-scale', async () => {
    await expect(scenarioJson(scanScale())).toMatchFileSnapshot('../probes/generated/connected/scan-scale.json');
  });
  it('connected/site-list-failures', async () => {
    await expect(scenarioJson(siteListFailures())).toMatchFileSnapshot('../probes/generated/connected/site-list-failures.json');
  });
});
