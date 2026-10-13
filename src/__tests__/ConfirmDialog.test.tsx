import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Toast, type ToastMessage } from '../components/Toast';
import { contrastRatio, resolveThemeTokens, resolveVarValue } from './wcagContrast';

/**
 * These tests read the inline styles the components actually emit and compute
 * real WCAG 2.x contrast ratios against the design tokens in src/index.css,
 * for both the light and dark themes. They fail if a token change or an
 * inline-style change drops any of these below the AA minimum.
 */

/** AA minimum for normal-size text. */
const AA_TEXT = 4.5;
/** AA minimum for large text and non-text/UI components. */
const AA_NON_TEXT = 3;

/** The default card surface, used when an element's background is transparent. */
const SURFACE = 'var(--color-card)';

interface ColorPair {
  color: string;
  background: string;
}

/** Pull `color` / `background` out of an element's inline style attribute. */
function inlineColors(el: Element): { color?: string; background?: string } {
  const attr = el.getAttribute('style') ?? '';
  const out: { color?: string; background?: string } = {};
  for (const decl of attr.split(';')) {
    const i = decl.indexOf(':');
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim();
    if (prop === 'color' && out.color === undefined) out.color = value;
    if (prop === 'background' && out.background === undefined) out.background = value;
  }
  return out;
}

/** Read an element's color/background, substituting `surface` for transparency. */
function colorsOn(el: Element, surface: string): ColorPair {
  const raw = inlineColors(el);
  const bg = raw.background;
  return {
    color: raw.color ?? 'var(--color-foreground)',
    background:
      bg === undefined || bg === 'transparent' || bg === 'none' ? surface : bg,
  };
}

function assertAA(label: string, pair: ColorPair, minimum = AA_TEXT): void {
  for (const theme of ['light', 'dark'] as const) {
    const tokens = resolveThemeTokens(theme);
    const fg = resolveVarValue(pair.color, tokens);
    const bg = resolveVarValue(pair.background, tokens);
    const ratio = contrastRatio(fg, bg);
    expect(
      ratio,
      `${theme}: ${label} — ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (need ${minimum}:1)`
    ).toBeGreaterThanOrEqual(minimum);
  }
}

function buttonsOf(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

describe('ConfirmDialog color contrast', () => {
  const baseProps = {
    open: true,
    title: 'Delete item?',
    body: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
  };

  it('cancel button text meets AA in light and dark themes', () => {
    const { container } = render(<ConfirmDialog {...baseProps} />);
    const cancel = buttonsOf(container).find((b) => b.textContent === 'Cancel');
    expect(cancel).toBeTruthy();
    assertAA('ConfirmDialog cancel button', colorsOn(cancel!, SURFACE));
  });

  it('confirm button (default variant) text meets AA in light and dark themes', () => {
    const { container } = render(<ConfirmDialog {...baseProps} />);
    const confirm = buttonsOf(container).find((b) => b.textContent === 'Delete');
    expect(confirm).toBeTruthy();
    assertAA('ConfirmDialog confirm button (default)', colorsOn(confirm!, SURFACE));
  });

  it('confirm button (destructive variant) text meets AA in light and dark themes', () => {
    const { container } = render(
      <ConfirmDialog {...baseProps} variant="destructive" />
    );
    const confirm = buttonsOf(container).find((b) => b.textContent === 'Delete');
    expect(confirm).toBeTruthy();
    assertAA('ConfirmDialog confirm button (destructive)', colorsOn(confirm!, SURFACE));
  });

  it('dialog body text meets AA against the card surface in both themes', () => {
    const { container } = render(<ConfirmDialog {...baseProps} />);
    const body = container.querySelector('#confirm-body');
    expect(body).toBeTruthy();
    const dialog = container.querySelector('[role="alertdialog"]')!;
    assertAA(
      'ConfirmDialog body text',
      colorsOn(body!, inlineColors(dialog).background ?? SURFACE)
    );
  });

  it('dialog title text meets AA against the card surface in both themes', () => {
    const { container } = render(<ConfirmDialog {...baseProps} />);
    const title = container.querySelector('#confirm-title');
    expect(title).toBeTruthy();
    const dialog = container.querySelector('[role="alertdialog"]')!;
    assertAA(
      'ConfirmDialog title text',
      colorsOn(title!, inlineColors(dialog).background ?? SURFACE)
    );
  });

  it('every rendered button declares an explicit color', () => {
    const { container } = render(
      <ConfirmDialog {...baseProps} variant="destructive" />
    );
    for (const btn of buttonsOf(container)) {
      expect(inlineColors(btn).color, `button "${btn.textContent}"`).toBeTruthy();
    }
  });
});

describe('Toast color contrast', () => {
  const toasts: ToastMessage[] = [{ id: 't1', type: 'success', text: 'Saved' }];

  it('dismiss button icon meets AA against the toast surface in both themes', () => {
    const { container } = render(<Toast toasts={toasts} onDismiss={() => {}} />);
    const surfaceEl = container.querySelector('[role="status"]')!;
    const surface = inlineColors(surfaceEl).background ?? 'var(--color-background)';
    const dismiss = container.querySelector('button[aria-label="Dismiss"]');
    expect(dismiss).toBeTruthy();
    assertAA('Toast dismiss button', colorsOn(dismiss!, surface));
  });

  it('toast text meets AA against the toast surface in both themes', () => {
    const { container } = render(<Toast toasts={toasts} onDismiss={() => {}} />);
    const surfaceEl = container.querySelector('[role="status"]')!;
    const surface = inlineColors(surfaceEl).background;
    expect(surface).toBeTruthy();
    assertAA('Toast text', colorsOn(surfaceEl, surface!));
  });

  it('status icon meets the 3:1 non-text minimum in both themes', () => {
    const { container } = render(<Toast toasts={toasts} onDismiss={() => {}} />);
    const surfaceEl = container.querySelector('[role="status"]')!;
    const surface = inlineColors(surfaceEl).background!;
    const icon = surfaceEl.querySelector('svg')!;
    const stroke = icon.getAttribute('stroke');
    expect(stroke, 'icon should declare a stroke color').toBeTruthy();
    for (const theme of ['light', 'dark'] as const) {
      const tokens = resolveThemeTokens(theme);
      const iconHex = resolveVarValue(stroke!, tokens);
      const surfaceHex = resolveVarValue(surface, tokens);
      const ratio = contrastRatio(iconHex, surfaceHex);
      expect(
        ratio,
        `${theme}: Toast icon — ${iconHex} on ${surfaceHex} = ${ratio.toFixed(2)}:1 (need ${AA_NON_TEXT}:1)`
      ).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it('error and info toast variants also render with a declared surface color', () => {
    for (const type of ['error', 'info'] as const) {
      const { container, unmount } = render(
        <Toast toasts={[{ id: type, type, text: type }]} onDismiss={() => {}} />
      );
      const surfaceEl = container.querySelector('[role="status"]')!;
      expect(inlineColors(surfaceEl).color, `${type} toast text color`).toBeTruthy();
      expect(inlineColors(surfaceEl).background, `${type} toast surface`).toBeTruthy();
      const icon = surfaceEl.querySelector('svg')!;
      expect(icon.getAttribute('stroke'), `${type} toast icon stroke`).toBeTruthy();
      unmount();
    }
  });
});
