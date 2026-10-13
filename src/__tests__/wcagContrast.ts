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
 */
function extractTokenBlock(css: string, selector: string): Record<string, string> {
  const idx = css.indexOf(selector);
  if (idx === -1) throw new Error(`Selector not found in CSS: ${selector}`);
  const open = css.indexOf('{', idx);
  if (open === -1) throw new Error(`No opening brace after ${selector}`);
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
  let m: RegExpExecArray | null;
  while ((m = decl.exec(body)) !== null) {
    tokens[m[1]!] = m[2]!.trim();
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
// The dark block only overrides a subset of tokens; everything else cascades
// from :root, exactly as the browser would resolve it.
const DARK: Record<string, string> = { ...LIGHT, ...DARK_OVERRIDES };

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
