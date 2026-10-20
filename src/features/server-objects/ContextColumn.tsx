import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { useView } from '@/app/useView';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { getRecipe } from '@/services/catalogue/recipes';
import type { ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';
import { nextMember } from './objectList';
import { SampleCode } from './ObjectDetail';

/** AC-6.9: what the handler uses, the permissions it needs and another sample of the selected object. */
export function ContextColumn({
  shown,
}: {
  shown: { object: ServerObject; member: ObjectMember } | null; // null: no results
}): ReactElement {
  const { state, derived } = useStarterSession();
  const [, setView] = useView();
  const recipe = getRecipe(state.recipe);
  const reviewed = derived.readiness.permissions;
  const another = shown === null ? null : nextMember(shown.object, shown.member);
  return (
    <div className="objects-context">
      <Tile heading={`Used in ${derived.slug}`}>
        {derived.usedMembers.size === 0 ? (
          <p className="objects-muted">The handler uses no Server objects yet.</p>
        ) : (
          <ul className="objects-used">
            {[...derived.usedMembers].map(([path, members]) => (
              <li key={path}>
                <span className="ui-mono objects-used__path">{path}</span>
                {members.length === 0 ? null : (
                  <span className="objects-used__members">
                    {members.map((name) => (
                      <Pill key={name} compact mono>
                        {name}
                      </Pill>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button
          onClick={() => {
            setView('starter');
          }}
        >
          <Icon name="arrow-left" />
          Back to Create Logic
        </Button>
      </Tile>
      <Tile heading="Permissions needed">
        <StatusBadge kind={reviewed ? 'ok' : 'review'} label="Permissions" />
        {recipe.tables.length === 0 ? (
          <p className="objects-muted">This recipe reads no Dataverse tables.</p>
        ) : (
          <ul className="objects-grants">
            {recipe.tables.map((table) => (
              <li key={table.logicalName}>
                <Pill tone={reviewed ? 'ok' : 'review'} mono>
                  {table.logicalName} · {table.privileges.join(', ')}
                </Pill>
                <span className="objects-muted">{table.accessType} access</span>
              </li>
            ))}
          </ul>
        )}
        <Pill>{recipe.webRole}</Pill>
        <p className="objects-muted">
          {reviewed
            ? 'Checklist reviewed in Logic Starter.'
            : 'Not reviewed yet. Review the checklist in Logic Starter before release.'}
        </p>
      </Tile>
      {another === null ? null : (
        <Tile heading="Another sample" className="objects-context__another">
          <SampleCode code={another.samples[0].code} label={`${another.name} sample`} />
          <Pill compact mono>
            {another.name}
          </Pill>
        </Tile>
      )}
    </div>
  );
}
