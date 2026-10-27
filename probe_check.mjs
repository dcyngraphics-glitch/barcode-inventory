import { readFileSync } from 'node:fs';
const CSS = readFileSync('src/index.css', 'utf8');

function extractTokenBlock(css, selector) {
  const start = css.indexOf(selector + ' {');
  if (start === -1) throw new Error('not found: ' + selector);
  let i = start + selector.length + 2;
  let depth = 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  const body = css.slice(start + selector.length + 2, i - 1);
  const tokens = {};
  let pos = 0;
  while (pos < body.length) {
    const d = body.indexOf(';', pos);
    const chunk = d === -1 ? body.slice(pos) : body.slice(pos, d);
    const eq = chunk.indexOf(':');
    if (eq !== -1) {
      const name = chunk.slice(0, eq).trim();
      if (name.startsWith('--')) tokens[name] = chunk.slice(eq + 1).trim();
    }
    pos = d === -1 ? body.length : d + 1;
  }
  return tokens;
}

const LIGHT = extractTokenBlock(CSS, ':root');
const DARK_OVERRIDES = extractTokenBlock(CSS, '[data-theme="dark"]');
const SYSTEM_DARK = extractTokenBlock(CSS, ':root:not([data-theme="light"])');
const DARK = { ...LIGHT, ...DARK_OVERRIDES, ...SYSTEM_DARK };

function parseHex(hex) {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const relLum = (hex) => {
  const [r, g, b] = parseHex(hex);
  const l = [r, g, b].map(c => lin(c));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const contrast = (fg, bg) => {
  const lf = relLum(fg), lb = relLum(bg);
  const [hi, lo] = lf >= lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
};

const pairs = [
  ['BORDER input border vs card', '--color-border', '--color-card', 3.0],
  ['BORDER input border vs background', '--color-border', '--color-background', 3.0],
  ['BORDER card border vs card', '--color-border', '--color-card', 3.0],
  ['camera start btn (white on #059669)', '--color-on-accent', '--color-good', 4.5],
];

console.log('--- token values ---');
console.log('LIGHT  --color-border:', LIGHT['--color-border']);
console.log('LIGHT  --color-card:', LIGHT['--color-card']);
console.log('LIGHT  --color-background:', LIGHT['--color-background']);
console.log('DARK_OVERRIDES --color-border:', DARK_OVERRIDES['--color-border']);
console.log('DARK_OVERRIDES --color-card:', DARK_OVERRIDES['--color-card']);
console.log('DARK_OVERRIDES --color-background:', DARK_OVERRIDES['--color-background']);
console.log('DARK_OVERRIDES --color-on-accent:', DARK_OVERRIDES['--color-on-accent']);
console.log('DARK_OVERRIDES --color-good:', DARK_OVERRIDES['--color-good']);
console.log('--- DARK resolutions ---');
for (const p of pairs) {
  const f = p.f.startsWith('--') ? DARK[p.f.slice(2)] : p.f;
  const b = p.b.startsWith('--') ? DARK[p.b.slice(2)] : p.b;
  console.log(p.label, '->', f, 'on', b, '=' + contrast(f, b).toFixed(2) + ':1 (need ' + p.min + ')  ' + (contrast(f, b) >= p.min ? 'PASS' : 'FAIL'));
}
console.log('--- LIGHT resolutions ---');
for (const p of pairs) {
  const f = p.f.startsWith('--') ? LIGHT[p.f.slice(2)] : p.f;
  const b = p.b.startsWith('--') ? LIGHT[p.b.slice(2)] : p.b;
  console.log(p.label, '->', f, 'on', b, '=' + contrast(f, b).toFixed(2) + ':1 (need ' + p.min + ')  ' + (contrast(f, b) >= p.min ? 'PASS' : 'FAIL'));
}
