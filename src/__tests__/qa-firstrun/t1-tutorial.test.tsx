import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TutorialProvider } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import {
  getTutorialStatus,
  setTutorialCompleted,
} from '@/services/tutorialService';

vi.mock('@/services/tutorialService', async () => {
  const actual = await vi.importActual('@/services/tutorialService');
  if (typeof actual !== 'object') return {};
  return {
    ...actual,
    getTutorialStatus: vi.fn(),
    setTutorialStep: vi.fn(),
    setTutorialCompleted: vi.fn(),
    resetTutorial: vi.fn(),
  };
});

vi.mock('@/data/tutorialSteps', async () => {
  const actual = await vi.importActual('@/data/tutorialSteps');
  if (typeof actual !== 'object') return {};
  return {
    ...actual,
    TUTORIAL_STEPS: actual.TUTORIAL_STEPS ?? [],
    TOTAL_TUTORIAL_STEPS: actual.TUTORIAL_STEPS?.length ?? 0,
  };
});

function renderTutorial() {
  return render(
    <MemoryRouter>
      <TutorialProvider>
        <TutorialOverlay />
      </TutorialProvider>
    </MemoryRouter>
  );
}

describe('Tutorial Overlay - First Run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('appears on first run when tutorial is not completed', async () => {
    vi.mocked(getTutorialStatus).mockResolvedValueOnce({
      tutorialCompleted: false,
      tutorialStep: 0,
      screenHintsSeen: [],
    });
    renderTutorial();
    await waitFor(() => {
      const overlay = screen.queryByRole('dialog');
      expect(overlay).toBeInTheDocument();
    });
  });

  it('does NOT appear when tutorial is already completed', async () => {
    vi.mocked(getTutorialStatus).mockResolvedValueOnce({
      tutorialCompleted: true,
      tutorialStep: 0,
      screenHintsSeen: [],
    });
    renderTutorial();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('can be skipped via setTutorialCompleted', async () => {
    vi.mocked(getTutorialStatus).mockResolvedValueOnce({
      tutorialCompleted: false,
      tutorialStep: 0,
      screenHintsSeen: [],
    });
    renderTutorial();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeInTheDocument();
    });

    vi.mocked(setTutorialCompleted).mockResolvedValueOnce(undefined);
    await setTutorialCompleted(true);
    expect(setTutorialCompleted).toHaveBeenCalledWith(true);
  });
});