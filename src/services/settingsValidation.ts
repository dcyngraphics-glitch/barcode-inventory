import type { Settings } from '@/types';

const VALID_THEMES = ['auto', 'light', 'dark'] as const;

export function validateSettings(settings: Settings): void {
  if (!VALID_THEMES.includes(settings.theme)) {
    throw new Error(`Invalid theme: ${settings.theme}. Must be one of: ${VALID_THEMES.join(', ')}`);
  }
  if (
    typeof settings.alertWindowDays !== 'number' ||
    settings.alertWindowDays < 1 ||
    settings.alertWindowDays > 30
  ) {
    throw new Error(
      `alertWindowDays must be between 1 and 30, got: ${settings.alertWindowDays}`,
    );
  }
}
