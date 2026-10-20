function parseHex(hex) {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0,2),16), parseInt(full.slice(2,4),16), parseInt(full.slice(4,6),16)];
}
function relLum(hex) {
  const [r,g,b] = parseHex(hex);
  const lin = c => { const s=c/255; return s<=0.03928 ? s/12.92 : ((s+0.055)/1.055)**2.4; };
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
}
function cr(fg,bg) {
  const lf=relLum(fg), lb=relLum(bg);
  const [hi,lo]=lf>=lb?[lf,lb]:[lb,lf];
  return +(((hi+0.05)/(lo+0.05)).toFixed(2));
}
const rows = [
  // Toggle switch (index.css:1007-1038): track = --color-border, thumb = white, checked track = --color-accent
  ['LIGHT toggle thumb #fff on track #7a93b2', '#ffffff', '#7a93b2', 3.0],
  ['DARK  toggle thumb #fff on track #657387', '#ffffff', '#657387', 3.0],
  ['LIGHT toggle checked thumb #fff on accent #047857', '#ffffff', '#047857', 3.0],
  ['DARK  toggle checked thumb #fff on accent #047857', '#ffffff', '#047857', 3.0],
  // btn-secondary (index.css:379-388): color --color-primary on transparent over card
  ['LIGHT btn-secondary text #1e293b on card #ffffff', '#1e293b', '#ffffff', 4.5],
  ['DARK  btn-secondary text #8090a7 on card #1e293b', '#8090a7', '#1e293b', 4.5],
  ['LIGHT btn-secondary border #1e293b on card (UI)', '#1e293b', '#ffffff', 3.0],
  ['DARK  btn-secondary border #8090a7 on card (UI)', '#8090a7', '#1e293b', 3.0],
  // filter-chip-inactive:hover (index.css:586-588): muted-fg on border
  ['LIGHT filter-chip hover text #3d4a5c on #7a93b2', '#3d4a5c', '#7a93b2', 4.5],
  ['DARK  filter-chip hover text #9eadc2 on #657387', '#9eadc2', '#657387', 4.5],
  // permission deny (index.css:3031-3034)
  ['LIGHT permission-deny #f8fafc on muted #f1f5f9', '#f8fafc', '#f1f5f9', 4.5],
  ['DARK  permission-deny #ffffff on muted #334155', '#ffffff', '#334155', 4.5],
  // .camera-error-content bg is --color-card (index.css:1358-1366)
  ['LIGHT camera-error-title card-fg #0f172b on card #ffffff', '#0f172b', '#ffffff', 4.5],
  ['DARK  camera-error-title card-fg #f8fafc on card #1e293b', '#f8fafc', '#1e293b', 4.5],
  ['LIGHT camera-error-desc muted-fg #3d4a5c on card #ffffff', '#3d4a5c', '#ffffff', 4.5],
  ['DARK  camera-error-desc muted-fg #9eadc2 on card #1e293b', '#9eadc2', '#1e293b', 4.5],
  // error-border vs error-bg (index.css:1454-1461 form-error-box)
  ['LIGHT error-border #fecaca on error-bg #fee2e2 (UI)', '#fecaca', '#fee2e2', 3.0],
  ['DARK  error-border #7f1d1d on error-bg #450a0a (UI)', '#7f1d1d', '#450a0a', 3.0],
  // --color-warning as text (declared but unused as text)
  ['LIGHT --color-warning #d97706 on background #f8fafc', '#d97706', '#f8fafc', 4.5],
  ['LIGHT --color-warning #d97706 on card #ffffff', '#d97706', '#ffffff', 4.5],
  // mode-toggle labels: 10px (index.css:3103) — size floor, plus colour
  ['LIGHT mode-toggle-label muted-fg #3d4a5c on muted #f1f5f9', '#3d4a5c', '#f1f5f9', 4.5],
  ['LIGHT mode-toggle-label auto on-primary #f8fafc on muted #f1f5f9', '#f8fafc', '#f1f5f9', 4.5],
  ['DARK  mode-toggle-label auto on-primary #ffffff on muted #334155', '#ffffff', '#334155', 4.5],
  // till-paid disabled (index.css:2367-2372): muted-fg on border
  ['LIGHT till-paid:disabled muted-fg #3d4a5c on border #7a93b2', '#3d4a5c', '#7a93b2', 4.5],
  ['DARK  till-paid:disabled muted-fg #9eadc2 on border #657387', '#9eadc2', '#657387', 4.5],
  // settings-warning (index.css:1602-1611): #fef2f2 bg hardcoded, destructive text
  ['LIGHT settings-warning destructive #dc2626 on #fef2f2', '#dc2626', '#fef2f2', 4.5],
  ['DARK  settings-warning destructive #ef4444 on #fef2f2', '#ef4444', '#fef2f2', 4.5],
  // app-bar gradient (index.css:2033) 135deg #1e293b -> #657387, text on-primary
  ['LIGHT app-bar text #f8fafc on gradient mid #41506b', '#f8fafc', '#41506b', 4.5],
  ['DARK  app-bar text #ffffff on gradient end #657387', '#ffffff', '#657387', 4.5],
  ['DARK  app-bar text #ffffff on gradient start #1e293b', '#ffffff', '#1e293b', 4.5],
  // till/sales header hardcoded #334155 with #f8fafc
  ['BOTH  till/sales header #f8fafc on #334155', '#f8fafc', '#334155', 4.5],
  // scan-fab gradient (index.css:1932) white on #059669/#0d9488/#17a974
  ['BOTH  scan-fab #fff on #059669', '#ffffff', '#059669', 4.5],
  ['BOTH  scan-fab #fff on #0d9488', '#ffffff', '#0d9488', 4.5],
  ['BOTH  scan-fab #fff on #17a974', '#ffffff', '#17a974', 4.5],
  ['BOTH  scan-fab processing #fff on #94a3b8', '#ffffff', '#94a3b8', 4.5],
  // login-submit gradient (index.css:2665)
  ['LIGHT login-submit #fff on accent-border #059669', '#ffffff', '#059669', 4.5],
  ['DARK  login-submit #fff on accent-border #10b981', '#ffffff', '#10b981', 4.5],
  // accent as text on card (index.css:326 .text-accent)
  ['LIGHT .text-accent #047857 on card #ffffff', '#047857', '#ffffff', 4.5],
  ['DARK  .text-accent #34d399 on card #1e293b', '#34d399', '#1e293b', 4.5],
  ['LIGHT .text-accent #047857 on background #f8fafc', '#047857', '#f8fafc', 4.5],
  // .text-primary (index.css:325)
  ['LIGHT .text-primary #1e293b on card #ffffff', '#1e293b', '#ffffff', 4.5],
  ['DARK  .text-primary #8090a7 on card #1e293b', '#8090a7', '#1e293b', 4.5],
  ['DARK  .text-primary #8090a7 on background #0f172a', '#8090a7', '#0f172a', 4.5],
  // .text-destructive (index.css:327)
  ['LIGHT .text-destructive #dc2626 on card #ffffff', '#dc2626', '#ffffff', 4.5],
  ['DARK  .text-destructive #ef4444 on card #1e293b', '#ef4444', '#1e293b', 4.5],
  ['LIGHT .text-destructive #dc2626 on background #f8fafc', '#dc2626', '#f8fafc', 4.5],
  // .text-muted (index.css:324)
  ['LIGHT .text-muted #3d4a5c on card #ffffff', '#3d4a5c', '#ffffff', 4.5],
  ['DARK  .text-muted #9eadc2 on card #1e293b', '#9eadc2', '#1e293b', 4.5],
  ['DARK  .text-muted #9eadc2 on background #0f172a', '#9eadc2', '#0f172a', 4.5],
  // .cart-badge-active (index.css:419-423): background var(--color-background), color on-primary
  ['LIGHT cart-badge-active #f8fafc on background #f8fafc', '#f8fafc', '#f8fafc', 4.5],
  ['DARK  cart-badge-active #ffffff on background #0f172a', '#ffffff', '#0f172a', 4.5],
  // install-banner-button-close (index.css:2970-2974)
  ['LIGHT install-close #1e293b on card #ffffff', '#1e293b', '#ffffff', 4.5],
  ['DARK  install-close #8090a7 on card #1e293b', '#8090a7', '#1e293b', 4.5],
  // toast (index.css:1617-1634): fg on background inverted
  ['LIGHT toast fg #0f172b on bg #f8fafc', '#0f172b', '#f8fafc', 4.5],
  ['DARK  toast fg #f8fafc on bg #0f172a', '#f8fafc', '#0f172a', 4.5],
  // interaction-cancel (index.css:2858-2870)
  ['LIGHT interaction-cancel muted-fg #3d4a5c on card #ffffff', '#3d4a5c', '#ffffff', 4.5],
  ['DARK  interaction-cancel muted-fg #9eadc2 on card #1e293b', '#9eadc2', '#1e293b', 4.5],
  // sales-day--active (index.css:2448-2452)
  ['LIGHT sales-day--active #f8fafc on primary-bg #1e293b', '#f8fafc', '#1e293b', 4.5],
  ['DARK  sales-day--active #ffffff on primary-bg #475569', '#ffffff', '#475569', 4.5],
  // mode-toggle-thumb icon (index.css:3076-3097)
  ['LIGHT mode-toggle-thumb icon primary #1e293b on card #ffffff (UI)', '#1e293b', '#ffffff', 3.0],
  ['DARK  mode-toggle-thumb icon primary #8090a7 on card #1e293b (UI)', '#8090a7', '#1e293b', 3.0],
  ['LIGHT mode-toggle checked icon on-accent #fff on accent #047857 (UI)', '#ffffff', '#047857', 3.0],
];
const fails = rows.filter(r => cr(r[1], r[2]) < r[3]);
console.log('=== FAILURES (' + fails.length + ' of ' + rows.length + ') ===');
for (const f of fails) console.log('  FAIL ' + f[0] + ' = ' + cr(f[1], f[2]) + ':1 (need ' + f[3] + ')');
console.log('');
console.log('=== ALL (for reference) ===');
for (const f of rows) console.log('  ' + (cr(f[1],f[2]) >= f[3] ? 'PASS' : 'FAIL') + ' ' + cr(f[1],f[2]) + ':1  ' + f[0]);
