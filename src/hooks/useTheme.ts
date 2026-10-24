import { useEffect } from 'react';
import { useSettings } from './useSettings';

/**
 * localStorage key holding the last theme this device actually resolved to.
 *
 * `useTheme` resolves the theme from IndexedDB, which is async, so the correct
 * value only lands after React mounts — by which point the first frame has
 * already been painted. When the user's choice differs from the OS preference
 * (theme 'dark' on a light system, say) that first frame renders in the wrong
 * theme and the app visibly flashes. index.html reads this key in an inline
 * script before first paint to close that gap.
 */
const RESOLVED_THEME_KEY = 'resolvedTheme';

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    // DEFAULT_SETTINGS.theme is 'auto', so an unloaded settings object still
    // resolves from the OS preference rather than forcing a theme.
    const theme = settings?.theme ?? 'auto';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (prefersDark: boolean) => {
      let themeToApply = theme;
      if (themeToApply === 'auto') {
        themeToApply = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', themeToApply);
      try {
        localStorage.setItem(RESOLVED_THEME_KEY, themeToApply);
      } catch {
        // Storage unavailable — the attribute still applies for this session.
      }
    };

    applyTheme(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);
}
