import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { TUTORIAL_STEPS, TOTAL_TUTORIAL_STEPS, TutorialStep } from '@/data/tutorialSteps';
import {
  getTutorialStatus,
  setTutorialCompleted,
  setTutorialStep,
} from '@/services/tutorialService';

interface TutorialContextValue {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  reopen: () => void;
}

const defaultValue: TutorialContextValue = {
  isVisible: false,
  currentStep: 0,
  totalSteps: TOTAL_TUTORIAL_STEPS,
  currentStepData: TUTORIAL_STEPS[0] ?? null,
  next: () => {},
  prev: () => {},
  skip: () => {},
  finish: () => {},
  reopen: () => {},
};

const TutorialContext = createContext<TutorialContextValue>(defaultValue);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTutorialStatus()
      .then((status) => {
        if (!status.tutorialCompleted) {
          setCurrentStep(status.tutorialStep);
          setIsVisible(true);
        }
      })
      .catch(() => {
        // If loading fails, don't show the tutorial
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const persistStep = useCallback((step: number) => {
    setTutorialStep(step).catch(() => {
      // Best-effort persistence; ignore failures
    });
  }, []);

  const next = useCallback(() => {
    setCurrentStep(prev => {
      const nextStep = Math.min(prev + 1, TOTAL_TUTORIAL_STEPS - 1);
      persistStep(nextStep);
      return nextStep;
    });
  }, [persistStep]);

  const prev = useCallback(() => {
    setCurrentStep(prev => {
      const prevStep = Math.max(prev - 1, 0);
      persistStep(prevStep);
      return prevStep;
    });
  }, [persistStep]);

  const skip = useCallback(() => {
    setTutorialCompleted(true).catch(() => {
      // Best-effort persistence; ignore failures
    });
    setIsVisible(false);
  }, []);

  const finish = useCallback(() => {
    setTutorialCompleted(true).catch(() => {
      // Best-effort persistence; ignore failures
    });
    setCurrentStep(0);
    setIsVisible(false);
  }, []);

  const reopen = useCallback(() => {
    setCurrentStep(0);
    setTutorialStep(0).catch(() => {
      // Best-effort persistence; ignore failures
    });
    setTutorialCompleted(false).catch(() => {
      // Best-effort persistence; ignore failures
    });
    setIsVisible(true);
  }, []);

  const currentStepData = useMemo(
    () => TUTORIAL_STEPS[currentStep] ?? null,
    [currentStep]
  );

  const value = useMemo<TutorialContextValue>(() => ({
    isVisible,
    currentStep,
    totalSteps: TOTAL_TUTORIAL_STEPS,
    currentStepData,
    next,
    prev,
    skip,
    finish,
    reopen,
  }), [isVisible, currentStep, currentStepData, next, prev, skip, finish, reopen]);

  // Don't render anything until loaded to prevent flash
  if (!loaded) return <>{children}</>;

  return (
    <TutorialContext.Provider
      value={value}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
