import { describe, expect, it } from 'vitest';
import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';
import { connectionLabel } from './connectionLabel';

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
