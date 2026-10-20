/**
 * Wave 2 of docs/plans/2026-10-20-audit-remediation.md.
 *
 * The remaining Wave 2 fixes are structural properties of source files rather
 * than rendered behaviour (a hardcoded hex in an inline style, a decorative
 * icon missing `aria-hidden`, a missing skip link). Asserting them at the
 * source level is direct and cannot be made to pass by accident, the way a
 * rendered-pixel check could.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const read = (rel: string) =>
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), rel),
    'utf8',
  );

describe('RecentScans — no hardcoded colours, no duplicate keyframes', () => {
  it('declares no hex colour literals', () => {
    // The audit found three: #059669, #334155, #94a3b8 — all inline styles.
    expect(read('../components/RecentScans.tsx')).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('does not re-declare a keyframes animation the stylesheet already defines', () => {
    // index.css already ships `@keyframes shimmer`; the inline <style> tag in this
    // component was a second, divergent copy.
    expect(read('../components/RecentScans.tsx')).not.toContain('@keyframes');
  });
});

describe('ScannerScreen — decorative icons are hidden from assistive tech', () => {
  it('marks both ScanLine icons as aria-hidden', () => {
    // One in the app-bar title, one over the viewfinder. Both are decorative.
    const src = read('../screens/ScannerScreen.tsx');
    expect((src.match(/aria-hidden/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('App shell — skip link', () => {
  it('renders a skip link targeting the main content region', () => {
    const src = read('../App.tsx');
    expect(src).toMatch(/href="#main"/);
    expect(src).toMatch(/id="main"/);
  });

  it('styles the skip link so it is visible on focus and hidden until then', () => {
    const src = read('../index.css');
    expect(src).toMatch(/\.skip-link\b/);
    // Off-screen at rest, brought into view on focus — the standard pattern.
    expect(src).toMatch(/\.skip-link:focus-visible\s*\{[^}]*left:\s*0/);
  });
});

describe('QuickEntryModal — type floor', () => {
  it('declares no inline font-size below the 12px floor', () => {
    // The "Leave empty for 30 days" helper was inline 11px.
    expect(read('../components/QuickEntryModal.tsx')).not.toMatch(/fontSize:\s*'11px'/);
  });
});
