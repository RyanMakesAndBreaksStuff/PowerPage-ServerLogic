import type { ReactElement } from 'react';
import type { SiteListState } from '@/app/inspector-site/inspectorSession.types';
import { useInspector } from '@/app/inspector-site/useInspector';
import { useConnectionState } from '@/app/useActiveConnection';
import type { ConnectionState } from '@/app/useActiveConnection';
import { SiteCombobox } from './SiteCombobox';

function unavailableReason(connection: ConnectionState, sites: SiteListState): string | null {
  if (connection.status === 'unknown') return 'Waiting for the active connection.';
  if (connection.status === 'disconnected') {
    return 'Select a connection in Power Platform ToolBox first.';
  }
  switch (sites.status) {
    case 'idle':
    case 'loading':
      return 'Loading sites…';
    case 'error':
      return "Couldn't load sites. Open Logic Inspector to retry.";
    case 'ok':
      return sites.sites.length === 0 ? 'No Power Pages sites in this environment.' : null;
  }
}

/**
 * The title-bar site picker (AC-1.2, AC-7.2). It reads the app-owned Inspector session only. No site is
 * preselected, not even when the environment has one; choosing an active site starts its scan.
 */
export function SitePill(): ReactElement {
  const connection = useConnectionState();
  const { sites, selectedSite, selectSite } = useInspector();
  const list = sites.status === 'ok' ? sites.sites : [];
  return (
    <SiteCombobox
      label="Power Pages site"
      placeholder="No site selected"
      options={list.map((site) => ({
        id: site.id,
        label: site.name,
        detail: site.domain,
        disabled: !site.active,
      }))}
      selectedId={selectedSite?.id ?? null}
      unavailableReason={unavailableReason(connection, sites)}
      onSelect={(id) => {
        const site = list.find((candidate) => candidate.id === id);
        if (site !== undefined) selectSite(site);
      }}
    />
  );
}
