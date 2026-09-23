import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TutorialProvider, useTutorial } from '../context/TutorialContext';
import { getDB } from '../db/database';

function TestConsumer() {
  const { isVisible, currentStep, totalSteps, currentStepData, next, prev, skip, finish } = useTutorial();
  return (
    <div>
      <div data-testid="visible">{String(isVisible)}</div>
      <div data-testid="step">{currentStep}</div>
      <div data-testid="total">{totalSteps}</div>
      <div data-testid="title">{currentStepData?.title}</div>
      <button onClick={next}>Next</button>
      <button onClick={prev}>Prev</button>
      <button onClick={skip}>Skip</button>
      <button onClick={finish}>Finish</button>
    </div>
  );
}

describe('TutorialContext', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  afterEach(() => {
    // Cleanup timers
    vi.useRealTimers();
  });

  it('should show tutorial on first visit (not completed)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    expect(screen.getByTestId('step').textContent).toBe('0');
    expect(screen.getByTestId('title').textContent).toBe('Scan');
  });

  it('should hide tutorial if already completed', async () => {
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

    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });

  it('should advance to next step', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Next').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('1');
    });
    expect(screen.getByTestId('title').textContent).toBe('Save Product');
  });

  it('should not go past last step', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    // Click next 4 times (max step is 3)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        screen.getByText('Next').click();
      });
    }
    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('3');
    });
  });

  it('should skip tutorial (mark completed, hide)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Skip').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });

  it('should finish tutorial (mark completed, hide)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Finish').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });
});
