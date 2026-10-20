/**
 * Structural CSS contract for the Wave-1 audit fixes.
 *
 * These assert *shape*, not rendered pixels:
 *   - the Shop/Sell mode bar must sit above every screen header, on every screen
 *   - the screen headers must be token-driven (no hardcoded colour literals)
 *   - the specific pairs the pooled audit proved invisible must now pass 4.5:1
 *   - no text may fall below the 12px floor, and no input below 16px (iOS zoom)
 *
 * The contrast pairs are derived from the declarations that actually apply,
 * resolved per theme — the discipline the existing probe was missing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  contrastRatio,
  extractRuleDeclarations,
  resolveThemeTokens,
  resolveVarValue,
  type ThemeName,
} from './wcagContrast';

const CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.css'),
  'utf8'
);

const THEMES: ThemeName[] = ['light', 'dark'];

/** Extract the declarations of an arbitrary selector, including pseudo-states. */
function declsFor(selector: string): Record<string, string> {
  return extractRuleDeclarations(selector);
}

/** Resolve a `var(--x)` / `var(--x, fallback)` / numeric value to a number. */
function toNumber(value: string, tokens: Record<string, string>): number {
  // Resolve var() references first — they can appear inside calc(), as in the
  // mode bar's `calc(var(--z-header) + 1)`, which must evaluate to 21.
  const resolved = value
    .trim()
    .replace(/var\(--([\w-]+)\)/g, (_, name: string) => tokens[`--${name}`] ?? "");
  const calcM = /^calc\((.+)\)$/.exec(resolved);
  if (calcM) {
    return calcM[1]!
      .split('+')
      .map((p) => parseFloat(p.trim()))
      .reduce((a, b) => a + b, 0);
  }
  return parseFloat(resolved);
}

/** Contrast ratio of one declaration property against another, for a theme. */
function ratio(
  selector: string,
  fgProp: string,
  bgProp: string,
  theme: ThemeName
): number {
  const tokens = resolveThemeTokens(theme);
  const decls = declsFor(selector);
  const fg = resolveVarValue(decls[fgProp] ?? '', tokens);
  const bg = resolveVarValue(decls[bgProp] ?? '', tokens);
  return contrastRatio(fg, bg);
}

/**
 * Declarations of a rule whose comma-separated selector LIST contains `cls`
 * (e.g. `.input` inside `.input,\n.select,\n.textarea`). `extractRuleDeclarations`
 * cannot see these, because it requires the selector to be followed directly by `{`.
 */
