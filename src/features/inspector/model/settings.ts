import type { Reason, SettingName, SettingValue, SiteFacts } from '@/types/inspector';
import { ENVVAR_CACHE_NOTE, envVarFailureText, NOT_SCANNED_TEXT, TIMEOUT_NOTE } from './copy';

export const SETTING_NAMES: readonly SettingName[] = [
  'ServerLogic/Enabled',
  'ServerLogic/AllowedDomains',
  'ServerLogic/AllowNetworkingToAllDomains',
  'ServerLogic/TimeoutInSeconds',
];

export type ParsedSetting<T> = {
  value: T | null;
  reasons: readonly Reason[];
  fromEnvVar: boolean;
  notScanned: boolean;
};
export type DomainList = { hosts: readonly string[]; wildcards: readonly string[] };

export function normalizeSettingName(raw: string): SettingName | null {
  const name = raw.trim().toLowerCase();
  return SETTING_NAMES.find((candidate) => candidate.toLowerCase() === name) ?? null;
}

function result<T>(
  value: T | null,
  reasons: readonly Reason[] = [],
  fromEnvVar = false,
  notScanned = false,
): ParsedSetting<T> {
  return { value, reasons, fromEnvVar, notScanned };
}

function unavailable<T>(name: SettingName, setting: SettingValue): ParsedSetting<T> | null {
  if (setting.kind === 'duplicate') {
    return result<T>(null, [{ text: `Duplicate \`${name}\``, readFailure: false }]);
  }
  if (setting.kind === 'envvar-unreadable') {
    return result<T>(
      null,
      [{ text: envVarFailureText(name, setting.cause), readFailure: true }],
      true,
    );
  }
  return setting.kind === 'not-scanned' ? result<T>(null, [], true, true) : null;
}

export function parseBooleanSetting(
  name: 'ServerLogic/Enabled' | 'ServerLogic/AllowNetworkingToAllDomains',
  setting: SettingValue,
): ParsedSetting<boolean> {
  const missing = unavailable<boolean>(name, setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result(true);
  if (setting.kind !== 'value') return result<boolean>(null);
  const raw = setting.raw.trim().toLowerCase();
  return raw === 'true' || raw === 'false'
    ? result(raw === 'true', [], setting.fromEnvVar)
    : result<boolean>(
        null,
        [{ text: `Couldn't interpret \`${name}\``, readFailure: false }],
        setting.fromEnvVar,
      );
}

export function parseAllowedDomains(setting: SettingValue): ParsedSetting<DomainList> {
  const name = 'ServerLogic/AllowedDomains';
  const missing = unavailable<DomainList>(name, setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result({ hosts: [], wildcards: [] });
  if (setting.kind !== 'value') return result<DomainList>(null);
  const raw = setting.raw.trim();
  const entries =
    raw === 'All domains allowed'
      ? []
      : raw
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
  const invalid = entries.filter(
    (entry) => !/^(\*\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/.test(entry),
  );
  if (invalid.length > 0) {
    return result<DomainList>(
      null,
      invalid.map((entry) => ({
        text: `Couldn't interpret \`${name}\`: \`${entry}\``,
        readFailure: false,
      })),
      setting.fromEnvVar,
    );
  }
  return result(
    {
      hosts: entries.filter((entry) => !entry.startsWith('*.')),
      wildcards: entries.filter((entry) => entry.startsWith('*.')),
    },
    [],
    setting.fromEnvVar,
  );
}

export function parseTimeout(setting: SettingValue): ParsedSetting<number> {
  const missing = unavailable<number>('ServerLogic/TimeoutInSeconds', setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result(120);
  if (setting.kind !== 'value') return result<number>(null);
  const raw = setting.raw.trim();
  const seconds = Number(raw);
  return /^[0-9]+$/.test(raw) && seconds >= 1 && seconds <= 240
    ? result(seconds, [], setting.fromEnvVar)
    : result<number>(
        null,
        [
          {
            text: "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
            readFailure: false,
          },
        ],
        setting.fromEnvVar,
      );
}

export function settingBanners(facts: SiteFacts): readonly string[] {
  if (!facts.settings.ok) {
    return facts.settings.reason === 'not-scanned'
      ? []
      : ["Couldn't read `ServerLogic/Enabled`", "Couldn't read `ServerLogic/TimeoutInSeconds`"];
  }
  const enabled = parseBooleanSetting(
    'ServerLogic/Enabled',
    facts.settings.value['ServerLogic/Enabled'],
  );
  const timeout = parseTimeout(facts.settings.value['ServerLogic/TimeoutInSeconds']);
  return [
    ...enabled.reasons.map((reason) => reason.text),
    ...(enabled.value === false
      ? ['Server logic is disabled on this site (`ServerLogic/Enabled` = false)']
      : []),
    ...timeout.reasons.map((reason) => reason.text),
  ];
}

export function settingSnapshot(facts: SiteFacts): readonly string[] {
  if (!facts.settings.ok) {
    return [
      facts.settings.reason === 'not-scanned' ? NOT_SCANNED_TEXT : "Couldn't read configuration",
    ];
  }
  const lines = SETTING_NAMES.map((name) => {
    const setting = facts.settings.ok ? facts.settings.value[name] : { kind: 'absent' as const };
    if (setting.kind === 'value')
      return `\`${name}\` = ${setting.raw.trim()}${setting.fromEnvVar ? ' (environment variable)' : ''}`;
    if (setting.kind === 'duplicate') return `Duplicate \`${name}\``;
    if (setting.kind === 'envvar-unreadable') return envVarFailureText(name, setting.cause);
    if (setting.kind === 'not-scanned') return `\`${name}\`: ${NOT_SCANNED_TEXT}`;
    const fallback =
      name === 'ServerLogic/AllowedDomains'
        ? 'no allow list'
        : name === 'ServerLogic/TimeoutInSeconds'
          ? '120'
          : 'true';
    return `\`${name}\` = ${fallback} (default)`;
  });
  const values = Object.values(facts.settings.value);
  const timeout = parseTimeout(facts.settings.value['ServerLogic/TimeoutInSeconds']);
  return [
    ...lines,
    ...facts.inactiveSettings.map((name) => `\`${name}\` (inactive, ignored)`),
    ...(values.some(
      (setting) =>
        setting.kind === 'envvar-unreadable' ||
        setting.kind === 'not-scanned' ||
        (setting.kind === 'value' && setting.fromEnvVar),
    )
      ? [ENVVAR_CACHE_NOTE]
      : []),
    ...(timeout.value !== null && timeout.value > 120 ? [TIMEOUT_NOTE] : []),
  ];
}
