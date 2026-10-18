import type { CheckStatus } from '@/types/inspector';
import type { StatusBadgeProps } from './StatusBadge';

export function checkStatusBadge(status: CheckStatus): StatusBadgeProps {
  switch (status) {
    case 'configured':
      return { kind: 'ok', label: 'Configured' };
    case 'reviewed':
      return { kind: 'ok', label: 'Reviewed' };
    case 'needs-review':
      return { kind: 'review', label: 'Needs review' };
    case 'not-scanned':
      return { kind: 'unknown', label: 'Not scanned' };
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}
