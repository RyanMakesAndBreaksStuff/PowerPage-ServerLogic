import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/session/HostContext';
import { connectionKey, useConnectionState } from '@/session/useActiveConnection';
import { useNotify } from '@/session/useNotify';
import { evaluateSite } from '@/features/inspector/model/rules';
import type { Connection } from '@/services/pptb/host.types';
import type { InspectorDeps } from './inspectorDeps';
import { createInspectorStore, EMPTY_MARKS, INITIAL_SNAPSHOT } from './inspectorSession';
import type { InspectorSnapshot, InspectorSession } from '@/types/inspectorSession';
import { InspectorSessionContext } from '@/session/useInspector';

/** The snapshot as it must read for a connection the store has not adopted yet: nothing carries over (AC-7.6). */
function blankFor(connection: Connection | null, snapshot: InspectorSnapshot): InspectorSnapshot {
  return {
    ...INITIAL_SNAPSHOT,
    ownerKey: connection === null ? null : connectionKey(connection),
    connection,
    sites: connection === null ? { status: 'idle' } : { status: 'loading' },
    marks: EMPTY_MARKS,
    generation: snapshot.generation,
    // The close counter is not connection state; blanking it would read as N, 0, N and re-fire the page's focus effect.
    exportStaleCloses: snapshot.exportStaleCloses,
  };
}

/**
 * Mounted around the whole shell (title bar and every page), so connection changes are handled while Starter
 * or Server Objects is visible. It adds no host subscription: it follows the ConnectionProvider's state.
 * The host and deps are fixed for the life of the app, as they are for the other providers.
 */
export function InspectorSessionProvider({
  children,
  deps,
}: {
  readonly children: ReactNode;
  readonly deps: InspectorDeps;
}): ReactElement {
  const host = useHost();
  const notify = useNotify();
  const connectionState = useConnectionState();
  const [store] = useState(() => createInspectorStore(host, deps, notify));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // undefined: no read has succeeded yet, so there is nothing to adopt or to invalidate.
  const confirmed: Connection | null | undefined =
    connectionState.status === 'unknown'
      ? undefined
      : connectionState.status === 'connected'
        ? connectionState.connection
        : null;

  // A first confirmed connection or a changed identity loads the site list; a same-identity re-read reloads nothing (D-16 A).
  useEffect(() => {
    if (confirmed !== undefined) store.adopt(confirmed);
  }, [store, confirmed]);

  useEffect(
    () => () => {
      store.stop();
    },
    [store],
  );

  // Until the effect above has adopted a changed identity, show it as already cleared.
  const stale =
    confirmed !== undefined &&
    snapshot.ownerKey !== (confirmed === null ? null : connectionKey(confirmed));
  const view = stale ? blankFor(confirmed, snapshot) : snapshot;

  const session: InspectorSession = {
    connection: view.connection,
    sites: view.sites,
    scan: view.scan,
    fileId: view.fileId,
    marks: view.marks,
    generation: view.generation,
    exportJob: view.exportJob,
    exportStaleCloses: view.exportStaleCloses,
    // S-08: a scan the connection change discarded has no site to show in the picker.
    selectedSite:
      view.scan.status === 'none' || view.scan.status === 'connection-changed' ? null : view.scan.site,
    result: view.scan.status === 'done' ? evaluateSite(view.scan.facts, view.marks) : null,
    selectSite: store.selectSite,
    rescan: store.rescan,
    retrySites: store.retrySites,
    selectFile: store.selectFile,
    setReviewed: store.setReviewed,
    openExport: store.openExport,
    setExportOptions: store.setExportOptions,
    closeExport: store.closeExport,
    submitExport: store.submitExport,
  };

  return <InspectorSessionContext value={session}>{children}</InspectorSessionContext>;
}
