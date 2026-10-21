import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.resolve(__dirname, '../index.css');

function extractDeclarations(selector: string) {
  const css = readFileSync(CSS_PATH, 'utf-8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 's');
  const match = css.match(regex);
  if (!match) return null;
  const declarations = match[1];
  const result: Record<string, string> = {};
  declarations.split(';').forEach((decl) => {
    const [prop, ...valParts] = decl.split(':');
    if (prop && valParts.length) {
      result[prop.trim()] = valParts.join(':').trim();
    }
  });
  return result;
}

describe('BottomNav touch target spacing (WCAG 2.5.5)', () => {
  it('declares 8px gap and 8px vertical padding on .bottom-nav-item', () => {
    const decls = extractDeclarations('.bottom-nav-item');
    expect(decls, '.bottom-nav-item rule must exist').toBeTruthy();
    expect(decls?.gap, 'gap must be 8px').toBe('8px');
    // padding shorthand: "8px 0" means 8px top/bottom, 0 left/right
    expect(decls?.padding, 'padding must be 8px 0').toBe('8px 0');
  });

  it('declares min-height 44px on interactive elements for touch targets', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    const minHeightRegex = /min-height:\s*44px/;
    expect(css).toMatch(minHeightRegex);
  });
});