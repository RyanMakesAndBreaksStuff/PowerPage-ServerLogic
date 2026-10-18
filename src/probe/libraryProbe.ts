import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { Code20Regular } from '@fluentui/react-icons';
import { tags } from '@lezer/highlight';
import { parse } from 'acorn';
import { strToU8, zipSync } from 'fflate';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import dmSansRegular from '@/assets/fonts/DMSans_400Regular.ttf?inline';

const PROBE_STYLE = HighlightStyle.define([
  { tag: tags.keyword, color: '#b0231b' },
  { tag: tags.string, color: '#4d6a1f' },
]);

// Keeps the icon in the probe bundle so its cost is measured.
export const PROBE_ICON = Code20Regular;

export function buildProbePdf(): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const base64 = dmSansRegular.slice(dmSansRegular.indexOf(',') + 1);
  doc.addFileToVFS('DMSans-Regular.ttf', base64);
  doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
  doc.setFont('DMSans', 'normal');
  doc.text('Library probe', 40, 40);
  autoTable(doc, {
    startY: 60,
    head: [['Check', 'Status']],
    body: [['Web role', 'Configured']],
  });
  return new Uint8Array(doc.output('arraybuffer'));
}

export function buildProbeZip(text: string): Uint8Array {
  return zipSync({ 'probe.js': strToU8(text) });
}

export function parseProbe(code: string): string {
  return parse(code, { ecmaVersion: 2023 }).type;
}

export function createProbeState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      javascript(),
      syntaxHighlighting(PROBE_STYLE),
    ],
  });
}

export function createProbeEditor(parent: HTMLElement, doc: string): EditorView {
  return new EditorView({ state: createProbeState(doc), parent });
}
