import type { ReactElement } from 'react';
import { useStarterSession } from '@/session/useStarterSession';
import { useView } from '@/session/useView';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ClientPane } from './code/ClientPane';
import { ServerPane } from './code/ServerPane';
import { DownloadStarterButton } from './download/DownloadStarterButton';
import { PermissionNote } from './inputs/PermissionNote';
import { StarterInputs } from './inputs/StarterInputs';
import './starter.css';

// Create Logic, layout 10a §2: the input row, the code row (Phase 21) and the action row.
export function StarterPage(): ReactElement {
  const { dispatch } = useStarterSession();
  const [, setView] = useView();
  return (
    <section aria-label="Logic Starter" className="starter-page">
      <StarterInputs />
      <div className="starter-page__code">
        <div className="starter-code__panes">
          <ServerPane />
          <ClientPane />
        </div>
      </div>
      <PermissionNote />
      <div className="starter-page__actions">
        <DownloadStarterButton />
        <Button
          fullWidth
          onClick={() => {
            dispatch({ type: 'startOver' });
          }}
        >
          <Icon name="arrow-clockwise" />
          Start over
        </Button>
        {/* AC-6.10; a constant condition, so a build without Server Objects drops it (FR-1). */}
        {__PAGE_OBJECTS__ ? (
          <Button
            fullWidth
            onClick={() => {
              setView('objects');
            }}
          >
            <Icon name="cube" />
            Browse all in Server Objects
          </Button>
        ) : null}
      </div>
    </section>
  );
}
