import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SettingName, SettingValue, SiteFacts, TablePermissionFact } from '@/types/inspector';
import type { AccessType } from '@/types/recipe';
import { ENVVAR_CACHE_NOTE, TIMEOUT_NOTE } from './copy';
import { read, settings, siteFacts, value } from './fixtures';
import {
  normalizeSettingName,
  parseAllowedDomains,
  parseBooleanSetting,
  parseTimeout,
  SETTING_NAMES,
  settingBanners,
  settingSnapshot,
} from './settings';

describe('FR-7 settings contract', () => {
  it('models unknown scope, ignored settings and interrupted envvar reads', () => {
    expectTypeOf<TablePermissionFact['scope']>().toEqualTypeOf<AccessType | null>();
    expectTypeOf<SiteFacts['inactiveSettings']>().toEqualTypeOf<readonly SettingName[]>();
    expectTypeOf<Extract<SettingValue, { kind: 'not-scanned' }>>().toEqualTypeOf<{
      kind: 'not-scanned';
    }>();
  });

  it.each(SETTING_NAMES)('matches a trimmed, case-insensitive %s', (name) => {
    expect(normalizeSettingName(`  ${name.toUpperCase()}  `)).toBe(name);
  });

  it.each(['', 'ServerLogic/Other', 'xServerLogic/Enabled', 'ServerLogic/Enabled/'])(
    'rejects %s',
    (raw) => {
      expect(normalizeSettingName(raw)).toBeNull();
    },
  );

  it.each([
    [' true ', true],
    ['FALSE', false],
    ['TrUe', true],
    ['\tfalse\n', false],
  ])('normalizes boolean %s', (raw, expected) => {
    expect(parseBooleanSetting('ServerLogic/Enabled', value(raw)).value).toBe(expected);
  });

  it.each(['', '1', 'yes', 'true false'])('flags boolean %s', (raw) => {
    expect(
      parseBooleanSetting('ServerLogic/AllowNetworkingToAllDomains', value(raw)).reasons,
    ).toEqual([
      { text: "Couldn't interpret `ServerLogic/AllowNetworkingToAllDomains`", readFailure: false },
    ]);
  });

  it.each(['ServerLogic/Enabled', 'ServerLogic/AllowNetworkingToAllDomains'] as const)(
    'defaults %s only after a successful query',
    (name) => {
      expect(parseBooleanSetting(name, { kind: 'absent' }).value).toBe(true);
      expect(parseBooleanSetting(name, { kind: 'duplicate' }).reasons[0]?.text).toBe(
        `Duplicate \`${name}\``,
      );
      expect(parseBooleanSetting(name, { kind: 'envvar-unreadable', cause: 'failed' }).reasons).toEqual([
        { text: `Couldn't read \`${name}\` from its environment variable`, readFailure: true },
      ]);
      expect(parseBooleanSetting(name, { kind: 'not-scanned' }).notScanned).toBe(true);
    },
  );
});

describe('FR-7 strict AllowedDomains', () => {
  it.each(['', ' , , ', 'All domains allowed', '  All domains allowed  '])(
    'treats %s as no list',
    (raw) => {
      expect(parseAllowedDomains(value(raw)).value).toEqual({ hosts: [], wildcards: [] });
    },
  );

  it('trims comma entries, drops empty entries and separates wildcards', () => {
    expect(
      parseAllowedDomains(value(' api.example.com, , *.example.com, LOCAL-HOST ')).value,
    ).toEqual({
      hosts: ['api.example.com', 'LOCAL-HOST'],
      wildcards: ['*.example.com'],
    });
    expect(parseAllowedDomains({ kind: 'absent' }).value).toEqual({ hosts: [], wildcards: [] });
  });

  it.each([
    'https://api.example.com',
    'api.example.com/path',
    'api.example.com:443',
    'api .example.com',
    '*',
    'api.*.com',
    '.example.com',
    'a..b',
    'example.com/',
    'éxample.com',
  ])('names invalid entry %s', (raw) => {
    const parsed = parseAllowedDomains(value(`good.example.com, ${raw}`));
    expect(parsed.value).toBeNull();
    expect(parsed.reasons[0]?.text).toBe(
      `Couldn't interpret \`ServerLogic/AllowedDomains\`: \`${raw}\``,
    );
    expect(parsed.reasons[0]?.readFailure).toBe(false);
  });
});

