import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TutorialProvider } from '@/context/TutorialContext';
import { ScreenTooltip } from '@/components/ScreenTooltip';
import { db } from '@/db/database';

async function setupTutorialCompleted() {
  await db.table('settings').put({
    id: 'settings',
    alertWindowDays: 3,
    notificationsEnabled: false,
    theme: 'auto',
    cashierMode: false,
    tutorialCompleted: true,
    tutorialStep: 0,
    screenHintsSeen: [],
  });
}

describe('ScreenTooltip', () => {
  beforeEach(async () => {
    await db.table('settings').clear();
  });

  it('should render tooltip on first visit to screen', async () => {
    await setupTutorialCompleted();
    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Tap the barcode to scan')).toBeInTheDocument();
    });
  });

  it('should hide tooltip after dismiss', async () => {
    await setupTutorialCompleted();
    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Tap the barcode to scan')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Got it').click();
    });
    await waitFor(() => {
      expect(screen.queryByText('Tap the barcode to scan')).not.toBeInTheDocument();
    });
  });

  it('should not show tooltip if already seen', async () => {
    // Mark scanner hint as seen
    await db.table('settings').put({
      id: 'settings',
      alertWindowDays: 3,
      notificationsEnabled: false,
      theme: 'auto',
      cashierMode: false,
      tutorialCompleted: false,
      tutorialStep: 0,
      screenHintsSeen: ['scanner'],
    });

    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    // Wait for context to load
    await waitFor(() => {
      expect(screen.queryByText('Tap the barcode to scan')).not.toBeInTheDocument();
    });
  });
});
