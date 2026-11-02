import { describe, expect, it } from 'vitest';
import type { CheckId, CheckStatus, FileResult, Finding, ReviewKey } from '@/types/inspector';
import { CODE_READ_FAILURE, NOT_SCANNED_TEXT } from './copy';
import { file, permission, read, role, settings, siteFacts, value } from './fixtures';
import {
  canReviewFinding,
  countChecks,
  evaluateSite,
  filePill,
  fileSummary,
  ringLegend,
} from './rules';

const STATES: readonly CheckStatus[] = ['configured', 'needs-review', 'reviewed', 'not-scanned'];
const CHECKS: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];
const stateFinding = (check: CheckId, status: CheckStatus): Finding => ({
  check,
  status,
  hasUnscannedEvidence: status === 'not-scanned',
  summary: status,
  reasons: [],
  guidance: '',
  questions: [],
  detail: [],
});
const statesFile = (states: readonly [CheckStatus, CheckStatus, CheckStatus]): FileResult => ({
  fileId: 'file-1',
  name: 'file',
  active: true,
  findings: [
    stateFinding('webRole', states[0]),
    stateFinding('tablePermissions', states[1]),
    stateFinding('outbound', states[2]),
  ],
  snapshot: { roles: [], tables: [], outbound: [] },
});
const COMBINATIONS = STATES.flatMap((a) =>
  STATES.flatMap((b) => STATES.map((c) => [a, b, c] as const)),
);

describe('AC-8.1 all 64 state combinations', () => {
  it.each(COMBINATIONS)('%s / %s / %s', (a, b, c) => {
    const states = [a, b, c] as const;
    const file = statesFile(states);
    const C = states.filter((state) => state === 'configured').length;
    const V = states.filter((state) => state === 'reviewed').length;
    const M = states.filter((state) => state === 'needs-review').length;
    const U = states.filter((state) => state === 'not-scanned').length;
    const K = C + V;
    const counts = countChecks(file.findings);
    expect(counts).toEqual({ C, V, M, U, T: 3, K });
    expect(C + V + M + U).toBe(3);
    expect(ringLegend(counts)).toBe(
      `${String(C)} configured${V > 0 ? ` · ${String(V)} reviewed` : ''} · ${String(M)} review${U > 0 ? ` · ${String(U)} not scanned` : ''}`,
    );
    expect(filePill(file)).toBe(M > 0 ? 'Needs review' : U > 0 ? 'Incomplete' : 'Ready');
    expect(fileSummary(file)).toBe(
      C === 3
        ? 'All configured'
        : K === 3
          ? `Ready · ${String(V)} reviewed`
          : `${String(K)}/3 · ${String(M)} to review`,
    );
  });

  it('covers all combinations once and sums counts across any number of files', () => {
    expect(COMBINATIONS).toHaveLength(64);
    expect(new Set(COMBINATIONS.map((states) => states.join(':'))).size).toBe(64);
    expect(countChecks(COMBINATIONS.flatMap((states) => statesFile(states).findings))).toEqual({
      C: 48,
      V: 48,
      M: 48,
      U: 48,
      T: 192,
      K: 96,
    });
    expect(countChecks([])).toEqual({ C: 0, V: 0, M: 0, U: 0, T: 0, K: 0 });
  });
});

