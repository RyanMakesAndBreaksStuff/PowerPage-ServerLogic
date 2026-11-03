// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Modal } from './Modal';

afterEach(cleanup);

function Harness({ width, skipFirst = false }: { width?: number; skipFirst?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Export report
      </button>
      <Modal
        open={open}
        title="Export report"
        {...(width === undefined ? {} : { width })}
        onClose={() => {
          setOpen(false);
        }}
        footer={<button type="button">Export Markdown</button>}
      >
        {skipFirst ? (
          <button type="button" tabIndex={-1}>
            Roving
          </button>
        ) : null}
        <label>
          Format
          <input type="text" />
        </label>
        <button type="button">Second</button>
      </Modal>
    </>
  );
}

function openModal(): HTMLElement {
  const opener = screen.getByRole('button', { name: 'Export report' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe('Modal, APG modal dialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled modal dialog, 520px wide by default and any width on request', () => {
    const first = render(<Harness />);
    openModal();
    const dialog = screen.getByRole('dialog', { name: 'Export report' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.style.width).toBe('520px');
    first.unmount();
    render(<Harness width={640} />);
    openModal();
    expect(screen.getByRole('dialog').style.width).toBe('640px');
  });

  it('renders into document.body on a scrim', () => {
    render(<Harness />);
    openModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement?.className).toBe('ui-scrim');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('moves focus into the dialog, to the first control rather than the Close button', () => {
    render(<Harness />);
    openModal();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('traps Tab: from the last control it wraps to the first, and Shift+Tab does the reverse', () => {
    render(<Harness />);
    openModal();
    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Export Markdown' });
    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(close);
    expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  it('lets Tab move normally between controls inside the dialog', () => {
    render(<Harness />);
    openModal();
    const input = screen.getByRole('textbox');
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
  });

  it('pulls focus back in when it has escaped the dialog', () => {
    render(<Harness />);
    openModal();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('closes on Escape and returns focus to the opener', () => {
    render(<Harness />);
    const opener = openModal();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape even after focus fell back to the body', () => {
    render(<Harness />);
    const opener = openModal();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes from the Close button and returns focus to the opener', () => {
    render(<Harness />);
    const opener = openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('skips controls with tabindex -1 on entry and in the Tab trap', () => {
    render(<Harness skipFirst />);
    openModal();
    const roving = screen.getByRole('button', { name: 'Roving' });
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Export Markdown' });
    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(close);
    expect(document.activeElement).not.toBe(roving);
    close.focus();
    expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  it('does not close when the scrim is clicked', () => {
    render(<Harness />);
    openModal();
    const scrim = screen.getByRole('dialog').parentElement;
    expect(scrim).not.toBeNull();
    if (scrim !== null) fireEvent.click(scrim);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
