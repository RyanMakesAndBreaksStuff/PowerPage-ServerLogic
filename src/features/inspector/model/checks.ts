import type { ConnectorUse } from '@/lib/code-analysis/codeAnalysis.types';
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { METHOD_FUNCTION } from '@/types/http';
import type {
  CheckId,
  FileResult,
  Finding,
  Reason,
  ServerLogicFileFacts,
  SiteFacts,
} from '@/types/inspector';
import {
  CHECK_COPY,
  CODE_ANALYSIS_LIMIT,
  CODE_READ_FAILURE,
  CONNECTORS_UNKNOWN,
  ENVVAR_CACHE_NOTE,
  FLOW_NOTE,
  NOT_SCANNED_TEXT,
  OTHER_ROLES_NOTE,
} from './copy';
import { buildGrantSet, permissionSnapshot } from './grantSet';
import type { GrantSet } from './grantSet';
import { parseAllowedDomains, parseBooleanSetting, settingSnapshot } from './settings';

type Analysis = {
  connectors: ConnectorUse | null;
  names: readonly string[] | null;
  reason: Reason | null;
  notScanned: boolean;
};

function analyse(file: ServerLogicFileFacts): Analysis {
  if (!file.code.ok) {
    return {
      connectors: null,
      names: null,
      reason:
        file.code.reason === 'read-failed' ? { text: CODE_READ_FAILURE, readFailure: true } : null,
      notScanned: file.code.reason === 'not-scanned',
    };
  }
  const connectors = detectConnectorUse(file.code.value);
  const names = exportedFunctionNames(file.code.value);
  return {
    connectors,
    names,
    reason:
      connectors === null || names === null
        ? { text: CODE_ANALYSIS_LIMIT, readFailure: false }
        : null,
    notScanned: false,
  };
}

/**
 * FR-8 precedence: any known reason makes the check Needs review, even when other required evidence is
 * unscanned; only a check with no reason and unscanned evidence is Not scanned. `hasUnscannedEvidence`
 * is recorded either way, and `canReviewFinding` refuses review while it is true.
 */
function makeFinding(
  check: CheckId,
  configuredSummary: string,
  reasons: readonly Reason[],
  detail: readonly string[],
  hasUnscannedEvidence = false,
): Finding {
  const copy = CHECK_COPY[check];
  return {
    check,
    status: reasons.length > 0 ? 'needs-review' : hasUnscannedEvidence ? 'not-scanned' : 'configured',
    summary: reasons[0]?.text ?? (hasUnscannedEvidence ? NOT_SCANNED_TEXT : configuredSummary),
    hasUnscannedEvidence,
    reasons,
    guidance: copy.guidance,
    questions: copy.questions,
    detail: [
      ...reasons.map((reason) => reason.text),
      ...(hasUnscannedEvidence ? [NOT_SCANNED_TEXT] : []),
      ...detail,
    ],
  };
}

function webRole(facts: SiteFacts, file: ServerLogicFileFacts): Finding {
  const evidence = [facts.roles, file.roleIds];
  const failed = evidence.some((item) => !item.ok && item.reason === 'read-failed');
  const notScanned = evidence.some((item) => !item.ok && item.reason === 'not-scanned');
  const roles = facts.roles.ok ? facts.roles.value : [];
  const ids = file.roleIds.ok ? file.roleIds.value : [];
  const reasons: Reason[] = [];
  if (file.roleIds.ok && ids.length === 0)
    reasons.push({
      text: 'No web role assigned. No site user can call it yet.',
      readFailure: false,
    });
  if (roles.some((role) => ids.includes(role.id) && role.anonymous)) {
    reasons.push({ text: 'Callable by unauthenticated visitors.', readFailure: false });
  }
  if (
    failed ||
    (facts.roles.ok && file.roleIds.ok && ids.some((id) => !roles.some((role) => role.id === id)))
  ) {
    reasons.push({ text: "Couldn't read configuration", readFailure: true });
  }
  // Assigned role names are snapshot rows (FileResult.snapshot.roles), not explanation.
  return makeFinding('webRole', 'Web role assigned.', reasons, [], notScanned);
}

