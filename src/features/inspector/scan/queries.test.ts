import { describe, expect, it } from 'vitest';
import { buildQueryPath } from '@/services/pptb/dataverseRead';
import {
  COMPONENT_TYPE,
  componentQuery,
  definitionQuery,
  odataGuid,
  odataString,
  SITES_QUERY,
  valueQuery,
} from './queries';

const SITE = '0A1B2C3D-0000-4000-8000-000000000001';
const DEFINITION = '0a1b2c3d-0000-4000-8000-000000000002';

describe('odataString', () => {
  it.each([
    ['plain', "'plain'"],
    ["O'Brien", "'O''Brien'"],
    ["'", "''''"],
    ['', "''"],
    ['has space', "'has%20space'"],
    ['a&b#c', "'a%26b%23c'"],
    ['100%', "'100%25'"],
    ['a+b', "'a%2Bb'"],
    ["it's a&b", "'it''s%20a%26b'"],
  ])('writes %j as %s', (value, literal) => {
    expect(odataString(value)).toBe(literal);
  });

  it.each(['a\nb', 'a\tb', 'a\u0000b', 'a\ud800b'])('refuses %j', (value) => {
    expect(() => odataString(value)).toThrow(RangeError);
  });
});

describe('odataGuid', () => {
  it('inserts a GUID bare, whatever its case', () => {
    expect(odataGuid(SITE)).toBe(SITE);
  });

  it.each(['', 'not-a-guid', `${SITE}'`, `'${SITE}'`, `${SITE} or 1 eq 1`])('refuses %j', (value) => {
    expect(() => odataGuid(value)).toThrow(RangeError);
  });
});

describe('query builders', () => {
  it('lists sites with an explicit select and a deterministic order', () => {
    expect(buildQueryPath(SITES_QUERY)).toBe(
      'powerpagesites?$select=powerpagesiteid,name,primarydomainname,statecode&$orderby=name,powerpagesiteid',
    );
  });

  it.each([
    ['serverLogic', 35],
    ['webRole', 11],
    ['tablePermission', 18],
    ['siteSetting', 9],
  ] as const)('reads every %s row of the site and nothing else', (key, type) => {
    expect(COMPONENT_TYPE[key]).toBe(type);
    expect(buildQueryPath(componentQuery(SITE, COMPONENT_TYPE[key]))).toBe(
      'powerpagecomponents?$select=powerpagecomponentid,name,content,statecode,powerpagecomponenttype' +
        `&$filter=_powerpagesiteid_value eq ${SITE} and powerpagecomponenttype eq ${String(type)}` +
        '&$orderby=name,powerpagecomponentid',
    );
  });

  it('reads site settings without a name filter', () => {
    expect(componentQuery(SITE, COMPONENT_TYPE.siteSetting).filter).not.toContain('ServerLogic');
  });

  it('writes the environment-variable schema name as an escaped literal', () => {
    expect(buildQueryPath(definitionQuery("cfg_O'Brien"))).toBe(
      'environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,type,defaultvalue' +
        "&$filter=schemaname eq 'cfg_O''Brien'&$orderby=environmentvariabledefinitionid",
    );
  });

  it('encodes a schema name that needs it and still passes the adapter check', () => {
    expect(buildQueryPath(definitionQuery('a b&c'))).toContain("$filter=schemaname eq 'a%20b%26c'&");
  });

  it('reads only active values of one definition', () => {
    expect(buildQueryPath(valueQuery(DEFINITION))).toBe(
      'environmentvariablevalues?$select=environmentvariablevalueid,value' +
        `&$filter=_environmentvariabledefinitionid_value eq ${DEFINITION} and statecode eq 0` +
        '&$orderby=environmentvariablevalueid',
    );
  });

  it('refuses a site id that is not a GUID', () => {
    expect(() => componentQuery("x' or 1 eq 1", COMPONENT_TYPE.webRole)).toThrow(RangeError);
  });
});
