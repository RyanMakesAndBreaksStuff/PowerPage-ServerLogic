import type { ReactElement } from 'react';
import { Pill } from '@/components/Pill';

// Part A placeholder: always disabled (AC-1.3, AC-1.7). plan-inspector.md replaces this file with the picker (AC-7.2).
export function SitePill(): ReactElement {
  return (
    <Pill compact aria-disabled="true" className="shell__site">
      No site selected
    </Pill>
  );
}
