import { useState } from 'react';
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import { ContextColumn } from './ContextColumn';
import { ObjectDetail } from './ObjectDetail';
import { DEFAULT_SELECTION, listObjects, reselect, selected } from './objectList';
import type { ObjectFilter, Selection } from './objectList';
import './serverObjects.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Used here' },
  { value: 'connectors', label: 'Connectors' },
] as const satisfies readonly { value: ObjectFilter; label: string }[];

const count = (n: number, kind: 'method' | 'property'): string =>
  `${String(n)} ${kind === 'property' ? (n === 1 ? 'property' : 'properties') : n === 1 ? 'method' : 'methods'}`;

/** Story 6: the object list, the object detail and the context column (AC-6.1). */
export function ServerObjectsPage(): ReactElement {
  const { derived } = useStarterSession();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ObjectFilter>('all');
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);

  const listed = listObjects(query, filter, derived.usedMembers);
  // An edit can shrink "Used here" while this page is hidden, and a row click stores the first member.
  // Store the reselect during render so the next filter or clear uses what is on screen (AC-6.4a).
  const next = reselect(listed, selection, query);
  if (
    next.path !== selection.path ||
    next.member !== selection.member ||
    next.variant !== selection.variant
  ) {
    setSelection(next);
  }
  const current = selected(listed, next);

  const change = (nextQuery: string, nextFilter: ObjectFilter): void => {
    setQuery(nextQuery);
    setFilter(nextFilter);
    setSelection(
      reselect(listObjects(nextQuery, nextFilter, derived.usedMembers), selection, nextQuery),
    );
  };

  return (
    <div className="objects-page">
      <Tile role="region" aria-label="Server objects" className="objects-list">
        <label className="objects-search">
          <Icon name="search" />
          <input
            type="search"
            aria-label="Search objects and methods"
            placeholder="Search objects and methods"
            value={query}
            onChange={(e) => {
              change(e.target.value, filter);
            }}
          />
        </label>
        <PillGroup
          label="Filter objects"
          options={FILTERS}
          value={filter}
          onChange={(value) => {
            change(query, value);
          }}
          compact
        />
        <p role="status" className="objects-visually-hidden">
          {`${String(listed.length)} ${listed.length === 1 ? 'object' : 'objects'} listed`}
        </p>
        <ul className="objects-list__items">
          {listed.map(({ object }) => {
            const isSelected = current?.object === object;
            return (
              <li key={object.path}>
                <button
                  type="button"
                  className={classNames('objects-item', isSelected && 'objects-item--selected')}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setSelection({ path: object.path, member: object.members[0].name, variant: 0 });
                  }}
                >
                  <span className="objects-item__row">
                    <span className="ui-mono objects-item__path">{object.path}</span>
                    {derived.usedMembers.has(object.path) ? (
                      <Pill tone="server" compact>
                        used
                        <span className="objects-visually-hidden"> by the current handler</span>
                      </Pill>
                    ) : null}
                  </span>
                  <span className="objects-item__meta">
                    {object.description} · {count(object.members.length, object.members[0].kind)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Tile>
      {current === null ? (
        <Tile role="region" aria-label="Object detail" className="objects-detail">
          {/* Error Scenarios: a search that matches nothing; the "Used here" filter alone can also empty the list. */}
          <p role="status" className="objects-muted">
            {query.trim() === ''
              ? 'No objects match this filter.'
              : `No objects or members match '${query.trim()}'`}
          </p>
          <Button
            onClick={() => {
              change('', query.trim() === '' ? 'all' : filter);
            }}
          >
            {query.trim() === '' ? 'Show all objects' : 'Clear search'}
          </Button>
        </Tile>
      ) : (
        <ObjectDetail
          object={current.object}
          member={current.member}
          variant={current.variant}
          onSelectMember={(name) => {
            setSelection({ path: current.object.path, member: name, variant: 0 });
          }}
          onSelectVariant={(variant) => {
            setSelection({ path: current.object.path, member: current.member.name, variant });
          }}
        />
      )}
      <ContextColumn shown={current} />
    </div>
  );
}
