/**
 * Resolve the React Router basename for the deployment target.
 *
 * GitHub Pages serves this app from a subpath (/barcode-inventory/); Vercel serves
 * it from the domain root.
 *
 * Derive this from Vite's `import.meta.env.PROD` — NOT from `process.env.NODE_ENV`.
 * vite.config.ts defines `process.env` as `{ NODE_ENV: 'development' }` inside the
 * browser bundle, so a NODE_ENV check is always false in a production build. The app
 * then ships with basename '/', the URL escapes the /barcode-inventory/ subpath, and
 * every reload or bookmark 404s.
 */
export function resolveBasename({ isProd, isVercel }: { isProd: boolean; isVercel: boolean }): string {
  return isProd && !isVercel ? '/barcode-inventory/' : '/';
}
