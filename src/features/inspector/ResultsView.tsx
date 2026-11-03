import type { ReactElement, Ref } from 'react';
import { useInspector } from '@/app/inspector-site/useInspector';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Tile } from '@/components/Tile';
import type { SiteResult } from '@/types/inspector';
import { FilesRail } from './FilesRail';
import { EXPORT_REASON, plain } from './pageCopy';

export type ResultsViewProps = {
  result: SiteResult;
  /** The title heading: the page moves focus here after Retry in the refresh-failed notice hides itself. */
  headingRef: Ref<HTMLHeadingElement>;
  /** Scan again. The page wraps `session.rescan` so that focus follows to the scanning panel's heading. */
  onRescan: () => void;
};

/** A finished or stopped scan (AC-7.3, AC-7.9, AC-7.10, AC-8.1). Mounted with the scan id as its key. */
export function ResultsView({ result, headingRef, onRescan }: ResultsViewProps): ReactElement {
  const session = useInspector();
  const { files, banners, facts } = result;
  // No file is selected until the user picks one (D-03); the title tile then shows that file (AC-8.1).
  const selected = files.find((file) => file.fileId === session.fileId);
  // The site name (D-18) or `<file> · <status>` (AC-8.1). It ellipsizes, so the full text is also the tooltip.
  const titleLine =
    selected === undefined ? facts.site.name : `${selected.name} · ${selected.active ? 'Active' : 'Inactive'}`;
  const complete = facts.inventoryComplete && facts.stopped === null;

  // Export report is always disabled in P5.5 (D-09, D-17); P5.7 enables it and replaces the reason.
  const exportReport = (
    <Button disabledReason={EXPORT_REASON}>
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
      </div>
    </div>
  );
}
