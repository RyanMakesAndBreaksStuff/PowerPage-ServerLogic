import { describe, expect, it } from 'vitest';
import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';
import type { ConnectionState } from '@/session/useActiveConnection';
import { connectionLabel, connectionStateLabel } from './connectionLabel';

const at = (environment: EnvironmentLabel): Connection => ({
  id: 'c1',
  name: 'Contoso',
  url: 'https://contoso.crm.dynamics.com',
  environment,
});

describe('connectionLabel', () => {
  it('reads "Not connected" without a connection (AC-1.3)', () => {
    expect(connectionLabel(null)).toBe('Not connected');
  });

  it.each([
    ['Dev', 'Contoso · Development'],
    ['Test', 'Contoso · Test'],
    ['UAT', 'Contoso · UAT'],
    ['Production', 'Contoso · Production'],
    ['Unknown', 'Contoso · Unknown'],
  ] as const)('shows %s as "%s" (AC-1.2)', (environment, expected) => {
    expect(connectionLabel(at(environment))).toBe(expected);
  });
});

describe('connectionStateLabel', () => {
  it.each([
    [{ status: 'connected', connection: at('Dev'), refreshFailed: false }, 'Contoso · Development'],
    [{ status: 'connected', connection: at('Dev'), refreshFailed: true }, 'Contoso · Development'],
    [{ status: 'disconnected', refreshFailed: false }, 'Not connected'],
    [{ status: 'unknown', refreshFailed: false }, 'Checking connection…'],
    [{ status: 'unknown', refreshFailed: true }, 'Connection unavailable'],
  ] as const satisfies readonly (readonly [ConnectionState, string])[])(
    'labels %j as "%s"',
    (state, expected) => {
      expect(connectionStateLabel(state)).toBe(expected);
    },
  );
});
