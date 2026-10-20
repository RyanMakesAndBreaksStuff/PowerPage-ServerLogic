import { SERVER_OBJECTS, isConnector } from '@/services/catalogue/serverObjects';
import type { ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';

export type ObjectFilter = 'all' | 'used' | 'connectors';
/** One listed object; `memberMatch` is its first member whose name matches the search, if any (AC-6.4a). */
export type ListedObject = { object: ServerObject; memberMatch: string | null };
export type Selection = { path: string; member: string; variant: number };

function selectionFor(object: ServerObject | undefined, member: string | null): Selection {
  return { path: object?.path ?? '', member: member ?? object?.members[0].name ?? '', variant: 0 };
}

export const DEFAULT_SELECTION: Selection = selectionFor(SERVER_OBJECTS[0], null);

/**
 * AC-6.3 and AC-6.4: the objects the list shows, in FR-6 order. The search matches an object path or a member name,
 * case-insensitive, as a substring; the filter keeps all objects, those `used` names (the server pane's objects) or
 * `Server.Connector.*` ones.
 */
export function listObjects(
  query: string,
  filter: ObjectFilter,
  used: ReadonlyMap<string, readonly string[]>,
): readonly ListedObject[] {
  const q = query.trim().toLowerCase();
  const listed: ListedObject[] = [];
  for (const object of SERVER_OBJECTS) {
    if (filter === 'used' && !used.has(object.path)) continue;
    if (filter === 'connectors' && !isConnector(object)) continue;
    const memberMatch =
      q === ''
        ? null
        : (object.members.find((m) => m.name.toLowerCase().includes(q))?.name ?? null);
    if (q === '' || memberMatch !== null || object.path.toLowerCase().includes(q)) {
      listed.push({ object, memberMatch });
    }
  }
  return listed;
}

/**
 * AC-6.4a: keeps the selection while its object is listed, otherwise selects the first listed object. A member match
 * replaces a selected member that the search doesn't match. With nothing listed the selection is kept, and the
 * detail shows the no-results message.
 */
export function reselect(
  listed: readonly ListedObject[],
  selection: Selection,
  query: string,
): Selection {
  const first = listed[0];
  if (first === undefined) return selection;
  const kept = listed.find((l) => l.object.path === selection.path);
  if (kept === undefined) return selectionFor(first.object, first.memberMatch);
  const q = query.trim().toLowerCase();
  if (kept.memberMatch !== null && !selection.member.toLowerCase().includes(q)) {
    return selectionFor(kept.object, kept.memberMatch);
  }
  return selection;
}

/** The selected object and member, from a selection `reselect` returned for the same list. `null`: no results. */
export function selected(
  listed: readonly ListedObject[],
  selection: Selection,
): { object: ServerObject; member: ObjectMember; variant: number } | null {
  const object = listed.find((l) => l.object.path === selection.path)?.object;
  if (object === undefined) return null;
  const member = object.members.find((m) => m.name === selection.member) ?? object.members[0];
  const variant = selection.variant < member.samples.length ? selection.variant : 0;
  return { object, member, variant };
}

/** AC-6.9 "Another sample": the next member in Learn's order, wrapping; `null` for a one-member object. */
export function nextMember(object: ServerObject, member: ObjectMember): ObjectMember | null {
  if (object.members.length === 1) return null;
  const index = object.members.indexOf(member);
  return object.members[(index + 1) % object.members.length] ?? null;
}
