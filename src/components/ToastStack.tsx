import { useEffect, useEffectEvent, useState } from 'react';
import type { ReactElement } from 'react';
import { classNames } from '@/lib/classNames';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import './primitives.css';

export type ToastType = 'success' | 'info' | 'warning' | 'error';
export type ToastItem = { id: string; title: string; body: string; type: ToastType };
export type ToastStackProps = { toasts: readonly ToastItem[]; onClose: (id: string) => void };

const AUTO_HIDE_MS = 5000;
const FADE_MS = 150;

const ICON = {
  success: 'checkmark-circle',
  info: 'info',
  warning: 'warning',
  error: 'error-circle',
} as const satisfies Record<ToastType, IconName>;

// FR-1: success and info hide after 5 s with role=status; error stays until closed with role=alert.
// Warning is not named by the spec; it behaves like error so it is never lost.
const autoHides = (type: ToastType): boolean => type === 'success' || type === 'info';
const roleOf = (type: ToastType): 'status' | 'alert' => (autoHides(type) ? 'status' : 'alert');

function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: (id: string) => void;
}): ReactElement {
  const reducedMotion = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);

  const requestClose = (): void => {
    if (reducedMotion) onClose(toast.id);
    else setLeaving(true);
  };
  const autoClose = useEffectEvent(() => {
    requestClose();
  });
  const finish = useEffectEvent(() => {
    onClose(toast.id);
  });
  const timed = autoHides(toast.type);

  useEffect(() => {
    if (!timed) return undefined;
    const timer = setTimeout(() => {
      autoClose();
    }, AUTO_HIDE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [timed]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => {
      finish();
    }, FADE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);

  return (
    <div
      role={roleOf(toast.type)}
      className={classNames(
        'ui-toast',
        `ui-toast--${toast.type}`,
        !reducedMotion && 'ui-toast--fade',
        leaving && 'ui-toast--leaving',
      )}
    >
      <div className="ui-toast__header">
        <Icon name={ICON[toast.type]} />
        <strong className="ui-toast__title">{toast.title}</strong>
        <button type="button" className="ui-icon-button" aria-label="Close" onClick={requestClose}>
          <Icon name="dismiss" />
        </button>
      </div>
      <div className="ui-toast__body">{toast.body}</div>
    </div>
  );
}

// Presentational only: useNotify decides when a toast exists. Each toast runs its own timers.
export function ToastStack({ toasts, onClose }: ToastStackProps): ReactElement {
  return (
    <div className="ui-toast-stack">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
