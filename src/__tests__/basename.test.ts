import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveBasename } from '@/utils/basename';

describe('resolveBasename', () => {
  it('uses the GitHub Pages subpath in a production build that is not on Vercel', () => {
    expect(resolveBasename({ isProd: true, isVercel: false })).toBe('/barcode-inventory/');
  });

  it('uses the domain root when deployed on Vercel', () => {
    expect(resolveBasename({ isProd: true, isVercel: true })).toBe('/');
  });

  it('uses the domain root in local development', () => {
    expect(resolveBasename({ isProd: false, isVercel: false })).toBe('/');
  });
});

/**
 * resolveBasename is only correct if it is fed the right answer. It was not: the caller
 * read `import.meta.env.VERCEL`, which Vite never populates (only VITE_-prefixed names
 * reach the bundle), so isVercel was always false and every production build took the
 * GitHub Pages branch. On Vercel the router's basename became '/barcode-inventory/',
 * which matches no URL — the router rendered nothing and the app showed a blank page.
 */
describe('deployment-target wiring', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));

  /** Comments legitimately *discuss* import.meta.env.VERCEL — they are not usage. */
  function stripComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  }

  it('reads the target from vite.config define(), not import.meta.env', () => {
    const main = stripComments(readFileSync(path.resolve(here, '..', 'main.tsx'), 'utf8'));
    expect(main).toContain('__IS_VERCEL__');
    expect(main).not.toMatch(/import\.meta\.env\.VERCEL/);
  });

  it('vite.config defines __IS_VERCEL__ for the bundle', () => {
    const config = readFileSync(path.resolve(here, '..', '..', 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/__IS_VERCEL__\s*:/);
  });
});
