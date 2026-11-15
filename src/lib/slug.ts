const MAX_SLUG_LENGTH = 64;
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/;

/**
 * AC-2.2 / 2.3 / 2.11: lowercase, runs outside a-z0-9 become "-", trim dashes,
 * cap at 64 (at the last "-" at or before index 64, else at 64), "untitled" when empty,
 * and "-logic" appended to a Windows device name. `differs` compares with the typed name.
 */
export function slugify(name: string): { slug: string; differs: boolean } {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length > MAX_SLUG_LENGTH) {
    const dash = slug.lastIndexOf('-', MAX_SLUG_LENGTH);
    slug = slug.slice(0, dash > 0 ? dash : MAX_SLUG_LENGTH).replace(/-+$/, '');
  }
  if (slug === '') slug = 'untitled';
  if (DEVICE_NAME.test(slug)) slug = `${slug}-logic`;
  return { slug, differs: slug !== name };
}
