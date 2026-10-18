import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import './index.css';

function logRenderError(error: unknown): void {
  console.error('Render error', error instanceof Error ? error.name : 'unknown');
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement, {
  onCaughtError: (error) => {
    logRenderError(error);
  },
  onUncaughtError: (error) => {
    logRenderError(error);
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
