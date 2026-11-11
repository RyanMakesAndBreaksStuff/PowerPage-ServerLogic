import { useEffect, useEffectEvent, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './primitives.css';

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

const MODAL_WIDTH = 520;

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(', ');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

function ModalDialog({
  title,
  onClose,
  footer,
  children,
}: Omit<ModalProps, 'open'>): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Keys are handled on document so Esc and the Tab trap still work after a click moved focus to the body.
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const items = focusableIn(dialog);
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const active = document.activeElement;
    const outside = !(active instanceof Node && dialog.contains(active));
    if (event.shiftKey) {
      if (outside || active === first || active === dialog) {
        event.preventDefault();
        last.focus();
      }
    } else if (outside || active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog !== null) {
      const items = focusableIn(dialog);
      const target = items.find((el) => !el.hasAttribute('data-modal-close')) ?? items[0] ?? dialog;
      target.focus();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      opener?.focus();
    };
  }, []);

  return (
    <div className="ui-scrim">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="ui-modal"
        style={{ width: MODAL_WIDTH }}
      >
        <div className="ui-modal__head">
          <h2 id={titleId} className="ui-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Close"
            data-modal-close="true"
            onClick={onClose}
          >
            <Icon name="dismiss" />
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer === undefined ? null : <div className="ui-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, ...dialog }: ModalProps): ReactElement | null {
  return open ? createPortal(<ModalDialog {...dialog} />, document.body) : null;
}
