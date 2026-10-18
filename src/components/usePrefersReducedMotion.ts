import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', callback);
  return () => {
    list.removeEventListener('change', callback);
  };
}

function getSnapshot(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

// Motion is allowed whenever the browser cannot say otherwise (jsdom, first paint on the server).
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
