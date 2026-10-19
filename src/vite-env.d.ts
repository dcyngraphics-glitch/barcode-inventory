/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom/vitest" />

interface ImportMetaEnv {
  readonly VITE_DASHBOARD_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Injected by vite.config's define(). True when the bundle was built on Vercel.
 *
 * Use this — never `import.meta.env.VERCEL`. Vite only exposes VITE_-prefixed names to
 * import.meta.env, so a VERCEL check there is always undefined in the browser.
 */
declare const __IS_VERCEL__: boolean;
