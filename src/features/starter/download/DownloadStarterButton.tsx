import { useTransition } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/session/HostContext';
import { useNotify } from '@/session/useNotify';
import { useStarterSession } from '@/session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { generateClient } from '@/services/generators/client/client';
import { buildPackageFiles } from '@/services/generators/package/buildPackageFiles';
import { buildZip } from '@/services/generators/package/buildZip';
import { errorName } from '@/services/pptb/hostErrors';

const STARTER_SAVE_FAILED_BODY = 'The file could not be written. Check the folder and try again.';

export function DownloadStarterButton(): ReactElement {
  const { state, derived } = useStarterSession();
  const host = useHost();
  const notify = useNotify();
  const [pending, startTransition] = useTransition();

  function onClick(): void {
    const slug = derived.slug;
    startTransition(async () => {
      let bytes: Uint8Array;
      try {
        const clientText = generateClient({
          slug,
          recipe: state.recipe,
          fn: derived.fn,
          method: state.method,
          language: state.language,
        });
        bytes = buildZip(buildPackageFiles({ state, derived, clientText }));
      } catch (error: unknown) {
        console.error(errorName(error));
        const reason = error instanceof Error ? error.message : 'Unknown error';
        notify({ title: `Couldn't save ${slug}.zip`, body: reason, type: 'error' });
        return;
      }
      try {
        const result = await host.saveFile(`${slug}.zip`, bytes, [
          { name: 'Zip archive', extensions: ['zip'] },
        ]);
        if (result.status === 'saved') {
          notify({ title: `${slug}.zip downloaded`, body: '', type: 'success' });
        }
      } catch (error: unknown) {
        console.error(errorName(error));
        notify({ title: `Couldn't save ${slug}.zip`, body: STARTER_SAVE_FAILED_BODY, type: 'error' });
      }
    });
  }

  return (
    <Button variant="primary" fullWidth busy={pending} onClick={onClick}>
      <Icon name="arrow-download" size={14} />
      Download starter
    </Button>
  );
}
