import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * WCAG 2.x contrast helpers plus design-token parsing.
 *
 * The app styles its components with `var(--token, fallback)` references, which
 * jsdom does not resolve, so these helpers read src/index.css, extract the
 * token values for each theme, and resolve references down to concrete hex
 * colors. Contrast is then computed with the WCAG 2.x relative-luminance
 * formula. See https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

function parseHex(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex color: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(fg: string, bg: string): number {
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const [hi, lo] = lf >= lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Extract the design tokens declared inside a CSS block, e.g. the `:root`
 * block or the `[data-theme="dark"]` block of src/index.css.
 *
 * The selector is matched as a whole selector (immediately followed by
 * optional whitespace and `{`), never as a substring — so `:root` matches the
 * top-level `:root {` block but never `:root:not(...)`. `.exec` returns the
 * first match, which is the top-level declaration (nested `:root` blocks that
 * live inside `@media` queries appear later in the file and are never reached).
 */
function extractTokenBlock(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selRe = new RegExp(escaped + '\\s*\\{');
  const m = selRe.exec(css);
  if (!m) throw new Error(`Selector not found in CSS: ${selector}`);
  const open = m.index + m[0].length - 1; // index of the opening `{`
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const tokens: Record<string, string> = {};
  const decl = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let d: RegExpExecArray | null;
  while ((d = decl.exec(body)) !== null) {
    tokens[d[1]!] = d[2]!.trim();
  }
  return tokens;
}

const cssPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'index.css'
);
const CSS = readFileSync(cssPath, 'utf8');

const LIGHT = extractTokenBlock(CSS, ':root');
const DARK_OVERRIDES = extractTokenBlock(CSS, '[data-theme="dark"]');
// System-preference dark mode (`prefers-color-scheme: dark`) is a second
// source of dark overrides via `:root:not([data-theme="light"])`. It mirrors
// the explicit toggle but is parsed separately so a change to either dark
// block is caught by these contrast tests.
const SYSTEM_DARK_OVERRIDES = extractTokenBlock(
  CSS,
  ':root:not([data-theme="light"])'
);
// The dark blocks only override a subset of tokens; everything else cascades
// from :root, exactly as the browser would resolve it. Both the explicit
// toggle and the system-preference overrides are applied on top of :root.
const DARK: Record<string, string> = {
  ...LIGHT,
  ...DARK_OVERRIDES,
  ...SYSTEM_DARK_OVERRIDES,
};

export type ThemeName = 'light' | 'dark';

/** The parsed design tokens for a theme. */
export function resolveThemeTokens(theme: ThemeName): Record<string, string> {
  return theme === 'dark' ? DARK : LIGHT;
}

/**
 * Resolve a `var(--token)` / `var(--token, fallback)` reference to a concrete
 * hex color. Non-var() values pass through unchanged.
 */
export function resolveVarValue(
  value: string,
  tokens: Record<string, string>,
  seen = new Set<string>()
): string {
  const trimmed = value.trim();
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+?)\s*)?\)$/.exec(trimmed);
  if (!m) return trimmed;
  const name = m[1]!;
  if (seen.has(name)) throw new Error(`Circular var() reference: ${name}`);
  seen.add(name);
  const defined = tokens[name];
  if (defined !== undefined) return resolveVarValue(defined, tokens, seen);
  const fallback = m[2];
  if (fallback !== undefined) return resolveVarValue(fallback, tokens, seen);
  throw new Error(`Unresolvable CSS variable (no value, no fallback): ${name}`);
}
