import type { ReactElement } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeKind } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import type { FileResult } from '@/types/inspector';
import { TENANT_POLICY_NOTE } from './model/copy';
import { filePill, fileSummary } from './model/rules';
import { NO_FILES_TEXT, NOTHING_READ_TEXT } from './pageCopy';

const PILL_KIND = { Ready: 'ok', 'Needs review': 'review', Incomplete: 'unknown' } as const satisfies Record<
  ReturnType<typeof filePill>,
  BadgeKind
>;

export type FilesRailProps = {
  files: readonly FileResult[];
  selectedId: string | null;
  /** True when the record list was read completely, so an empty list really means "none". */
  complete: boolean;
  onSelect: (fileId: string) => void;
};

/** The files tile (AC-7.3, AC-8.6, AC-8.7): every record with its status, and the tenant-policy footer. */
export function FilesRail({ files, selectedId, complete, onSelect }: FilesRailProps): ReactElement {
  return (
    <Tile className="inspector-rail" heading={`Server logic (${String(files.length)})`}>
      {files.length === 0 ? (
        <p className="inspector-rail__empty">{complete ? NO_FILES_TEXT : NOTHING_READ_TEXT}</p>
      ) : (
        <ul className="inspector-files">
          {files.map((file) => {
            const pill = filePill(file);
            return (
              <li key={file.fileId}>
                <button
                  type="button"
                  className={classNames('inspector-file', file.fileId === selectedId && 'inspector-file--selected')}
                  aria-current={file.fileId === selectedId ? 'true' : undefined}
                  title={file.name}
                  onClick={() => {
                    onSelect(file.fileId);
                  }}
                >
                  <span className="inspector-file__name">{file.name}</span>
                  <span className="inspector-file__meta">
                    {file.active ? 'Active' : 'Inactive'} · {fileSummary(file)}
                  </span>
                  <StatusBadge kind={PILL_KIND[pill]} label={pill} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="inspector-rail__footer">{TENANT_POLICY_NOTE}</p>
    </Tile>
  );
}
