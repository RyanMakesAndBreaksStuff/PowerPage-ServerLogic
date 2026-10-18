import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { applyTheme } from '@/app/useHostTheme';
import { createPptbHost } from '@/services/pptb/pptbHost';
import type { ThemeName } from '@/services/pptb/host.types';
import './index.css';

function logRenderError(error: unknown): void {
  console.error('Render error', error instanceof Error ? error.name : 'unknown');
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found');
}
const root = rootElement;
const host = createPptbHost();

// First frame in the host theme; light when the host cannot answer (AC-1.6). No top-level await in an IIFE.
void host
  .getTheme()
  .catch((): ThemeName => 'light')
  .then((theme) => {
    applyTheme(theme);
    createRoot(root, {
      onCaughtError: (error) => {
        logRenderError(error);
      },
      onUncaughtError: (error) => {
        logRenderError(error);
      },
    }).render(
      <StrictMode>
        <App host={host} />
      </StrictMode>,
    );
  });
