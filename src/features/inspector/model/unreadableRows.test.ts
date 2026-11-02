import { describe, expect, it } from 'vitest';
import type { Finding, ReviewKey, SiteFacts, UnreadableRow } from '@/types/inspector';
import { unreadableRowsBanner } from './copy';
import { read, role, siteFacts } from './fixtures';
import { canReviewFinding, evaluateSite } from './rules';

const ROLE_ROW: UnreadableRow = { type: 11, id: 'role-9', name: 'broken-role' };
const PERMISSION_ROW: UnreadableRow = { type: 18, id: 'perm-9', name: 'broken-perm' };
const NO_NAME: UnreadableRow = { type: 18, id: 'perm-8', name: '' };

const ONE_ROW =
  "1 web role or table permission row couldn't be read and was skipped: `broken-role`. Findings were graded without it; fix the row and rescan.";
const TWO_ROWS =
  "2 web role or table permission rows couldn't be read and were skipped: `broken-role`, `broken-perm`. Findings were graded without them; fix the rows and rescan.";

function findingsOf(facts: SiteFacts): readonly Finding[] {
  return evaluateSite(facts, new Set<ReviewKey>()).files[0]?.findings ?? [];
}

describe('skipped role and permission rows (R-14 option B)', () => {
  it('leaves a site without skipped rows exactly as it was, with no banner', () => {
    const result = evaluateSite(siteFacts(), new Set<ReviewKey>());
    expect(result.files[0]?.findings.map((item) => item.status)).toEqual([
      'configured',
      'configured',
      'configured',
    ]);
    expect(result.banners).toEqual([]);
  });

  it.each([
    ['role', ROLE_ROW],
    ['permission', PERMISSION_ROW],
  ] as const)(
    'grades every finding of a site with a skipped %s row exactly as the clean site',
    (_label, row) => {
      const clean = findingsOf(siteFacts());
      const skipped = findingsOf(siteFacts({ unreadableRows: [row] }));
      expect(skipped).toEqual(clean);
      expect(skipped.map((item) => item.status)).toEqual(['configured', 'configured', 'configured']);
      expect(skipped.map((item) => item.hasUnscannedEvidence)).toEqual([false, false, false]);
      expect(skipped.map((item) => canReviewFinding(item))).toEqual(
        clean.map((item) => canReviewFinding(item)),
      );
    },
  );

  it('keeps a Needs review finding graded and reviewable, as on the clean site', () => {
    const rows = { roles: read([role('staff', { anonymous: true })]) };
    const clean = findingsOf(siteFacts(rows));
    const skipped = findingsOf(siteFacts({ ...rows, unreadableRows: [ROLE_ROW, PERMISSION_ROW] }));
    expect(skipped).toEqual(clean);
    const web = skipped[0];
    expect(web?.status).toBe('needs-review');
    expect(web?.summary).toBe('Callable by unauthenticated visitors.');
    expect(web?.hasUnscannedEvidence).toBe(false);
    expect(web !== undefined && canReviewFinding(web)).toBe(true);
    const marked = evaluateSite(
      siteFacts({ ...rows, unreadableRows: [ROLE_ROW] }),
      new Set<ReviewKey>(['file-1:webRole']),
    );
    expect(marked.files[0]?.findings[0]?.status).toBe('reviewed');
  });

  it('adds one banner naming a single skipped row', () => {
    const result = evaluateSite(siteFacts({ unreadableRows: [ROLE_ROW] }), new Set<ReviewKey>());
    expect(result.banners).toEqual([ONE_ROW]);
  });

  it('adds one banner naming several skipped rows in row order', () => {
    const result = evaluateSite(
      siteFacts({ unreadableRows: [ROLE_ROW, PERMISSION_ROW] }),
      new Set<ReviewKey>(),
    );
    expect(result.banners).toEqual([TWO_ROWS]);
  });

  it('names a row without a name by its id', () => {
    const result = evaluateSite(siteFacts({ unreadableRows: [NO_NAME] }), new Set<ReviewKey>());
    expect(result.banners).toEqual([
      "1 web role or table permission row couldn't be read and was skipped: `perm-8`. Findings were graded without it; fix the row and rescan.",
    ]);
  });

  it('keeps the banner ahead of the inventory and connection banners', () => {
    const result = evaluateSite(
      siteFacts({ unreadableRows: [ROLE_ROW], inventoryComplete: false, stopped: 'connection-lost' }),
      new Set<ReviewKey>(),
    );
    expect(result.banners).toEqual([
      ONE_ROW,
      'Inventory incomplete. Reconnect and rescan.',
      'Connection lost. Reconnect and rescan.',
    ]);
  });

  it('builds the banner text from the rows', () => {
    expect(unreadableRowsBanner([ROLE_ROW])).toBe(ONE_ROW);
    expect(unreadableRowsBanner([ROLE_ROW, PERMISSION_ROW])).toBe(TWO_ROWS);
    expect(unreadableRowsBanner([ROLE_ROW, NO_NAME, PERMISSION_ROW])).toBe(
      "3 web role or table permission rows couldn't be read and were skipped: `broken-role`, `perm-8`, `broken-perm`. Findings were graded without them; fix the rows and rescan.",
    );
  });
});
