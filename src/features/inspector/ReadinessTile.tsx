import type { ReactElement } from 'react';
import { Ring } from '@/components/Ring';
import { Tile } from '@/components/Tile';
import type { RingState } from '@/lib/ringGeometry';
import type { CheckStatus, FileResult } from '@/types/inspector';
import { countChecks, ringLegend } from './model/rules';

// Configured and Reviewed both count toward K (AC-8.1); Not scanned is its own grey segment.
const RING_STATE = {
  configured: 'done',
  reviewed: 'done',
  'needs-review': 'review',
  'not-scanned': 'not-scanned',
} as const satisfies Record<CheckStatus, RingState>;

/** The readiness ring: "K/3 addressed" with the legend "C configured · V reviewed · M review" (AC-8.1). */
export function ReadinessTile({ file }: { file: FileResult }): ReactElement {
  return (
    <Tile className="inspector-ring" heading="Readiness">
      <Ring
        segments={file.findings.map((finding) => RING_STATE[finding.status])}
        label="addressed"
        size={156}
      />
      <p className="inspector-ring__legend">{ringLegend(countChecks(file.findings))}</p>
    </Tile>
  );
}
