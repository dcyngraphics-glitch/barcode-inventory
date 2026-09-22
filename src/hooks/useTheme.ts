import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings) {
      let themeToApply = settings.theme ?? 'auto';
      if (themeToApply === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', themeToApply);
    }
  }, [settings]);
}