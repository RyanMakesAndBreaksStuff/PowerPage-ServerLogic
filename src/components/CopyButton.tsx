import { useTransition } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/session/HostContext';
import { useNotify } from '@/session/useNotify';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { errorName } from '@/services/pptb/hostErrors';

// AC-4.9, AC-6.7, F49: copies plain text (never line numbers) and is disabled while copying.
export function CopyButton({
  text,
  label,
  iconSize = 16,
}: {
  text: string;
  label: string;
  iconSize?: number;
}): ReactElement {
  const host = useHost();
  const notify = useNotify();
  const [pending, startTransition] = useTransition();

  const copy = (): void => {
    startTransition(async () => {
      try {
        await host.copyText(text);
        notify({ title: 'Code copied', body: '', type: 'success' });
      } catch (error: unknown) {
        console.error(errorName(error));
        notify({ title: "Couldn't copy", body: '', type: 'error' });
      }
    });
  };

  return (
    <Button aria-label={label} busy={pending} onClick={copy}>
      <Icon name="copy" size={iconSize} />
      Copy
    </Button>
  );
}
