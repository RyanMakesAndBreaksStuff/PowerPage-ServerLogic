import type {
  Counts,
  FileResult,
  Finding,
  ReviewKey,
  SiteFacts,
  SiteResult,
} from '@/types/inspector';

export function evaluateSite(_facts: SiteFacts, _marks: ReadonlySet<ReviewKey>): SiteResult {
  throw new Error('not implemented: phase 11');
}

export function countChecks(_findings: readonly Finding[]): Counts {
  throw new Error('not implemented: phase 11');
}

export function fileSummary(_f: FileResult): string {
  throw new Error('not implemented: phase 11');
}

export function filePill(_f: FileResult): 'Ready' | 'Needs review' | 'Incomplete' {
  throw new Error('not implemented: phase 11');
}
