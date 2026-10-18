/** AC-4.10: the editor model is LF-only. CRLF and a lone CR both become LF. */
export function normalizeLf(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}
