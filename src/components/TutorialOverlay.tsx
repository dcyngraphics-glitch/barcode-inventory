import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTutorial } from '@/context/TutorialContext';
import { TUTORIAL_STEPS } from '@/data/tutorialSteps';
import './TutorialOverlay.css';

export function TutorialOverlay() {
  const navigate = useNavigate();
  const { isVisible, currentStep, totalSteps, next, prev, skip, finish } = useTutorial();

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  if (!step) return null;

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleCta = () => {
    if (step.screenPath) {
      navigate(step.screenPath);
    }
    if (isLastStep) {
      finish();
    } else {
      next();
    }
  };

  const handleSkip = () => {
    skip();
  };

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        {/* Close (X) for skip */}
        <button
          onClick={handleSkip}
          aria-label="Skip tutorial"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-muted-foreground)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="tutorial-icon-wrap">
          <step.icon size={32} />
        </div>

        {/* Title */}
        <h2 id="tutorial-title" className="tutorial-step-title">
          {step.title}
        </h2>

        {/* Description */}
        <p className="tutorial-step-description">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="tutorial-progress" aria-hidden="true">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`tutorial-progress-dot${
                idx === currentStep ? ' active' : idx < currentStep ? ' completed' : ''
              }`}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="tutorial-counter" aria-live="polite">
          Step {currentStep + 1} of {totalSteps}
        </div>

        {/* Navigation arrows */}
        <div className="tutorial-nav">
          <button
            className="tutorial-nav-btn"
            onClick={prev}
            disabled={isFirstStep}
            aria-label="Previous step"
          >
            <ChevronLeft size={20} />
            <span>Prev</span>
          </button>

          {/* Primary CTA */}
          <button
            className="tutorial-btn tutorial-btn-primary"
            onClick={handleCta}
          >
            {isLastStep ? 'Finish' : step.ctaLabel}
            {!isLastStep && <ChevronRight size={16} />}
          </button>

          <button
            className="tutorial-nav-btn"
            onClick={next}
            disabled={isLastStep}
            aria-label="Next step"
          >
            <span>Next</span>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            className="tutorial-btn tutorial-btn-secondary"
            onClick={handleSkip}
            style={{ marginTop: 'var(--space-sm)' }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
