import { describe, it } from 'vitest';
import { contrastRatio, resolveThemeTokens, resolveVarValue } from './wcagContrast';

const pairs: [string, string, string, number][] = [
  // [label, fgToken, bgToken, minRatio]
  ['body text', '--color-foreground', '--color-background', 4.5],
  ['body text on card', '--color-foreground', '--color-card', 4.5],
  ['muted text', '--color-muted-foreground', '--color-background', 4.5],
  ['muted text on card', '--color-muted-foreground', '--color-card', 4.5],
  ['muted text on muted', '--color-muted-foreground', '--color-muted', 4.5],
  ['secondary text', '--color-secondary', '--color-background', 4.5],
  ['btn primary', '--color-on-accent', '--color-accent', 4.5],
  ['btn secondary', '--color-primary', '--color-background', 4.5],
  ['btn destructive', '--color-on-destructive', '--color-destructive-bg', 4.5],
  ['btn secondary hover (on-primary on primary-bg)', '--color-on-primary', '--color-primary-bg', 4.5],
  ['badge good', '--status-good-text', '--status-good-bg', 4.5],
  ['badge warning', '--status-warning-text', '--status-warning-bg', 4.5],
  ['badge expired', '--status-expired-text', '--status-expired-bg', 4.5],
  ['badge neutral', '--status-neutral-text', '--status-neutral-bg', 4.5],
  ['filter chip active', '--color-on-primary', '--color-primary-bg', 4.5],
  ['filter chip inactive', '--color-muted-foreground', '--color-muted', 4.5],
  ['filter chip inactive hover', '#f8fafc', '#475569', 4.5],
  ['error text', '--color-error-text', '--color-error-bg', 4.5],
  ['error text on card', '--color-error-text', '--color-card', 4.5],
  ['form error', '--color-destructive', '--color-background', 4.5],
  ['bottom nav active', '--color-primary', '--color-card', 4.5],
  ['bottom nav inactive', '--color-muted-foreground', '--color-card', 4.5],
  ['bottom nav label (xs 11px)', '--color-muted-foreground', '--color-card', 4.5],
  ['camera error title', '#f8fafc', '--color-camera-surface', 4.5],
  ['camera error desc', '#94a3b8', '--color-camera-surface', 4.5],
  ['camera retry btn', '--color-on-primary', '--color-primary-bg', 4.5],
  ['camera start title (#f8fafc on rgba(0,0,0,.8) over #000)', '#f8fafc', '#000000', 4.5],
  ['camera start desc (#a8b8cc on rgba(0,0,0,.8))', '#a8b8cc', '#000000', 4.5],
  ['camera start hint (#6b7f96 on rgba(0,0,0,.8))', '#6b7f96', '#000000', 4.5],
  ['camera start btn (white on #059669)', '--color-on-accent', '--color-good', 4.5],
  ['camera helper text', '#94a3b8', '#000000', 3.0],
  ['camera scanning pill', '#f8fafc', '#000000', 4.5],
  ['camera flash btn inactive', '#f8fafc', '#000000', 3.0],
  ['scan fab (white on gradient #059669..#17a974)', '--color-on-accent', '#17a974', 3.0],
  ['scan fab processing (white on #475569)', '--color-on-primary', '#475569', 4.5],
  ['settings section label', '--color-muted-foreground', '--color-background', 4.5],
  ['settings row', '--color-primary', '--color-background', 4.5],
  ['settings info version', '--color-muted-foreground', '--color-background', 4.5],
  ['app bar title', '--color-on-primary', '--color-primary-bg', 4.5],
  ['install banner desc', '--color-muted-foreground', '--color-card', 4.5],
  ['permission deny btn (on-primary on primary-bg)', '--color-on-primary', '--color-primary-bg', 4.5],
  ['link/accent text', '--color-accent-text', '--color-background', 4.5],
  ['toast text', '--color-foreground', '--color-background', 4.5],
  // UI component / non-text contrast (3:1)
  ['BORDER input border vs card', '--color-border', '--color-card', 3.0],
  ['BORDER input border vs background', '--color-border', '--color-background', 3.0],
  ['BORDER card border vs card', '--color-border', '--color-card', 3.0],
  ['BORDER focus ring accent vs card', '--color-accent-border', '--color-card', 3.0],
  ['BORDER focus ring border-focus vs card', '--color-border-focus', '--color-card', 3.0],
  ['BORDER toggle off track vs card', '--color-border', '--color-card', 3.0],
  ['BORDER stepper border vs card', '--color-border', '--color-card', 3.0],
  ['BORDER scan frame accent vs camera bg', '--color-accent', '--color-camera-bg', 3.0],
  ['BORDER scan line vs camera bg', '--color-scan-line', '--color-camera-bg', 3.0],
  ['BORDER camera viewfinder border vs page', '--color-border', '--color-background', 3.0],
  ['BORDER app-bar gradient dark end vs page', '#8090a7', '--color-background', 3.0],
  ['BORDER progress dot vs card', '--color-border', '--color-card', 3.0],
  ['BORDER bottom-sheet handle vs card', '--color-border', '--color-card', 3.0],
  ['BORDER status dot accent on camera bg', '--color-accent', '#000000', 3.0],
];

describe('CONTRAST REPORT', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(theme, () => {
      const tokens = resolveThemeTokens(theme);
      const fails: string[] = [];
      for (const [label, fg, bg, min] of pairs) {
        const f = resolveVarValue(fg.startsWith('--') ? 'var(' + fg + ')' : fg, tokens);
        const b = resolveVarValue(bg.startsWith('--') ? 'var(' + bg + ')' : bg, tokens);
        const r = contrastRatio(f, b);
        if (r < min) {
          fails.push(`${label}: ${f} on ${b} = ${r.toFixed(2)}:1 (need ${min})`);
        }
      }
      process.stdout.write('===== ' + theme.toUpperCase() + ' FAILURES (' + fails.length + ') =====' + String.fromCharCode(92)+'n');
      for (const f of fails) process.stdout.write('  FAIL ' + f + String.fromCharCode(92)+'n');
    });
  }
});
