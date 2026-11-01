import { useTransition } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

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
        console.error(error instanceof Error ? error.name : 'Error'); // name only: no text, no URL
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
