import { describe, it, expect } from 'vitest';
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
