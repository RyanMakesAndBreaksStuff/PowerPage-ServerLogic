import type { CheckId } from '@/types/inspector';

export type CheckCopy = {
  title: string;
  category: string;
  guidance: string;
  questions: readonly string[];
};

export const CHECK_COPY: Readonly<Record<CheckId, CheckCopy>> = {
  webRole: {
    title: 'Web role assigned',
    category: 'Web role',
    guidance:
      'Assign a web role that the intended callers hold. Review anonymous access before release.',
    questions: [
      'Who should be able to call this handler?',
      'Should unauthenticated visitors have access?',
    ],
  },
  tablePermissions: {
    title: 'Table permissions',
    category: 'Table permissions',
    guidance:
      'Review the grant set for the intended callers. Confirm effective access with a real site user.',
    questions: [
      'Are these privileges and access types the minimum this handler needs?',
      'Have you tested access with a real site user?',
    ],
  },
  outbound: {
    title: 'Outbound networking',
    category: 'Outbound networking',
    guidance:
      'Limit outbound networking to the hosts this handler calls and review tenant policy separately.',
    questions: [
      'Do these domains cover every host this handler calls?',
      'Has tenant outbound policy been reviewed separately?',
    ],
  },
};

export const OTHER_ROLES_NOTE = "Other roles a user may hold aren't assessed.";
export const FLOW_NOTE =
  "Cloud flows (`CloudFlow.TriggerAsync`) aren't checked; their connections and network access are configured in the flow.";
export const ENVVAR_CACHE_NOTE =
  'The site uses a cached copy of environment-variable values until it restarts, so a recent change may not be live yet.';
export const TIMEOUT_NOTE =
  "Microsoft's Power Pages plugin reports that values above 120 are clamped to 120. Learn allows up to 240.";
export const TENANT_POLICY_NOTE =
  "Tenant outbound policy: not verified. This tool doesn't read tenant network policy.";
export const NOT_SCANNED_TEXT = 'Not read before the connection was lost';
export const CODE_READ_FAILURE = "Couldn't read handler code";
export const CODE_ANALYSIS_LIMIT = "Couldn't analyse handler code";
export const CONNECTORS_UNKNOWN = "Couldn't determine which connectors the code uses.";
