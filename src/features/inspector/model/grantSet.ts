import type {
  Reason,
  ServerLogicFileFacts,
  SiteFacts,
  TablePermissionFact,
} from '@/types/inspector';

export type Grant = { permission: TablePermissionFact; roleNames: readonly string[] };
export type IgnoredGrant = Grant & { reason: 'inactive, ignored' | 'parent inactive, ignored' };
export type GrantSet = {
  grants: readonly Grant[];
  ignored: readonly IgnoredGrant[];
  reasons: readonly Reason[];
  roleIds: readonly string[];
  notScanned: boolean;
};

type ParentChain = {
  top: TablePermissionFact;
  inactive: boolean;
  unresolved: boolean;
};

function parentChain(
  permission: TablePermissionFact,
  byId: ReadonlyMap<string, TablePermissionFact>,
): ParentChain {
  let current = permission;
  let inactive = !current.active;
  const visited = new Set<string>();
  while (current.scope === 'Parent') {
    visited.add(current.id);
    const parent = current.parentId === null ? undefined : byId.get(current.parentId);
    if (parent === undefined || visited.has(parent.id)) {
      return { top: current, inactive, unresolved: true };
    }
    current = parent;
    inactive ||= !current.active;
  }
  return { top: current, inactive, unresolved: false };
}

export function buildGrantSet(facts: SiteFacts, file: ServerLogicFileFacts): GrantSet {
  const base: GrantSet = { grants: [], ignored: [], reasons: [], roleIds: [], notScanned: false };
  const evidence = [facts.roles, facts.permissions, file.roleIds];
  if (evidence.some((item) => !item.ok && item.reason === 'read-failed')) {
    return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
  }
  if (evidence.some((item) => !item.ok && item.reason === 'not-scanned')) {
    return { ...base, notScanned: true };
  }
  if (!facts.roles.ok || !facts.permissions.ok || !file.roleIds.ok) return base;
  const roles = facts.roles.value;
  const byRoleId = new Map(roles.map((role) => [role.id, role]));
  if (file.roleIds.value.some((id) => !byRoleId.has(id))) {
    return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
  }
  const assigned = roles.filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id));
  const ids = new Set(file.roleIds.value);
  if (assigned.some((role) => !role.anonymous)) {
    roles.filter((role) => role.authenticated).forEach((role) => ids.add(role.id));
  }
  if (assigned.some((role) => role.anonymous)) {
    roles.filter((role) => role.anonymous).forEach((role) => ids.add(role.id));
  }
  const byId = new Map(facts.permissions.value.map((permission) => [permission.id, permission]));
  const grants: Grant[] = [];
  const ignored: IgnoredGrant[] = [];
  const reasons: Reason[] = [];
  for (const permission of facts.permissions.value) {
    const chain = parentChain(permission, byId);
    const linked = [...new Set([...permission.roleIds, ...chain.top.roleIds])].filter((id) =>
      ids.has(id),
    );
    const roleNames = linked.map((id) => byRoleId.get(id)?.name ?? id);
    if (!permission.active) {
      if (linked.length > 0) ignored.push({ permission, roleNames, reason: 'inactive, ignored' });
    } else if (chain.inactive) {
      if (linked.length > 0)
        ignored.push({ permission, roleNames, reason: 'parent inactive, ignored' });
    } else if (chain.unresolved) {
      reasons.push({
        text: `Couldn't evaluate parent permission \`${permission.name}\``,
        readFailure: false,
      });
    } else if (linked.length > 0) {
      grants.push({ permission, roleNames });
    }
  }
  return { grants, ignored, reasons, roleIds: [...ids], notScanned: false };
}

export function permissionSnapshot(grants: GrantSet): readonly string[] {
  const describe = ({ permission, roleNames }: Grant): string => {
    const privileges =
      permission.privileges
        .map((privilege) => (privilege === 'AppendTo' ? 'Append To' : privilege))
        .join(', ') || 'No privileges';
    return `${permission.table} · ${permission.scope ?? 'Unknown scope'} · ${privileges} · role ${roleNames.join(', ')}`;
  };
  return [
    ...grants.grants.map(describe),
    ...grants.ignored.map((grant) => `${describe(grant)} (${grant.reason})`),
    ...grants.reasons.map((reason) => reason.text),
  ];
}

export function defaultRoleBanners(facts: SiteFacts): readonly string[] {
  if (!facts.roles.ok) return [];
  const banners: string[] = [];
  for (const [flag, label] of [
    ['anonymous', 'Anonymous'],
    ['authenticated', 'Authenticated'],
  ] as const) {
    const defaults = facts.roles.value.filter((role) => role[flag]);
    if (defaults.length > 1) {
      banners.push(
        `More than one web role is marked as the ${label} Users Role (${defaults.map((role) => `\`${role.name}\``).join(', ')}). Learn allows one per site.`,
      );
    }
  }
  return banners;
}
