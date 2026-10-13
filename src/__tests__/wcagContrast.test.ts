import { describe, it, expect } from 'vitest';
import { contrastRatio, resolveThemeTokens, resolveVarValue } from './wcagContrast';

describe('WCAG contrast helpers', () => {
  it('computes known reference ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // #767676 on white is the canonical AA boundary for normal text
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });

  it('parses distinct tokens for light and dark themes', () => {
    const light = resolveThemeTokens('light');
    const dark = resolveThemeTokens('dark');
    expect(light['--color-foreground']).toBeDefined();
    expect(dark['--color-foreground']).toBeDefined();
    expect(light['--color-foreground']).not.toBe(dark['--color-foreground']);
  });

  it('resolves var() references including fallbacks', () => {
    const light = resolveThemeTokens('light');
    expect(resolveVarValue('var(--color-foreground)', light)).toBe(
      light['--color-foreground']
    );
    expect(resolveVarValue('var(--nope, #123456)', light)).toBe('#123456');
    expect(resolveVarValue('#abcdef', light)).toBe('#abcdef');
  });

  it('rejects unresolvable variables instead of guessing', () => {
    expect(() =>
      resolveVarValue('var(--totally-missing-token)', resolveThemeTokens('light'))
    ).toThrow(/Unresolvable/);
  });
});
