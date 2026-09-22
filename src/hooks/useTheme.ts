import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings) return;

    const applyTheme = (prefersDark: boolean) => {
      let themeToApply = settings.theme ?? 'auto';
      if (themeToApply === 'auto') {
        themeToApply = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', themeToApply);
    };

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);
}
