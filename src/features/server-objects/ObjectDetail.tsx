import type { ReactElement } from 'react';
import { CopyButton } from '@/app/CopyButton';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import { NOT_DOCUMENTED, isConnector } from '@/services/catalogue/serverObjects';
import type { ContextScope, ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';
import { InsertButton } from './InsertButton';

const CONTEXT_LABEL = {
  both: 'HTTP and Liquid',
  http: 'HTTP only',
  liquid: 'Liquid only',
} as const satisfies Record<ContextScope, string>;

type DetailProps = {
  object: ServerObject;
  member: ObjectMember;
  variant: number;
  onSelectMember: (name: string) => void;
  onSelectVariant: (index: number) => void;
};

/** A sample's code with CSS line numbers; the copied text is the catalogue string itself (AC-4.9). */
export function SampleCode({ code, label }: { code: string; label: string }): ReactElement {
  return (
    <pre className="objects-code" role="group" aria-label={label}>
      <code>
        {code.split('\n').map((line, index) => (
          // Lines never reorder: the index is the line number.
          <span key={index} className="objects-code__line">
            {line}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** AC-6.5 and AC-6.6: breadcrumb, type pill, members, signature, sample card and the members table. */
export function ObjectDetail({
  object,
  member,
  variant,
  onSelectMember,
  onSelectVariant,
}: DetailProps): ReactElement {
  const segments = object.path.split('.');
  const leaf = segments.pop() ?? object.path;
  const sample = member.samples[variant] ?? member.samples[0];
  const kind = member.kind === 'property' ? 'properties' : 'methods';
  return (
    <Tile flush role="region" aria-label="Object detail" className="objects-detail">
      <div className="objects-detail__head">
        <nav aria-label="Breadcrumb" className="objects-detail__crumbs">
          <span className="ui-mono objects-detail__parent">{segments.join('.')}</span>
          <span aria-hidden="true">›</span>
          <h2 className="objects-detail__title">{leaf}</h2>
          <Pill tone="server">{isConnector(object) ? 'Connector' : 'Object'}</Pill>
        </nav>
        <p className="objects-detail__description">{object.description}</p>
        <PillGroup
          label="Members"
          options={object.members.map((m) => ({ value: m.name, label: m.name }))}
          value={member.name}
          onChange={onSelectMember}
          compact
        />
      </div>
      <div className="objects-detail__body">
        <div className="objects-signature">
          <ul aria-label="Signatures" className="objects-signature__list">
            {member.signatures.map((signature) => (
              <li key={signature} className="ui-mono">
                {signature}
              </li>
            ))}
          </ul>
          <p className="objects-signature__meta">
            {member.timing === null ? null : (
              <Pill compact>{member.timing === 'async' ? 'Async: use await' : 'Synchronous'}</Pill>
            )}
            {member.context === null ? null : <Pill compact>{CONTEXT_LABEL[member.context]}</Pill>}
            <span>Returns: {member.returns ?? NOT_DOCUMENTED}</span>
          </p>
        </div>
        <section aria-label="Sample" className="objects-sample">
          <div className="objects-sample__bar">
            {member.samples.length > 1 ? (
              <PillGroup
                label="Sample variant"
                options={member.samples.map((s, index) => ({
                  value: String(index),
                  label: s.label,
                }))}
                value={String(variant)}
                onChange={(value) => {
                  onSelectVariant(Number(value));
                }}
                compact
              />
            ) : null}
            <span className="objects-sample__actions">
              <CopyButton text={sample.code} label="Copy sample" />
              <InsertButton sample={sample.code} />
            </span>
          </div>
          <SampleCode code={sample.code} label={`${member.name} sample`} />
        </section>
        <table className="objects-table">
          <caption className="ui-tile__label">All {kind}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Signature</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {object.members.map((m) => (
              <tr
                key={m.name}
                className={classNames(m.name === member.name && 'objects-table__row--selected')}
              >
                <td>
                  <button
                    type="button"
                    className="objects-table__name ui-mono"
                    aria-current={m.name === member.name ? 'true' : undefined}
                    onClick={() => {
                      onSelectMember(m.name);
                    }}
                  >
                    {m.name}
                  </button>
                </td>
                <td className="ui-mono objects-table__signature" title={m.signatures.at(-1)}>
                  {m.signatures.at(-1)}
                </td>
                <td title={m.description}>{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tile>
  );
}
