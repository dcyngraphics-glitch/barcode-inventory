import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TutorialProvider } from '../context/TutorialContext';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { getDB } from '../db/database';

async function setupCompleted() {
  const db = await getDB();
  await db.put('settings', {
    id: 'settings',
    alertWindowDays: 3,
    notificationsEnabled: false,
    theme: 'auto',
    cashierMode: false,
    sellerMode: false,
    tutorialCompleted: true,
    tutorialStep: 0,
    screenHintsSeen: [],
  });
}

describe('TutorialOverlay', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('should render first step when not completed', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    expect(screen.getByText(/Point your camera/)).toBeInTheDocument();
  });

  it('should not render when already completed', async () => {
    await setupCompleted();
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    });
  });

  it('should show progress dots', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // 4 steps = 4 dots
    const dots = document.querySelectorAll('.tutorial-progress-dot');
    expect(dots).toHaveLength(4);
  });

  it('should show step counter text', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });
  });

  it('should navigate to next step on CTA click', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Try Scanning').click();
    });
    await waitFor(() => {
      expect(screen.getByText('Save Product')).toBeInTheDocument();
    });
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('should show Skip button', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
  });

  it('should hide on Skip click', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Skip').click();
    });
    await waitFor(() => {
      expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    });
  });

  it('should show Finish on last step', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // Navigate to last step (4th)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        screen.getByText('Next').click();
      });
    }
    await waitFor(() => {
      expect(screen.getByText('Set Up Alerts')).toBeInTheDocument();
    });
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });
});
