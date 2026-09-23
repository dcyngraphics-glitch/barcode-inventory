import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB } from '../db/database';
import {
  getTutorialStatus,
  setTutorialCompleted,
  setTutorialStep,
  markScreenHintSeen,
  resetTutorial,
} from '../services/tutorialService';

describe('tutorialService', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('should return default tutorial status (not completed, step 0)', async () => {
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(false);
    expect(status.tutorialStep).toBe(0);
    expect(status.screenHintsSeen).toEqual([]);
  });

  it('should set tutorial completed', async () => {
    await setTutorialCompleted(true);
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(true);
  });

  it('should set tutorial step', async () => {
    await setTutorialStep(2);
    const status = await getTutorialStatus();
    expect(status.tutorialStep).toBe(2);
  });

  it('should mark screen hints as seen', async () => {
    await markScreenHintSeen('scanner');
    await markScreenHintSeen('inventory');
    const status = await getTutorialStatus();
    expect(status.screenHintsSeen).toContain('scanner');
    expect(status.screenHintsSeen).toContain('inventory');
  });

  it('should not duplicate seen hints', async () => {
    await markScreenHintSeen('scanner');
    await markScreenHintSeen('scanner');
    const status = await getTutorialStatus();
    expect(status.screenHintsSeen.filter(s => s === 'scanner')).toHaveLength(1);
  });

  it('should reset tutorial to defaults', async () => {
    await setTutorialCompleted(true);
    await setTutorialStep(3);
    await markScreenHintSeen('scanner');
    await resetTutorial();
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(false);
    expect(status.tutorialStep).toBe(0);
    expect(status.screenHintsSeen).toEqual([]);
  });
});
