import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from './settingsService';

export interface TutorialStatus {
  tutorialCompleted: boolean;
  tutorialStep: number;
  screenHintsSeen: string[];
}

export async function getTutorialStatus(): Promise<TutorialStatus> {
  const settings = await loadSettings();
  return {
    tutorialCompleted: settings.tutorialCompleted ?? DEFAULT_SETTINGS.tutorialCompleted,
    tutorialStep: settings.tutorialStep ?? DEFAULT_SETTINGS.tutorialStep,
    screenHintsSeen: settings.screenHintsSeen ?? DEFAULT_SETTINGS.screenHintsSeen,
  };
}

export async function setTutorialCompleted(completed: boolean): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, tutorialCompleted: completed });
}

export async function setTutorialStep(step: number): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, tutorialStep: step });
}

export async function markScreenHintSeen(screenId: string): Promise<void> {
  const settings = await loadSettings();
  const seen = settings.screenHintsSeen ?? [];
  if (seen.includes(screenId)) return;
  await saveSettings({ ...settings, screenHintsSeen: [...seen, screenId] });
}

export async function resetTutorial(): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({
    ...settings,
    tutorialCompleted: DEFAULT_SETTINGS.tutorialCompleted,
    tutorialStep: DEFAULT_SETTINGS.tutorialStep,
    screenHintsSeen: DEFAULT_SETTINGS.screenHintsSeen,
  });
}