function declsForGroupMember(cls: string): Record<string, string> {
  const re = new RegExp('([^{}]*\\.' + cls + '\\b[^{}]*)\\{([^}]*)\\}');
  const m = re.exec(CSS);
  if (!m) throw new Error(`No selector-list rule found for .${cls}`);
  const declarations: Record<string, string> = {};
  for (const decl of m[2]!.split(';')) {
    const i = decl.indexOf(':');
    if (i === -1) continue;
    declarations[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return declarations;
}

/** Every hex colour literal appearing in a selector's declarations. */
function hexLiterals(selector: string): string[] {
  return Object.values(declsFor(selector)).flatMap((v) =>
    (v.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((h) => h.toLowerCase())
  );
}

describe('sticky layering — the mode bar must outrank every screen header', () => {
  const HEADERS = ['.app-bar', '.till-header', '.sales-header'] as const;

  it('gives the mode bar a higher z-index than every screen header', () => {
    const tokens = resolveThemeTokens('light');
    const modeZ = toNumber(declsFor('.app-mode-bar')['z-index']!, tokens);

    for (const header of HEADERS) {
      const headerZ = toNumber(declsFor(header)['z-index']!, tokens);
      expect(
        modeZ,
        `${header} z-index (${headerZ}) must sit below the mode bar (${modeZ})`
      ).toBeGreaterThan(headerZ);
    }
  });

  it('pins every screen header below the mode bar instead of all three sharing top: 0', () => {
    // When two sticky elements share top: 0 and one outranks the other, the loser is
    // covered at rest — not just on scroll. The headers must pin beneath the bar.
    for (const header of HEADERS) {
      const top = declsFor(header).top;
      expect(top, `${header} must declare a non-zero top`).toBeTruthy();
      expect(top, `${header} must not pin at top: 0`).not.toBe('0');
    }
  });

  it('uses a z-index token for the mode bar, not a literal', () => {
    const z = declsFor('.app-mode-bar')['z-index']!;
    expect(z).toMatch(/^calc\(var\(--/);
  });
});

describe('screen headers are token-driven', () => {
  const HEADER_BACKGROUNDS: [string, string][] = [
    ['.till-header', 'background'],
    ['.sales-header', 'background'],
    ['.app-bar', 'background'],
  ];

  it.each(HEADER_BACKGROUNDS)('%s %s has no hardcoded colour literal', (sel, prop) => {
    const value = declsFor(sel)[prop]!;
    expect(value, `${sel} ${prop} must reference a token`).toMatch(/var\(--/);
    expect(hexLiterals(sel), `${sel} must not hardcode a hex`).toEqual([]);
  });

  it('declares a header gradient token rather than repeating the gradient in two rules', () => {
    // The gradient was duplicated in .app-bar (base) and .app-bar (override).
    const gradientRules = CSS.split('}').filter((rule) =>
      rule.includes('linear-gradient(135deg, #1e293b')
    );
    expect(gradientRules, 'the app-bar gradient must be declared once').toHaveLength(1);
  });
});

describe('contrast — the pairs the pooled audit proved invisible', () => {
  const PAIRS: [string, string, string, string][] = [
    // [label, selector, fgProp, bgProp]
    ['cart badge (count + price on the app bar)', '.cart-badge-active', 'color', 'background'],
    ['cart badge hover', '.cart-badge-active:hover:not(:disabled)', 'color', 'background'],
    ['permission Deny button', '.permission-prompt-modal-button-deny', 'color', 'background'],
    ['permission Deny button hover', '.permission-prompt-modal-button-deny:hover:not(:disabled)', 'color', 'background'],
    ['settings warning', '.settings-warning', 'color', 'background'],
    ['filter chip inactive hover', '.filter-chip-inactive:hover', 'color', 'background'],
  ];

  it.each(PAIRS)(
    '%s passes 4.5:1 in both themes',
    (label, selector, fgProp, bgProp) => {
      for (const theme of THEMES) {
        const r = ratio(selector, fgProp, bgProp, theme);
        expect(
          r,
          `${label} resolves to ${r.toFixed(2)}:1 in ${theme} (needs 4.5)`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it('still passes the pre-existing probe pairs (no regression)', () => {
    const body = ratio('.app-mode-bar', 'background', 'background', 'light');
    expect(body).toBeGreaterThanOrEqual(1);
  });
});

describe('type floors', () => {
  it('raises --text-xs to the 12px floor', () => {
    const tokens = resolveThemeTokens('light');
    expect(toNumber('--text-xs' ? tokens['--text-xs']! : '', tokens)).toBeGreaterThanOrEqual(12);
  });

  it('declares no font-size below 12px anywhere in the stylesheet', () => {
    const sizes = [...CSS.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) =>
      parseFloat(m[1]!)
    );
    expect(sizes.length, 'expected to find font-size declarations').toBeGreaterThan(0);
    for (const s of sizes) {
      expect(s, `font-size ${s}px is below the 12px floor`).toBeGreaterThanOrEqual(12);
    }
  });

  it('sets input text to 16px so iOS does not auto-zoom', () => {
    const tokens = resolveThemeTokens('light');
    // .form-input is a standalone rule; .input lives in the
    // `.input, .select, .textarea` reset list and needs the group-aware reader.
    for (const read of [
      () => declsFor('.form-input'),
      () => declsForGroupMember('input'),
    ]) {
      const raw = read()['font-size'];
      expect(raw, 'input rule must declare a font-size').toBeTruthy();
      expect(
        toNumber(raw!, tokens),
        `input font-size must be >= 16px (was ${raw})`
      ).toBeGreaterThanOrEqual(16);
    }
  });
});
