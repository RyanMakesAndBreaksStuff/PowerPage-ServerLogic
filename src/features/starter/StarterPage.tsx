import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { DownloadStarterButton } from './download/DownloadStarterButton';
import { PermissionNote } from './inputs/PermissionNote';
import { StarterInputs } from './inputs/StarterInputs';
import './starter.css';

// Create Logic, layout 10a §2: the input row, the code row (Phase 21) and the action row.
export function StarterPage(): ReactElement {
  const { dispatch } = useStarterSession();
  return (
    <section aria-label="Logic Starter" className="starter-page">
      <StarterInputs />
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
      </div>
    </section>
  );
}
