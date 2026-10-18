import type { ComponentProps, MouseEvent, ReactElement } from 'react';
import { useHost } from '@/app/HostContext';
import { useNotify } from '@/app/useNotify';

export type ExternalLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick' | 'target'> & {
  href: string;
};

// The host blocks _blank targets; links open only on click through openInConnectionBrowser (FR-1).
export function ExternalLink({ href, children, ...rest }: ExternalLinkProps): ReactElement {
  const host = useHost();
  const notify = useNotify();

  function open(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    host.openExternal(href).catch(() => {
      notify({
        title: "Couldn't open the link",
        body: 'Open it from your browser instead.',
        type: 'error',
      });
    });
  }

  return (
    <a {...rest} href={href} onClick={open}>
      {children}
    </a>
  );
}
