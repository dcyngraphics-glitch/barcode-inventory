import { useEffect } from 'react';
import { loadSettings } from '@/services/settingsService';

export function useTheme() {
  useEffect(() => {
    const applyTheme = () => {
      try {
        // Try to load settings
        const settings = loadSettings() as { theme?: string } | null;
        
        // Determine theme to apply
        let themeToApply: 'auto' | 'light' | 'dark' = 'auto';
        
        if (settings && settings.theme) {
          const themeFromSettings = settings.theme;
          if (themeFromSettings === 'auto' || themeFromSettings === 'light' || themeFromSettings === 'dark') {
            themeToApply = themeFromSettings as 'auto' | 'light' | 'dark';
          }
          // If settings.theme is invalid, keep default 'auto'
        }
        
        // If auto, check system preference
        if (themeToApply === 'auto') {
          try {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToApply = prefersDark ? 'dark' : 'light';
          } catch (e) {
            // If matchMedia fails, default to light
            themeToApply = 'light';
          }
        }
        
        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', themeToApply);
        
      } catch (err) {
        // If anything goes wrong, default to light mode
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    // Apply theme immediately
    applyTheme();
    
    // Also listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settings') {
        try {
          const settings = e.newValue ? JSON.parse(e.newValue) : null;
          let themeToApply: 'auto' | 'light' | 'dark' = 'auto';
          
          if (settings && settings.theme) {
            const themeFromSettings = settings.theme;
            if (themeFromSettings === 'auto' || themeFromSettings === 'light' || themeFromSettings === 'dark') {
              themeToApply = themeFromSettings as 'auto' | 'light' | 'dark';
            }
          }
          
          if (themeToApply === 'auto') {
            try {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              themeToApply = prefersDark ? 'dark' : 'light';
            } catch (e) {
              themeToApply = 'light';
            }
          }
          
          document.documentElement.setAttribute('data-theme', themeToApply);
        } catch (err) {
          // If error parsing settings, default to light
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
}