// Test helper, never imported by the app: mounts `ui` under the host and notification providers App gives it.
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NotifyProvider } from '@/app/NotifyProvider';
import type { PptbHost } from '@/services/pptb/host.types';
import { HostContext } from '@/session/HostContext';

export function renderWithHost(host: PptbHost, ui: ReactElement): RenderResult {
  return render(
    <HostContext value={host}>
      <NotifyProvider>{ui}</NotifyProvider>
    </HostContext>,
  );
}