describe('AC-7.9 / AC-7.12 banners and snapshot', () => {
  it.each(['1', '120', '121', '240', '0001', ' 0240 '])('accepts timeout %s', (raw) => {
    expect(parseTimeout(value(raw)).value).toBe(Number(raw.trim()));
    expect(parseTimeout(value(raw)).reasons).toEqual([]);
  });

  it.each(['', '0', '241', '-1', '+1', '1.0', '1e2', '0x10', 'NaN', '1 2'])(
    'flags timeout %s',
    (raw) => {
      expect(parseTimeout(value(raw)).reasons[0]?.text).toBe(
        "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
      );
    },
  );

  it('defaults to 120, banners only failures and keeps 121–240 as a note', () => {
    expect(parseTimeout({ kind: 'absent' }).value).toBe(120);
    expect(settingBanners(siteFacts())).toEqual([]);
    const facts = siteFacts({
      settings: read(settings({ 'ServerLogic/TimeoutInSeconds': value('121') })),
    });
    expect(settingBanners(facts)).toEqual([]);
    expect(settingSnapshot(facts)).toContain(TIMEOUT_NOTE);
  });

  it.each([
    [{ kind: 'duplicate' }, 'Duplicate `ServerLogic/TimeoutInSeconds`'],
    [
      { kind: 'envvar-unreadable', cause: 'failed' },
      "Couldn't read `ServerLogic/TimeoutInSeconds` from its environment variable",
    ],
    [value('false'), "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240"],
  ] satisfies readonly (readonly [SettingValue, string])[])(
    'banners timeout %j',
    (setting, message) => {
      expect(
        settingBanners(
          siteFacts({ settings: read(settings({ 'ServerLogic/TimeoutInSeconds': setting })) }),
        ),
      ).toEqual([message]);
    },
  );

  it('banners disabled, invalid, duplicate and unreadable Enabled', () => {
    const cases: readonly (readonly [SettingValue, string])[] = [
      [value('false'), 'Server logic is disabled on this site (`ServerLogic/Enabled` = false)'],
      [value(''), "Couldn't interpret `ServerLogic/Enabled`"],
      [{ kind: 'duplicate' }, 'Duplicate `ServerLogic/Enabled`'],
      [
        { kind: 'envvar-unreadable', cause: 'failed' },
        "Couldn't read `ServerLogic/Enabled` from its environment variable",
      ],
    ];
    for (const [setting, message] of cases) {
      expect(
        settingBanners(siteFacts({ settings: read(settings({ 'ServerLogic/Enabled': setting })) })),
      ).toEqual([message]);
    }
  });

  it('never applies reassuring defaults after a failed or interrupted read', () => {
    const failed = siteFacts({ settings: { ok: false, reason: 'read-failed' } });
    expect(settingBanners(failed)).toEqual([
      "Couldn't read `ServerLogic/Enabled`",
      "Couldn't read `ServerLogic/TimeoutInSeconds`",
    ]);
    expect(settingSnapshot(failed)).toEqual(["Couldn't read configuration"]);
    expect(settingBanners(siteFacts({ settings: { ok: false, reason: 'not-scanned' } }))).toEqual(
      [],
    );
    expect(
      settingBanners(
        siteFacts({
          settings: read(
            settings({
              'ServerLogic/Enabled': { kind: 'not-scanned' },
              'ServerLogic/TimeoutInSeconds': { kind: 'not-scanned' },
            }),
          ),
        }),
      ),
    ).toEqual([]);
  });

  it('labels inactive settings and envvar cache without displaying unread values', () => {
    const facts = siteFacts({
      settings: read(settings({ 'ServerLogic/AllowedDomains': value('api.example.com', true) })),
      inactiveSettings: ['ServerLogic/Enabled'],
    });
    expect(settingSnapshot(facts)).toContain('`ServerLogic/Enabled` (inactive, ignored)');
    expect(settingSnapshot(facts)).toContain(
      '`ServerLogic/AllowedDomains` = api.example.com (environment variable)',
    );
    expect(settingSnapshot(facts)).toContain(ENVVAR_CACHE_NOTE);
  });
});
