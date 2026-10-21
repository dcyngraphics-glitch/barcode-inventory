import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Viewport meta tag WCAG 1.4.4 compliance', () => {
  it('allows zoom - no maximum-scale or user-scalable=no', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    const viewportMatch = html.match(/<meta name="viewport" content="([^"]+)" \/>/);
    expect(viewportMatch).toBeTruthy();

    const content = viewportMatch![1];
    expect(content).not.toContain('maximum-scale');
    expect(content).not.toContain('user-scalable=no');
    expect(content).toContain('width=device-width');
    expect(content).toContain('initial-scale=1.0');
  });
});