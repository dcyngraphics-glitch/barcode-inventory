// Theme pre-loading script.
//
// Apply the user's saved theme before the first frame is painted.
//
// useTheme resolves the theme from IndexedDB, which is async, so the right value
// only arrives after React mounts. Until then there is no data-theme attribute
// and CSS falls back to prefers-color-scheme — which is wrong whenever the
// user's saved choice differs from the OS setting, producing a visible flash of
// the opposite theme on every cold start. Reading the last resolved value
// (cached by useTheme in src/hooks/useTheme.ts) closes that window; the OS
// preference is the fallback for a first-ever load.
(function () {
  try {
    var stored = localStorage.getItem('resolvedTheme');
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    // storage unavailable — the stylesheet's media query still applies
  }
})();
