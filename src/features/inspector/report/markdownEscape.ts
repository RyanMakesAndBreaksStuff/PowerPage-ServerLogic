export function escapeCell(text: string): string {
  return text.replace(/\r\n|\r|\n/g, ' ').replace(/[\\|*_`[\]<>]/g, '\\$&');
}

export function escapeInline(text: string): string {
  return escapeCell(text).replace(/#/g, '\\#');
}
