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
    expect(screen.getByText(/Scan barcodes with your camera/)).toBeInTheDocument();
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
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // There are two Skip buttons - one in actions, one below
    const skipButtons = screen.getAllByText('Skip');
    expect(skipButtons.length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // Click the Skip button in the tutorial actions area
    const skipButton = screen.getAllByText('Skip')[0];
    await act(async () => {
      skipButton.click();
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
    // Navigate through all steps using their actual CTA labels
    // Step 1: "Try Scanning" → Step 2
    await act(async () => {
      screen.getByText('Try Scanning').click();
    });
    // Wait for the advancing guard to reset (100ms in component)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    await waitFor(() => {
      expect(screen.getByText('Save Product')).toBeInTheDocument();
    });
    // Step 2: "Got It" → Step 3  
    await act(async () => {
      screen.getByText('Got It').click();
    });
    // Wait for the advancing guard to reset
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    await waitFor(() => {
      expect(screen.getByText('Manage Inventory')).toBeInTheDocument();
    }, { timeout: 2000 });
    // Step 3: "View Inventory" → Step 4 (last step)
    await act(async () => {
      screen.getByText('View Inventory').click();
    });
    await waitFor(() => {
      expect(screen.getByText('Set Up Alerts')).toBeInTheDocument();
    });
    // Last step should show "Finish"
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });
});
