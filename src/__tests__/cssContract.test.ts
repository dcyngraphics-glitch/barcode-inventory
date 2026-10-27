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

describe('sticky layering — screen headers own the top edge', () => {
  const HEADERS = ['.app-bar', '.till-header', '.sales-header'] as const;

  // The Shop/Sell switcher used to sit in a sticky bar above every route, and these
  // headers pinned below it at `top: var(--appbar-height)`. The switcher now lives in
  // Settings, so a non-zero top would leave a blank strip above every screen.
  it.each(HEADERS)('%s pins at top: 0', (header) => {
    const top = declsFor(header).top;
    expect(top, `${header} must declare a top`).toBeTruthy();
    expect(top, `${header} must pin at top: 0`).toBe('0');
  });

  it('declares no mode-bar rule, because nothing renders one', () => {
    expect(CSS).not.toContain('.app-mode-bar');
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
    // Now the gradient is declared once as a token (--appbar-bg).
    // Find the .app-bar rule that uses the appbar-bg token.
    const appBarTokenRule = CSS.split('}').find((rule) =>
      rule.includes('.app-bar {') && rule.includes('background: var(--appbar-bg)')
    );
    expect(appBarTokenRule, 'the app-bar should reference --appbar-bg token').toBeTruthy();
    // No inline gradient literals allowed in the app-bar rule
    const appBarRuleParts = CSS.split('}').filter((rule) =>
      rule.includes('.app-bar {') && rule.includes('background: var(--appbar-bg)')
    );
    expect(appBarRuleParts.length, 'should have one app-bar rule with the token').toBeGreaterThan(0);
    const appBarWithGradient = appBarRuleParts.filter((r) => r.includes('linear-gradient'));
    expect(appBarWithGradient, 'app-bar rule must not hardcode a gradient').toEqual([]);
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

});

describe('type floors', () => {
  it('raises --text-xs to the 12px floor', () => {
    const tokens = resolveThemeTokens('light');
    expect(tokens['--text-xs']).toBeDefined();
    expect(toNumber(tokens['--text-xs']!, tokens)).toBeGreaterThanOrEqual(12);
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

describe('focus-visible — WCAG 2.4.7 focus indicators', () => {
  const FOCUS_COMPONENTS = [
    '.scan-fab',
    '.mode-toggle',
    '.app-mode-segment',
  ] as const;

  it.each(FOCUS_COMPONENTS)('%s declares an explicit :focus-visible rule', (component) => {
    const selector = `${component}:focus-visible`;
    const decls = declsFor(selector);
    expect(decls, `${selector} must have a :focus-visible rule`).toBeTruthy();
    expect(Object.keys(decls).length, `${selector} must declare at least one property`).toBeGreaterThan(0);
  });

  it.each(FOCUS_COMPONENTS)('%s :focus-visible uses a 2px solid outline with a design token', (component) => {
    const selector = `${component}:focus-visible`;
    const decls = declsFor(selector);
    const outline = decls['outline'] ?? '';
    expect(outline, `${selector} must declare an outline`).toBeTruthy();
    // Must be 2px solid with a var() token (not a hardcoded color)
    expect(outline, `${selector} outline must be 2px solid var(--token)`).toMatch(/^2px\s+solid\s+var\(--/);
    // Must use --color-accent or --color-accent-border or --color-focus
    expect(outline, `${selector} outline must use --color-accent, --color-accent-border, or --color-focus`).toMatch(/var\(--color-(accent|accent-border|focus)\)/);
    // Must declare outline-offset
    const offset = decls['outline-offset'] ?? '';
    expect(offset, `${selector} must declare outline-offset`).toBeTruthy();
    expect(parseFloat(offset), `${selector} outline-offset must be >= 2px`).toBeGreaterThanOrEqual(2);
  });

  it('defines --color-focus token for focus ring consistency', () => {
    const light = resolveThemeTokens('light');
    const dark = resolveThemeTokens('dark');
    expect(light['--color-focus'], 'light theme must define --color-focus').toBeDefined();
    expect(dark['--color-focus'], 'dark theme must define --color-focus').toBeDefined();
  });
});
