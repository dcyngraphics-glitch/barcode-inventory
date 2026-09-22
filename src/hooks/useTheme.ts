import { useEffect } from 'react';
import { loadSettings } from '@/services/settingsService';

export function useTheme() {
  useEffect(() => {
    const applyTheme = async () => {
      try {
        // Try to load settings (async — IndexedDB may not be available)
        const settings = await loadSettings();
        
        // Determine theme to apply
        let themeToApply: 'auto' | 'light' | 'dark' = 'auto';
        
        if (settings && settings.theme) {
          const themeFromSettings = settings.theme;
          if (themeFromSettings === 'auto' || themeFromSettings === 'light' || themeFromSettings === 'dark') {
            themeToApply = themeFromSettings as 'auto' | 'light' | 'dark';
          }
        }
        
        // If auto, check system preference
        if (themeToApply === 'auto') {
          try {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToApply = prefersDark ? 'dark' : 'light';
          } catch (e) {
            themeToApply = 'light';
          }
        }
        
        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', themeToApply);
        
      } catch (err) {
        // If anything goes wrong (e.g. IndexedDB not available), default to light
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    // Apply theme immediately
    applyTheme();
  }, []);
}