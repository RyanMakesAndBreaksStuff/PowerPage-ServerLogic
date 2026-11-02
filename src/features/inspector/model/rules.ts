import type {
  Counts,
  FileResult,
  Finding,
  ReviewKey,
  SiteFacts,
  SiteResult,
} from '@/types/inspector';
import { evaluateFileChecks } from './checks';
import { defaultRoleBanners } from './grantSet';
import { settingBanners } from './settings';

export function canReviewFinding(finding: Finding): boolean {
  return (
    finding.status === 'needs-review' &&
    !finding.hasUnscannedEvidence &&
    !finding.reasons.some((reason) => reason.readFailure)
  );
}

export function evaluateSite(facts: SiteFacts, marks: ReadonlySet<ReviewKey>): SiteResult {
  const files = facts.files.map((file) => {
    const result = evaluateFileChecks(facts, file);
    const mark = (finding: Finding): Finding =>
      marks.has(`${file.id}:${finding.check}`) && canReviewFinding(finding)
        ? { ...finding, status: 'reviewed' }
        : finding;
    return {
      ...result,
      findings: [
        mark(result.findings[0]),
        mark(result.findings[1]),
        mark(result.findings[2]),
      ] as const,
    };
  });
  return {
    facts,
    files,
    banners: [
      ...settingBanners(facts),
      ...defaultRoleBanners(facts),
      ...(!facts.inventoryComplete ? ['Inventory incomplete. Reconnect and rescan.'] : []),
      ...(facts.stopped === 'connection-lost' ? ['Connection lost. Reconnect and rescan.'] : []),
    ],
  };
}

export function countChecks(findings: readonly Finding[]): Counts {
  const C = findings.filter((finding) => finding.status === 'configured').length;
  const V = findings.filter((finding) => finding.status === 'reviewed').length;
  const M = findings.filter((finding) => finding.status === 'needs-review').length;
  const U = findings.filter((finding) => finding.status === 'not-scanned').length;
  return { C, V, M, U, T: findings.length, K: C + V };
}

export function ringLegend(counts: Counts): string {
  return `${String(counts.C)} configured${counts.V > 0 ? ` · ${String(counts.V)} reviewed` : ''} · ${String(counts.M)} review${counts.U > 0 ? ` · ${String(counts.U)} not scanned` : ''}`;
}

export function fileSummary(f: FileResult): string {
  const { C, V, M, K } = countChecks(f.findings);
  return C === 3
    ? 'All configured'
    : K === 3
      ? `Ready · ${String(V)} reviewed`
      : `${String(K)}/3 · ${String(M)} to review`;
}

export function filePill(f: FileResult): 'Ready' | 'Needs review' | 'Incomplete' {
  const { M, U } = countChecks(f.findings);
  return M > 0 ? 'Needs review' : U > 0 ? 'Incomplete' : 'Ready';
}
