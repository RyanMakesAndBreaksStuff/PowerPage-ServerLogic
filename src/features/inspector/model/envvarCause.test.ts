import { describe, expect, it } from 'vitest';
import type { EnvVarCause, SettingValue } from '@/types/inspector';
import { envVarFailureText } from './copy';
import { read, settings, siteFacts } from './fixtures';
import {
  parseAllowedDomains,
  parseBooleanSetting,
  parseTimeout,
  settingBanners,
  settingSnapshot,
} from './settings';

const NAME = 'ServerLogic/AllowedDomains';

const CASES = [
  ['secret', "Couldn't read `ServerLogic/AllowedDomains`: its environment variable is a secret"],
  [
    'missing',
    "Couldn't read `ServerLogic/AllowedDomains`: its environment variable isn't defined or has no value",
  ],
  [
    'denied',
    "Couldn't read `ServerLogic/AllowedDomains`: access to its environment variable was denied",
  ],
  ['failed', "Couldn't read `ServerLogic/AllowedDomains` from its environment variable"],
] as const satisfies readonly (readonly [EnvVarCause, string])[];

describe('environment-variable failure causes (R-15 option B)', () => {
  it.each(CASES)('renders %s as its own text', (cause, text) => {
    expect(envVarFailureText(NAME, cause)).toBe(text);
  });

  it.each(CASES)('keeps the %s cause a read failure in the parsed setting', (cause, text) => {
    const parsed = parseAllowedDomains({ kind: 'envvar-unreadable', cause });
    expect(parsed.reasons).toEqual([{ text, readFailure: true }]);
    expect(parsed.fromEnvVar).toBe(true);
  });

  it.each(CASES)('writes the %s text into the snapshot line', (cause, text) => {
    const facts = siteFacts({
      settings: read(settings({ [NAME]: { kind: 'envvar-unreadable', cause } })),
    });
    expect(settingSnapshot(facts)).toContain(text);
  });

  it('applies the cause text to the Boolean and Timeout settings and banners', () => {
    const unreadable: SettingValue = { kind: 'envvar-unreadable', cause: 'denied' };
    expect(parseBooleanSetting('ServerLogic/Enabled', unreadable).reasons[0]?.text).toBe(
      "Couldn't read `ServerLogic/Enabled`: access to its environment variable was denied",
    );
    expect(parseTimeout(unreadable).reasons[0]?.text).toContain(
      'access to its environment variable was denied',
    );
    const facts = siteFacts({ settings: read(settings({ 'ServerLogic/Enabled': unreadable })) });
    expect(settingBanners(facts)).toEqual([
      "Couldn't read `ServerLogic/Enabled`: access to its environment variable was denied",
    ]);
  });
});
