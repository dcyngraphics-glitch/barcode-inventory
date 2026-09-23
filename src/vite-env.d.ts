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