function tablePermissions(grants: GrantSet, analysis: Analysis): Finding {
  const reasons: Reason[] = [];
  const detail: string[] = [OTHER_ROLES_NOTE];
  for (const grant of grants.grants) {
    if (grant.permission.scope === 'Global') {
      reasons.push({
        text: `Global access to \`${grant.permission.table}\` (Global) from role ${grant.roleNames.map((name) => `\`${name}\``).join(', ')}.`,
        readFailure: false,
      });
    }
  }
  const mapped =
    analysis.names?.filter((name) =>
      Object.values(METHOD_FUNCTION).some((method) => method === name),
    ) ?? [];
  const changes = [
    ...new Set(
      grants.grants
        .flatMap((grant) => grant.permission.privileges)
        .filter((privilege) => privilege !== 'Read'),
    ),
  ];
  if (mapped.length === 1 && mapped[0] === 'get' && changes.length > 0) {
    reasons.push({
      text: 'Change privileges on a handler that only exports `get()`',
      readFailure: false,
    });
    detail.push(
      `Change privileges found: ${changes.map((privilege) => (privilege === 'AppendTo' ? 'Append To' : privilege)).join(', ')}.`,
      'Based on exported function names, not on what the code does.',
    );
  }
  const noGrants = grants.grants.length === 0 && grants.reasons.length === 0 && !grants.notScanned;
  if (noGrants && analysis.reason === null && analysis.connectors?.dataverse) {
    reasons.push({
      text: 'Handler uses Dataverse but no table permissions are linked to its roles.',
      readFailure: false,
    });
  }
  if (
    noGrants &&
    analysis.reason === null &&
    analysis.connectors?.undetermined &&
    !analysis.connectors.dataverse
  ) {
    reasons.push({ text: CONNECTORS_UNKNOWN, readFailure: false });
  }
  reasons.push(...grants.reasons);
  for (const grant of grants.grants) {
    if (grant.permission.scope === null)
      reasons.push({
        text: `Couldn't interpret the scope of \`${grant.permission.name}\``,
        readFailure: false,
      });
  }
  if (analysis.reason !== null) reasons.push(analysis.reason);
  return makeFinding(
    'tablePermissions',
    noGrants
      ? 'No Dataverse access in code, so no table permissions are needed.'
      : 'Table permissions linked to the grant set.',
    reasons,
    detail,
    grants.notScanned || analysis.notScanned,
  );
}

function outbound(facts: SiteFacts, analysis: Analysis): Finding {
  const connectors = analysis.connectors;
  // O0 / O1: code-based rows are decided first and never depend on settings (FR-9).
  if (analysis.reason === null && connectors !== null && !connectors.httpClient) {
    return connectors.undetermined
      ? makeFinding('outbound', '', [{ text: CONNECTORS_UNKNOWN, readFailure: false }], [])
      : makeFinding('outbound', 'No HttpClient calls in code.', [], [FLOW_NOTE]);
  }
  const codeReason =
    analysis.reason ??
    (connectors === null && !analysis.notScanned
      ? { text: CODE_ANALYSIS_LIMIT, readFailure: false }
      : null);
  const reasons: Reason[] = codeReason === null ? [] : [codeReason];
  if (!facts.settings.ok) {
    if (facts.settings.reason === 'read-failed') {
      reasons.push({ text: "Couldn't read configuration", readFailure: true });
    }
    return makeFinding(
      'outbound',
      '',
      reasons,
      [],
      analysis.notScanned || facts.settings.reason === 'not-scanned',
    );
  }
  const domains = parseAllowedDomains(facts.settings.value['ServerLogic/AllowedDomains']);
  const all = parseBooleanSetting(
    'ServerLogic/AllowNetworkingToAllDomains',
    facts.settings.value['ServerLogic/AllowNetworkingToAllDomains'],
  );
  // O2 reasons lead; every known wildcard reason is kept with them (WR-006).
  const invalid = [...domains.reasons, ...all.reasons];
  reasons.push(
    ...invalid,
    ...(domains.value?.wildcards ?? []).map((entry) => ({
      text: `Wildcard entries aren't supported: \`${entry}\` matches no host.`,
      readFailure: false,
    })),
  );
  const notScanned = analysis.notScanned || domains.notScanned || all.notScanned;
  const detail = domains.fromEnvVar || all.fromEnvVar ? [ENVVAR_CACHE_NOTE] : [];
  if (
    codeReason !== null ||
    notScanned ||
    invalid.length > 0 ||
    domains.value === null ||
    all.value === null
  ) {
    return makeFinding('outbound', '', reasons, detail, notScanned);
  }
  const hosts = domains.value.hosts;
  const row = all.value
    ? hosts.length === 0
      ? 'All domains allowed. Limit to the hosts it calls.'
      : "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list doesn't apply and all domains are allowed."
    : hosts.length === 0
      ? 'Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed.'
      : `Allowed domains ${hosts.map((host) => `\`${host}\``).join(', ')}. Whether they cover every host the handler calls isn't checked.`;
  if (all.value || hosts.length === 0) reasons.push({ text: row, readFailure: false });
  return makeFinding('outbound', row, reasons, [row, ...detail]);
}

export function evaluateFileChecks(facts: SiteFacts, file: ServerLogicFileFacts): FileResult {
  const analysis = analyse(file);
  const grants = buildGrantSet(facts, file);
  const web = webRole(facts, file);
  const tables = tablePermissions(grants, analysis);
  const network = outbound(facts, analysis);
  const roles =
    facts.roles.ok && file.roleIds.ok
      ? facts.roles.value
          .filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id))
          .map(
            (role) =>
              `${role.name}${role.anonymous ? ' (Anonymous Users Role)' : role.authenticated ? ' (Authenticated Users Role)' : ''}`,
          )
      : [web.summary];
  return {
    fileId: file.id,
    name: file.name,
    active: file.active,
    findings: [web, tables, network],
    snapshot: {
      roles: [...roles, OTHER_ROLES_NOTE],
      tables: permissionSnapshot(grants),
      outbound: [network.summary, ...settingSnapshot(facts)],
    },
  };
}
