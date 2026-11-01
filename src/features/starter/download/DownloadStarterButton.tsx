import { useTransition } from 'react';
import type { ReactNode } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { generateClient } from '@/services/generators/client/client';
import { buildPackageFiles } from '@/services/generators/package/buildPackageFiles';
import { buildZip } from '@/services/generators/package/buildZip';
import { errorName } from '@/services/pptb/hostErrors';

export function DownloadStarterButton(): ReactNode {
  const { state, derived } = useStarterSession();
  const host = useHost();
  const notify = useNotify();
  const [pending, startTransition] = useTransition();

  function onClick(): void {
    const slug = derived.slug;
    const recipe = state.recipe;
    const fn = derived.fn;
    const method = state.method;
    const language = state.language;
    const packaged = { state, derived };
    startTransition(async () => {
      try {
        const clientText = generateClient({ slug, recipe, fn, method, language });
        const bytes = buildZip(buildPackageFiles({ ...packaged, clientText }));
        const result = await host.saveFile(`${slug}.zip`, bytes, [
          { name: 'Zip archive', extensions: ['zip'] },
        ]);
        if (result.status === 'saved') {
          notify({ title: `${slug}.zip downloaded`, body: '', type: 'success' });
        }
      } catch (error: unknown) {
        console.error(errorName(error));
        const reason = error instanceof Error ? error.message : 'Unknown error';
        notify({ title: `Couldn't save ${slug}.zip`, body: reason, type: 'error' });
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
