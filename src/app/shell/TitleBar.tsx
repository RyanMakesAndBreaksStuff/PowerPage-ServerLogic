import type { ReactElement } from 'react';
import { RELEASED_PAGES } from '@/app/releasedPages';
import { useConnectionState } from '@/app/useActiveConnection';
import { useView } from '@/app/useView';
import { connectionStateLabel } from './connectionLabel';
import { SitePill } from './SitePill';
import { TopTabs } from './TopTabs';
import './shell.css';

export function TitleBar(): ReactElement {
  const [view, setView] = useView();
  const connection = useConnectionState();
  return (
    <header className="shell__titlebar">
      <span className="shell__glyph" aria-hidden="true" />
      <span className="shell__name">Server Logic Tools</span>
      <TopTabs view={view} released={RELEASED_PAGES} onSelect={setView} />
      <span className="shell__context">
        <span>{connectionStateLabel(connection)}</span>
        {__PAGE_INSPECTOR__ ? <SitePill /> : null}
      </span>
    </header>
  );
}