describe('AC-8.5 / AC-8.12 reviewability and preserved reasons', () => {
  it('marks only eligible Needs review and leaves the reasons and snapshot intact', () => {
    const facts = siteFacts({ files: [file({ roleIds: read([]) })] });
    const original = evaluateSite(facts, new Set());
    const reviewed = evaluateSite(facts, new Set<ReviewKey>(['file-1:webRole']));
    expect(reviewed.files[0]?.findings[0]).toEqual({
      ...original.files[0]?.findings[0],
      status: 'reviewed',
    });
    expect(reviewed.files[0]?.snapshot).toEqual(original.files[0]?.snapshot);
    expect(countChecks(reviewed.files[0]?.findings ?? []).K).toBe(
      countChecks(original.files[0]?.findings ?? []).K + 1,
    );
    expect(evaluateSite(facts, new Set()).files[0]?.findings[0]?.status).toBe('needs-review');
  });

  it('refuses every read failure even when a different reason leads the summary', () => {
    const facts = siteFacts({
      permissions: read([permission('global', { scope: 'Global' })]),
      files: [file({ code: { ok: false, reason: 'read-failed' } })],
    });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(['file-1:tablePermissions', 'file-1:outbound']),
    );
    expect(result.files[0]?.findings[1]?.status).toBe('needs-review');
    expect(result.files[0]?.findings[1]?.reasons).toContainEqual({
      text: CODE_READ_FAILURE,
      readFailure: true,
    });
    expect(
      canReviewFinding(
        result.files[0]?.findings[1] ?? stateFinding('tablePermissions', 'configured'),
      ),
    ).toBe(false);
  });

  it('allows analysis limits, but not Configured or Not scanned', () => {
    const facts = siteFacts({ files: [file({ code: read('') })] });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(['file-1:tablePermissions', 'file-1:outbound', 'file-1:webRole']),
    );
    expect(result.files[0]?.findings.map((finding) => finding.status)).toEqual([
      'configured',
      'reviewed',
      'reviewed',
    ]);
    expect(canReviewFinding(stateFinding('webRole', 'configured'))).toBe(false);
    expect(canReviewFinding(stateFinding('webRole', 'not-scanned'))).toBe(false);
    expect(canReviewFinding(stateFinding('webRole', 'reviewed'))).toBe(false);
  });

  it('keeps marks file-specific and evaluates inactive files too', () => {
    const facts = siteFacts({
      files: [
        file({ id: 'a', active: false, roleIds: read([]) }),
        file({ id: 'b', roleIds: read([]) }),
      ],
    });
    const result = evaluateSite(facts, new Set<ReviewKey>(['a:webRole']));
    expect(result.files[0]?.active).toBe(false);
    expect(result.files[0]?.findings[0]?.status).toBe('reviewed');
    expect(result.files[1]?.findings[0]?.status).toBe('needs-review');
  });
});

describe('AC-7.9 / AC-7.12 and interrupted-site banners', () => {
  it('includes setting/default-role, inventory and connection-loss banners', () => {
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/Enabled': value('false'),
          'ServerLogic/TimeoutInSeconds': value('241'),
        }),
      ),
      roles: read([role('a', { anonymous: true }), role('b', { anonymous: true })]),
      files: [file({ roleIds: read(['a']) })],
      inventoryComplete: false,
      stopped: 'connection-lost',
    });
    const result = evaluateSite(facts, new Set());
    expect(result.banners).toEqual([
      'Server logic is disabled on this site (`ServerLogic/Enabled` = false)',
      "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
      'More than one web role is marked as the Anonymous Users Role (`a`, `b`). Learn allows one per site.',
      'Inventory incomplete. Reconnect and rescan.',
      'Connection lost. Reconnect and rescan.',
    ]);
    expect(result.files).toHaveLength(1);
  });

  it('does not change checks for Enabled or timeout banners', () => {
    const base = siteFacts();
    const changed = {
      ...base,
      settings: read(
        settings({
          'ServerLogic/Enabled': value('false'),
          'ServerLogic/TimeoutInSeconds': value('bad'),
        }),
      ),
    };
    expect(
      evaluateSite(base, new Set()).files[0]?.findings.map((finding) => finding.status),
    ).toEqual(evaluateSite(changed, new Set()).files[0]?.findings.map((finding) => finding.status));
  });

  it('retains the Not scanned text and every unaffected check', () => {
    const facts = siteFacts({
      files: [file({ code: { ok: false, reason: 'not-scanned' } })],
      stopped: 'connection-lost',
    });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(CHECKS.map((check): ReviewKey => `file-1:${check}`)),
    );
    expect(result.files[0]?.findings[0]?.status).toBe('configured');
    expect(result.files[0]?.findings[1]?.summary).toBe(NOT_SCANNED_TEXT);
    expect(result.files[0]?.findings[2]?.status).toBe('not-scanned');
  });
});
