import type { ODataQuery } from '@/services/pptb/host.types';

/** Largest page Dataverse returns for one request; the adapter rejects anything bigger. */
export const PAGE_SIZE = 5000;

/** `powerpagecomponenttype` values Inspector reads. */
export const COMPONENT_TYPE = {
  siteSetting: 9,
  webRole: 11,
  tablePermission: 18,
  serverLogic: 35,
} as const;
export type ComponentType = (typeof COMPONENT_TYPE)[keyof typeof COMPONENT_TYPE];

/** `environmentvariabledefinition.type` of a Secret variable; its value is never requested. */
export const SECRET_ENVVAR_TYPE = 100000005;

export const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /\p{Cc}/u;

/**
 * An OData string literal as FR-7 writes it: each `'` doubled, the result percent-encoded, the whole
 * quoted. The host builds the request URL from the path as given, so the caller encodes (`&`, `#`, `%`,
 * `+` and spaces become `%26`, `%23`, `%25`, `%2B`, `%20`; `'` stays, which is how OData reads the
 * doubling). Control characters (which the adapter rejects anyway) fail with a RangeError.
 */
export function odataString(value: string): string {
  if (CONTROL.test(value)) throw new RangeError('The value cannot be used in an OData filter.');
  try {
    return `'${encodeURIComponent(value.replaceAll("'", "''"))}'`;
  } catch {
    // encodeURIComponent throws a URIError for a lone surrogate.
    throw new RangeError('The value cannot be used in an OData filter.');
  }
}

/** A GUID is inserted bare (OData GUID literal). Anything else is a RangeError. */
export function odataGuid(value: string): string {
  if (!GUID.test(value)) throw new RangeError('The value is not a GUID.');
  return value;
}

export const SITES_QUERY: ODataQuery = {
  entitySet: 'powerpagesites',
  select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
  filter: null,
  orderBy: 'name,powerpagesiteid',
  pageSize: PAGE_SIZE,
};

/** Every row of one component type on a site. Deliberately no name filter: see FR-7 setting-name matching. */
export function componentQuery(siteId: string, type: ComponentType): ODataQuery {
  return {
    entitySet: 'powerpagecomponents',
    select: ['powerpagecomponentid', 'name', 'content', 'statecode', 'powerpagecomponenttype'],
    filter: `_powerpagesiteid_value eq ${odataGuid(siteId)} and powerpagecomponenttype eq ${String(type)}`,
    orderBy: 'name,powerpagecomponentid',
    pageSize: PAGE_SIZE,
  };
}

export function definitionQuery(schemaName: string): ODataQuery {
  return {
    entitySet: 'environmentvariabledefinitions',
    select: ['environmentvariabledefinitionid', 'schemaname', 'type', 'defaultvalue'],
    filter: `schemaname eq ${odataString(schemaName)}`,
    orderBy: 'environmentvariabledefinitionid',
    pageSize: PAGE_SIZE,
  };
}

export function valueQuery(definitionId: string): ODataQuery {
  return {
    entitySet: 'environmentvariablevalues',
    select: ['environmentvariablevalueid', 'value'],
    filter: `_environmentvariabledefinitionid_value eq ${odataGuid(definitionId)} and statecode eq 0`,
    orderBy: 'environmentvariablevalueid',
    pageSize: PAGE_SIZE,
  };
}
