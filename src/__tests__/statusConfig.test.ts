import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getStatusConfig, statusTokenNames } from '@/utils/statusConfig';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.resolve(__dirname, '../index.css');
const STATUSES = ['good', 'expiring', 'expired'] as const;

/**
 * The badges used to carry their own hex literals that duplicated the
 * `--status-*` tokens in src/index.css. The copies had drifted, so the "Good"
 * badge rendered in a colour the stylesheet no longer used. These tests fail if
 * a status colour is authored anywhere other than the stylesheet.
 */
describe('statusConfig — colours come from the design tokens', () => {
  it.each(STATUSES)('%s resolves through var(--status-*) references', (status) => {
    const config = getStatusConfig(status);
    expect(config.bg, `${status} bg must be a token reference`).toMatch(
      /^var\(--status-[\w-]+\)$/,
    );
    expect(config.color, `${status} colour must be a token reference`).toMatch(
      /^var\(--status-[\w-]+\)$/,
    );
  });

  it.each(STATUSES)('%s references a token that exists in src/index.css', (status) => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    const { bg, color } = statusTokenNames(status);

    const name = (ref: string) => /^var\((--[\w-]+)\)$/.exec(ref)?.[1];
    const bgName = name(bg);
    const colorName = name(color);

    expect(bgName, `${status} bg token name`).toBeTruthy();
    expect(colorName, `${status} colour token name`).toBeTruthy();
    expect(css, `${bgName} must be declared`).toContain(`${bgName}:`);
    expect(css, `${colorName} must be declared`).toContain(`${colorName}:`);
  });

  it('declares no hardcoded status hex in the module', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../utils/statusConfig.ts'),
      'utf-8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('gives every status a distinct label', () => {
    const labels = STATUSES.map((s) => getStatusConfig(s).label);
    expect(new Set(labels).size).toBe(STATUSES.length);
  });
});
