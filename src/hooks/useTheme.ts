import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    // Default to 'light' when settings not yet loaded to prevent system-preference flash
    const theme = settings?.theme ?? 'light';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (prefersDark: boolean) => {
      let themeToApply = theme;
      if (themeToApply === 'auto') {
        themeToApply = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', themeToApply);
    };

    applyTheme(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);
}
