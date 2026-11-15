import type { ReactElement } from 'react';
import { checkStatusBadge } from './checkStatusBadge';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import type { FileResult, Finding } from '@/types/inspector';
import { CHECK_COPY } from './model/copy';
import { canReviewFinding } from './model/rules';
import { plain } from './pageCopy';

type FindingDetailProps = {
  file: FileResult;
  finding: Finding;
  /** Marks the finding reviewed, or undoes the mark. Only offered when the rules allow it. */
  onToggleReview: () => void;
};

/**
 * React keys for lines that can repeat: the text plus how many identical lines came before it. Two Global
 * grants on one table give the same reason and the same snapshot row twice, and a bare text key would collide.
 */
function keyedLines(lines: readonly string[]): readonly { key: string; text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((text) => {
    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    return { key: `${text}#${String(occurrence)}`, text };
  });
}

function PlainLines({ lines }: { lines: readonly string[] }): ReactElement {
  return (
    <ul>
      {keyedLines(lines).map(({ key, text }) => (
        <li key={key}>{plain(text)}</li>
      ))}
    </ul>
  );
}

function SnapshotGroup({ term, items }: { term: string; items: readonly string[] }): ReactElement {
  return (
    <>
      <dt>{term}</dt>
      <dd>
        {items.length === 0 ? (
          'None'
        ) : (
          <PlainLines lines={items} />
        )}
      </dd>
    </>
  );
}

/**
 * The detail tile (AC-8.4, AC-8.5, AC-8.12): status, the reasons (kept after a review, so Reviewed is never
 * read as "was fine"), guidance, questions and the file's configuration snapshot. The review button follows
 * `canReviewFinding` exactly, so missing evidence can never be turned into Ready.
 */
export function FindingDetail({ file, finding, onToggleReview }: FindingDetailProps): ReactElement {
  const copy = CHECK_COPY[finding.check];
  const reasons = finding.reasons.map((reason) => reason.text);
  const notes = finding.detail.filter((line) => !reasons.includes(line));
  const action =
    finding.status === 'reviewed'
      ? 'Undo review'
      : canReviewFinding(finding)
        ? 'Mark as reviewed'
        : null;
  return (
    <Tile
      className="inspector-detail"
      heading={copy.title}
      aside={<StatusBadge {...checkStatusBadge(finding.status)} />}
      tabIndex={0}
    >
      <p className="inspector-detail__category">{copy.category}</p>
      {action === null ? null : (
        <div>
          <Button onClick={onToggleReview}>{action}</Button>
        </div>
      )}
      {reasons.length === 0 ? null : (
        <section>
          <h3 className="inspector-detail__heading">
            {finding.status === 'reviewed' ? 'Original reasons' : 'Why this needs review'}
          </h3>
          <PlainLines lines={reasons} />
        </section>
      )}
      {notes.length === 0 ? null : (
        <PlainLines lines={notes} />
      )}
      <p>{finding.guidance}</p>
      <section>
        <h3 className="inspector-detail__heading">Questions to consider</h3>
        <ul>
          {finding.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="inspector-detail__heading">Configuration snapshot</h3>
        <dl className="inspector-snapshot">
          <SnapshotGroup term="Web roles" items={file.snapshot.roles} />
          <SnapshotGroup term="Tables" items={file.snapshot.tables} />
          <SnapshotGroup term="Outbound" items={file.snapshot.outbound} />
        </dl>
      </section>
    </Tile>
  );
}
