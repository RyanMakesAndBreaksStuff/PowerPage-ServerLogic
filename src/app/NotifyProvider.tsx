import { useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/session/HostContext';
import { NotifyContext } from '@/session/useNotify';
import { ToastStack } from '@/components/ToastStack';
import type { ToastItem } from '@/components/ToastStack';
import type { Notice } from '@/services/pptb/host.types';

export function NotifyProvider({ children }: { children: ReactNode }): ReactElement {
  const host = useHost();
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(0);

  // The adapter has already logged the host failure by error name; the fallback is local state only.
  function notify(n: Notice): void {
    host.notify(n).catch(() => {
      nextId.current += 1;
      const toast: ToastItem = { id: `toast-${String(nextId.current)}`, ...n };
      setToasts((current) => [...current, toast]);
    });
  }

  function close(id: string): void {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <NotifyContext value={notify}>
      {children}
      <ToastStack toasts={toasts} onClose={close} />
    </NotifyContext>
  );
}
