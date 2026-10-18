import type { ReactNode } from 'react';
import { RELEASED_PAGES } from '@/app/releasedPages';
import { InspectorPage } from '@/features/inspector/InspectorPage';
import { ServerObjectsPage } from '@/features/server-objects/ServerObjectsPage';
import { StarterPage } from '@/features/starter/StarterPage';
import type { View } from '@/types/http';

const TABS: readonly { view: View; label: string }[] = [
  { view: 'starter', label: 'Logic Starter' },
  { view: 'objects', label: 'Server Objects' },
  { view: 'inspector', label: 'Logic Inspector' },
];

export function App(): ReactNode {
  return (
    <main>
      <div role="tablist" aria-label="Pages">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            role="tab"
            aria-selected={tab.view === RELEASED_PAGES[0]}
            aria-disabled={!RELEASED_PAGES.includes(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {__PAGE_STARTER__ ? <StarterPage /> : null}
      {__PAGE_OBJECTS__ ? <ServerObjectsPage /> : null}
      {__PAGE_INSPECTOR__ ? <InspectorPage /> : null}
    </main>
  );
}
