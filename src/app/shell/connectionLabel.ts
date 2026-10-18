import type { Connection, EnvironmentLabel } from '@/services/pptb/host.types';

const ENVIRONMENT_TEXT = {
  Dev: 'Development',
  Test: 'Test',
  UAT: 'UAT',
  Production: 'Production',
  Unknown: 'Unknown',
} as const satisfies Record<EnvironmentLabel, string>;

export function connectionLabel(c: Connection | null): string {
  return c === null ? 'Not connected' : `${c.name} · ${ENVIRONMENT_TEXT[c.environment]}`;
}
