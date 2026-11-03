import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeFailure, FakeResponder } from '@/services/pptb/fakeHost';
import type { Connection } from '@/services/pptb/host.types';
import type { SiteRef } from '@/types/inspector';
import { gateHost } from './gatedHost';
import type { GatedHost } from './gatedHost';

export const guid = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
export const fileId = (n: number): string => guid(0x1000 + n);

export const CONNECTION: Connection = {
  id: 'connection-1',
  name: 'Development',
  url: 'https://example.crm.dynamics.com',
  environment: 'Dev',
};
export const OTHER_CONNECTION: Connection = {
  id: 'connection-2',
  name: 'Fabrikam',
  url: 'https://fabrikam.crm.dynamics.com',
  environment: 'Dev',
};

export const SITE_ALPHA: SiteRef = {
  id: guid(1),
  name: 'Alpha portal',
  domain: 'alpha.example.com',
  active: true,
};
export const SITE_BETA: SiteRef = {
  id: guid(2),
  name: 'Beta portal',
  domain: 'beta.example.com',
  active: true,
};
export const SITE_RETIRED: SiteRef = {
  id: guid(3),
  name: 'Retired portal',
  domain: 'retired.example.com',
  active: false,
};

export const ROLE_STAFF = guid(0x11);
export const ROLE_ANONYMOUS = guid(0x12);
export const ROLE_AUTHENTICATED = guid(0x13);
export const PLAIN_CODE = 'function get() { return "{}"; }';
export const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';

type Row = Record<string, unknown>;

/** `code: null` means the host has no such file (404). */
export type WorldFile = {
  n: number;
  /** Defaults to `handler-NN`. */
  name?: string;
  roleIds?: readonly string[];
  statecode?: number;
  code?: string | null;
};
export type WorldSite = { ref: SiteRef; files: readonly WorldFile[] };
export type World = {
  sites: readonly WorldSite[];
  failures?: readonly FakeFailure[];
};

/**
 * Alpha has a configured file and a file that an anonymous role can call (Needs review); Beta has one
 * configured file; the retired site is inactive.
 */
export const DEFAULT_WORLD: World = {
  sites: [
    {
      ref: SITE_ALPHA,
      files: [
        { n: 1, roleIds: [ROLE_STAFF], code: PLAIN_CODE },
        { n: 2, roleIds: [ROLE_ANONYMOUS], code: HTTP_CODE },
      ],
    },
    { ref: SITE_BETA, files: [{ n: 11, roleIds: [ROLE_STAFF], code: PLAIN_CODE }] },
    { ref: SITE_RETIRED, files: [] },
  ],
};

function component(type: number, id: string, name: string, content: unknown, statecode = 0): Row {
  return {
    powerpagecomponentid: id,
    name,
    content: JSON.stringify(content),
    statecode,
    powerpagecomponenttype: type,
  };
}

const logicRow = (file: WorldFile): Row =>
  component(
    35,
    fileId(file.n),
    file.name ?? `handler-${String(file.n).padStart(2, '0')}`,
    { adx_serverlogic_adx_webrole: file.roleIds ?? [ROLE_STAFF] },
    file.statecode ?? 0,
  );

const ROLES: readonly Row[] = [
  component(11, ROLE_STAFF, 'staff', {}),
  component(11, ROLE_ANONYMOUS, 'anonymous', {
    anonymoususersrole: true,
    authenticatedusersrole: false,
  }),
  component(11, ROLE_AUTHENTICATED, 'authenticated', {
    anonymoususersrole: false,
    authenticatedusersrole: true,
  }),
];
const PERMISSIONS: readonly Row[] = [
  component(18, guid(0x21), 'contact-read', {
    scope: 756150001,
    entitylogicalname: 'contact',
    read: true,
    adx_entitypermission_webrole: [ROLE_STAFF],
  }),
];

const COMPONENT_FILTER = /_powerpagesiteid_value eq (\S+) and powerpagecomponenttype eq (\d+)/;

/** The fake ignores `$select` and `$filter`, so this responder applies the two filters the reader writes. */
export function createInspectorHost(
  world: World = DEFAULT_WORLD,
  connection: Connection | null = CONNECTION,
): GatedHost {
  const responder: FakeResponder = (query) => {
    if (query.entitySet !== 'powerpagecomponents') return undefined;
    const match = COMPONENT_FILTER.exec(query.filter ?? '');
    const site = world.sites.find((candidate) => candidate.ref.id === match?.[1]);
    switch (Number(match?.[2])) {
      case 35:
        return site?.files.map(logicRow) ?? [];
      case 11:
        return ROLES;
      case 18:
        return PERMISSIONS;
      default:
        return [];
    }
  };
  const fileColumns = Object.fromEntries(
    world.sites.flatMap((site) =>
      site.files
        .filter((file) => file.code !== null)
        .map((file): [string, string] => [
          `powerpagecomponent/${fileId(file.n)}/filecontent`,
          file.code ?? PLAIN_CODE,
        ]),
    ),
  );
  return gateHost(
    createFakeHost({
      connection,
      tables: {
        powerpagesites: world.sites.map((site) => ({
          powerpagesiteid: site.ref.id,
          name: site.ref.name,
          primarydomainname: site.ref.domain,
          statecode: site.ref.active ? 0 : 1,
        })),
      },
      responders: [responder],
      fileColumns,
      failures: world.failures ?? [],
    }),
  );
}
