import { useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useInspector } from '@/app/inspector-site/useInspector';
import { useConnectionState, useRefreshConnection } from '@/app/useActiveConnection';
import type { ConnectionState } from '@/app/useActiveConnection';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  announcementFor,
  CONNECTION_CHANGED_TITLE,
  CONNECTION_UNREADABLE_TEXT,
  connectionChangedText,
  DISCONNECTED_TEXT,
  EXPORT_REASON,
  NO_SITES_TEXT,
  NON_DEV_WARNING,
  progressText,
  REFRESH_FAILED_TEXT,
} from './pageCopy';
import { derivePageState } from './pageState';
import type { PageState } from './pageState';
import { ResultsView } from './ResultsView';
import { StatePanel } from './StatePanel';
import './inspector.css';

/**
 * Retry hides itself while its read runs (D-05) and Scan again unmounts the panel it sits in, so the focused
 * button would vanish and focus would fall to the page body. `request()` is called from those two handlers;
 * after that commit the heading of the panel on screen (`ref`) takes focus, once. The heading has
 * `tabIndex={-1}`: reachable by script, not a new Tab stop. Retry stays unmounted while pending, not
 * `aria-disabled` (D-05).
 *
 * When a scan ends, its panel unmounts too. If the scanning heading still held focus, the heading of the
 * panel that replaces it takes focus; if the user moved focus elsewhere during the scan, it is left alone.
 */
function useHeadingFocus(scanning: boolean): {
  ref: RefObject<HTMLHeadingElement | null>;
  request: () => void;
} {
  const ref = useRef<HTMLHeadingElement>(null);
  const [requests, setRequests] = useState(0);
  useEffect(() => {
    if (requests > 0) ref.current?.focus();
  }, [requests]);
  useEffect(() => {
    if (!scanning) return;
    const heading = (): HTMLHeadingElement | null => ref.current;
    let follow = document.activeElement !== null && document.activeElement === heading();
    const onFocusIn = (event: FocusEvent): void => {
      follow = event.target === heading();
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      // The scanning heading is gone by now; focus fell to the body only if it was still on that heading.
      const active = document.activeElement;
      if (follow && (active === null || active === document.body)) heading()?.focus();
    };
  }, [scanning]);
  return {
    ref,
    request: () => {
      setRequests((count) => count + 1);
    },
  };
}

function RetryConnection({ onRetry }: { onRetry: () => void }): ReactElement | null {
  const { refresh, pending } = useRefreshConnection();
  if (pending) return null;
  return (
    <Button
      onClick={() => {
        onRetry();
        refresh();
      }}
    >
      <Icon name="arrow-clockwise" size={14} />
      Retry
    </Button>
  );
}

/**
 * Persistent, non-blocking notices above every state: the AC-7.5 and AC-7.11 warning for anything but a Dev
 * environment, and a failed refresh that kept the last confirmed connection (WR-005, with Retry).
 */
function PageNotices({
  connection,
  onRetry,
}: {
  connection: ConnectionState;
  onRetry: () => void;
}): ReactElement | null {
  const warnEnvironment =
    connection.status === 'connected' && connection.connection.environment !== 'Dev';
  const refreshFailed = connection.status !== 'unknown' && connection.refreshFailed;
  if (!warnEnvironment && !refreshFailed) return null;
  return (
    <ul className="inspector-banners" aria-label="Page notices">
      {warnEnvironment ? (
        <li className="inspector-notice">
          <Icon name="warning" size={16} />
          <span>{NON_DEV_WARNING}</span>
        </li>
      ) : null}
      {refreshFailed ? (
        <li className="inspector-notice">
          <Icon name="info" size={16} />
          <span>{REFRESH_FAILED_TEXT}</span>
          <RetryConnection onRetry={onRetry} />
        </li>
      ) : null}
    </ul>
  );
}

function PageBody({
  state,
  focus,
}: {
  state: PageState;
  focus: ReturnType<typeof useHeadingFocus>;
}): ReactElement {
  const session = useInspector();
  const { ref: headingRef, request } = focus;
  // Scan again (here and in the results) and the sites Retry move focus to the next panel's heading.
  const rescan = (): void => {
    request();
    session.rescan();
  };
  switch (state.kind) {
    case 'connection-unknown':
      return state.failed ? (
        <StatePanel
          icon="error-circle"
          title="Couldn't read the active connection"
          text={CONNECTION_UNREADABLE_TEXT}
          headingRef={headingRef}
        >
          <RetryConnection onRetry={request} />
        </StatePanel>
      ) : (
        <StatePanel icon="info" title="Checking the active connection" headingRef={headingRef} busy />
      );
    case 'disconnected':
      return (
        <StatePanel
          icon="info"
          title="No active connection"
          text={DISCONNECTED_TEXT}
          headingRef={headingRef}
        />
      );
    case 'sites-loading':
      return (
        <StatePanel
          icon="info"
          title="Loading sites"
          text="Reading the Power Pages sites in this environment."
          headingRef={headingRef}
          busy
        />
      );
    case 'sites-error':
      return (
        <StatePanel
          icon="error-circle"
          title="Couldn't load sites"
          text={state.message}
          headingRef={headingRef}
        >
          <Button
            onClick={() => {
              request();
              session.retrySites();
            }}
          >
            <Icon name="arrow-clockwise" size={14} />
            Retry
          </Button>
        </StatePanel>
      );
    case 'no-sites':
      // AC-7.8 says "Export report is disabled", so the control is shown here too (D-09, D-17).
      return (
        <StatePanel icon="info" title="No sites found" text={NO_SITES_TEXT} headingRef={headingRef}>
          <Button disabledReason={EXPORT_REASON}>
            <Icon name="arrow-download" size={14} />
            Export report
          </Button>
        </StatePanel>
      );
    case 'choose-site':
      return (
        <StatePanel
          icon="target"
          title="Select a site"
          text="Choose a Power Pages site in the title bar to scan its server logic."
          headingRef={headingRef}
        />
      );
    case 'scanning':
      return (
        <StatePanel
          icon="search"
          title={`Scanning ${state.site.name}`}
          text={progressText(state.progress)}
          headingRef={headingRef}
          busy
        />
      );
    case 'scan-failed':
      return (
        <StatePanel
          icon="error-circle"
          title={`Couldn't scan ${state.site.name}`}
          text="The scan stopped because of an unexpected error. Nothing was kept."
          headingRef={headingRef}
        >
          <Button onClick={rescan}>
            <Icon name="arrow-clockwise" size={14} />
            Scan again
          </Button>
        </StatePanel>
      );
    case 'connection-changed':
      // No Scan again: the picker is the one action that can complete from here (D-14).
      return (
        <StatePanel
          icon="info"
          title={CONNECTION_CHANGED_TITLE}
          text={connectionChangedText(state.site)}
          headingRef={headingRef}
        />
      );
    case 'results':
      return (
        <ResultsView
          key={state.result.facts.scanId}
          result={state.result}
          headingRef={headingRef}
          onRescan={rescan}
        />
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

/** Logic Inspector (Story 7 and 8). Every state comes from the app-scoped session and the connection. */
export function InspectorPage(): ReactElement {
  const connection = useConnectionState();
  const session = useInspector();
  const state = derivePageState(connection, session);
  const focus = useHeadingFocus(state.kind === 'scanning');
  return (
    <section className="inspector" aria-label="Logic Inspector">
      <div role="status" aria-label="Inspector status" className="inspector-sr-only">
        {announcementFor(state)}
      </div>
      <PageNotices connection={connection} onRetry={focus.request} />
      <PageBody state={state} focus={focus} />
    </section>
  );
}
