import { useState } from 'react';
import type { ReactElement, Ref } from 'react';
import { useInspector } from '@/session/useInspector';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Tile } from '@/components/Tile';
import type { CheckId, ReviewKey, SiteResult } from '@/types/inspector';
import { FilesRail } from './FilesRail';
import { FindingDetail } from './FindingDetail';
import { FindingTile } from './FindingTile';
import { CHECK_COPY } from './model/copy';
import {
  EXPORT_IN_PROGRESS_REASON,
  EXPORT_NO_FILES_REASON,
  EXPORT_NOTHING_READ_REASON,
  NO_FILE_TEXT,
  plain,
} from './pageCopy';
import { ReadinessTile } from './ReadinessTile';

export type ResultsViewProps = {
  result: SiteResult;
  /** The title heading: the page moves focus here after Retry in the refresh-failed notice hides itself. */
  headingRef: Ref<HTMLHeadingElement>;
  /** Scan again. The page wraps `session.rescan` so that focus follows to the scanning panel's heading. */
  onRescan: () => void;
  /** Opens the export dialog; null when the result has no files to export. */
  onExport: (() => void) | null;
  /** An export job exists (its dialog may be closed while it finishes), so a second one cannot start. */
  exportBusy: boolean;
};

/** A finished or stopped scan (AC-7.3, AC-7.9, AC-7.10, AC-8.1). Mounted with the scan id as its key. */
export function ResultsView({
  result,
  headingRef,
  onRescan,
  onExport,
  exportBusy,
}: ResultsViewProps): ReactElement {
  const session = useInspector();
  const { files, banners, facts } = result;
  // No file is selected until the user picks one (D-03); the title tile then shows that file (AC-8.1).
  const selected = files.find((file) => file.fileId === session.fileId);
  // The site name (D-18) or `<file> · <status>` (AC-8.1). It ellipsizes, so the full text is also the tooltip.
  const titleLine =
    selected === undefined ? facts.site.name : `${selected.name} · ${selected.active ? 'Active' : 'Inactive'}`;
  const complete = facts.inventoryComplete && facts.stopped === null;
  // The finding the user chose, per file. Until one is chosen the first Needs-review finding is selected (AC-8.3).
  const [chosen, setChosen] = useState<Readonly<Record<string, CheckId>>>({});
  const [announcement, setAnnouncement] = useState('');
  const finding =
    selected === undefined
      ? undefined
      : (selected.findings.find((candidate) => candidate.check === chosen[selected.fileId]) ??
        selected.findings.find((candidate) => candidate.status === 'needs-review') ??
        selected.findings[0]);

  const choose = (check: CheckId): void => {
    if (selected !== undefined) setChosen({ ...chosen, [selected.fileId]: check });
  };
  const toggleReview = (): void => {
    if (selected === undefined || finding === undefined) return;
    const key: ReviewKey = `${selected.fileId}:${finding.check}`;
    const reviewed = finding.status !== 'reviewed';
    session.setReviewed(key, reviewed);
    // Pin the selection so the marked finding does not jump to the next Needs-review one.
    choose(finding.check);
    // The file name keeps the text different when the same check is marked in a second file; an identical
    // string would make React skip the update and the live region would stay silent.
    setAnnouncement(
      `${reviewed ? 'Marked as reviewed' : 'Review undone'}: ${CHECK_COPY[finding.check].title} in ${selected.name}.`,
    );
  };

  // AC-9.1, AC-7.4: enabled for a finished or stopped scan with files; the reason names what is missing.
  const exportReason = exportBusy
    ? EXPORT_IN_PROGRESS_REASON
    : onExport !== null
      ? null
      : facts.inventoryComplete
        ? EXPORT_NO_FILES_REASON
        : EXPORT_NOTHING_READ_REASON;
  const exportReport = (
    <Button variant="primary" onClick={onExport ?? undefined} disabledReason={exportReason}>
      <Icon name="arrow-download" size={14} />
      Export report
    </Button>
  );
  const rescan = (
    <Button onClick={onRescan}>
      <Icon name="arrow-clockwise" size={14} />
      Scan again
    </Button>
  );

  return (
    <div className="inspector-results">
      {/* D-10 consequence: every site notice, including AC-7.3's "Inventory incomplete. Reconnect and rescan.",
          renders once in this list above the grid, not inside the files tile. */}
      {banners.length === 0 ? null : (
        <ul className="inspector-banners" aria-label="Site notices">
          {banners.map((banner) => (
            <li key={banner} className="inspector-notice">
              <Icon name="warning" size={16} />
              <span>{plain(banner)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="inspector-grid">
        <FilesRail
          files={files}
          selectedId={selected?.fileId ?? null}
          complete={complete}
          onSelect={session.selectFile}
        />
        <Tile className="inspector-title">
          <div className="inspector-title__text">
            <div className="inspector-title__file" title={titleLine}>
              {titleLine}
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="inspector-title__heading">
              Review server logic readiness
            </h2>
            <p className="inspector-title__sub">
              Inspect access, permissions and outbound networking before release.
            </p>
          </div>
          <div className="inspector-title__actions">
            {exportReport}
            {rescan}
          </div>
        </Tile>
        {/* D-18 extension: with no files there is nothing to choose, so these cells stay empty and the rail says why. */}
        {files.length === 0 ? null : selected === undefined || finding === undefined ? (
          <Tile className="inspector-prompt">
            <Icon name="document" size={28} />
            <p className="inspector-prompt__text">{NO_FILE_TEXT}</p>
          </Tile>
        ) : (
          <>
            <ReadinessTile file={selected} />
            {selected.findings.map((candidate, index) => (
              <FindingTile
                key={candidate.check}
                finding={candidate}
                slot={index}
                selected={candidate.check === finding.check}
                onSelect={() => {
                  choose(candidate.check);
                }}
              />
            ))}
            <FindingDetail
              key={`${selected.fileId}:${finding.check}`}
              file={selected}
              finding={finding}
              onToggleReview={toggleReview}
            />
          </>
        )}
      </div>
      <div role="status" aria-label="Review updates" className="inspector-sr-only">
        {announcement}
      </div>
    </div>
  );
}
