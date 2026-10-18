import { useEffect } from 'react';
import type { PptbHost, ThemeName } from '@/services/pptb/host.types';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

// PPTB has no theme event, so re-read on settings:updated, focus and visibility (AC-1.6).
export function useHostTheme(host: PptbHost): void {
  useEffect(() => {
    let active = true;
    const reread = (): void => {
      host.getTheme().then(
        (theme) => {
          if (active) applyTheme(theme);
        },
        () => undefined, // keep the current theme; the adapter has logged the failure
      );
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') reread();
    };
    const unsubscribe = host.onEvent((event) => {
      if (event.kind === 'settings-updated') reread();
    });
    window.addEventListener('focus', reread);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', reread);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [host]);
}
