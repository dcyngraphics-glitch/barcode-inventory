import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import db from '@/db/dexie';
import { UserInteractionPrompt } from '@/components/UserInteractionPrompt';

/**
 * The component reads db.cloud.userInteraction (a BehaviorSubject in production). The
 * addon is not registered under Vitest, so the test supplies a minimal subscribable and
 * pushes interactions through it — the same shape the addon emits.
 */
let emit: (interaction: any) => void;

beforeEach(() => {
  const listeners: Array<(interaction: any) => void> = [];
  (db as any).cloud = {
    userInteraction: {
      subscribe: (listener: (interaction: any) => void) => {
        listeners.push(listener);
        return { unsubscribe: () => {} };
      },
    },
  };
  emit = (interaction: any) => {
    act(() => {
      listeners.forEach((listener) => listener(interaction));
    });
  };
});

const base = {
  title: 'Title',
  alerts: [] as any[],
  fields: {} as Record<string, any>,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel' as string | null,
  onSubmit: () => {},
  onCancel: () => {},
};

describe('UserInteractionPrompt', () => {
  it('renders nothing when there is no interaction', () => {
    const { container } = render(<UserInteractionPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an email prompt and submits the typed address', () => {
    const onSubmit = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'email',
      title: 'Enter email address',
      fields: { email: { type: 'text', placeholder: 'you@example.com' } },
      onSubmit,
    });

    expect(screen.getByText('Enter email address')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'me@example.com' });
  });

  it('renders an OTP prompt, shows the "sent to" alert, and submits the code', () => {
    const onSubmit = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'otp',
      title: 'Enter OTP',
      alerts: [
        {
          type: 'info',
          messageCode: 'OTP_SENT',
          message: 'A One-Time password has been sent to {email}',
          messageParams: { email: 'me@example.com' },
        },
      ],
      fields: { otp: { type: 'otp', label: 'OTP', placeholder: 'Paste OTP here' } },
      onSubmit,
    });

    // The {email} token must be substituted, not shown raw.
    expect(screen.getByText('A One-Time password has been sent to me@example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('OTP'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({ otp: '123456' });
  });

  it('surfaces an error alert as a live region', () => {
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'otp',
      title: 'Enter OTP',
      alerts: [{ type: 'error', messageCode: 'INVALID_OTP', message: 'Invalid OTP', messageParams: {} }],
      fields: { otp: { type: 'otp', label: 'OTP' } },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid OTP');
  });

  it('renders a message-alert with no fields and dismisses with OK', () => {
    const onSubmit = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'message-alert',
      title: 'Access Denied',
      alerts: [{ type: 'error', message: 'You are not allowed', messageParams: {} }],
      fields: {},
      submitLabel: 'OK',
      cancelLabel: null,
      onSubmit,
    });

    expect(screen.getByText('You are not allowed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ok/i }));

    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('renders the logout confirmation and can cancel', () => {
    const onCancel = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'logout-confirmation',
      title: 'Unsaved changes',
      fields: {},
      onSubmit: vi.fn(),
      onCancel,
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers no cancel button when cancelLabel is null', () => {
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'message-alert',
      title: 'Notice',
      fields: {},
      submitLabel: 'OK',
      cancelLabel: null,
    });

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('moves focus into the dialog when a prompt opens', () => {
    // aria-modal="true" promises focus lives inside the dialog; leaving it on the page
    // behind makes the prompt unreachable by keyboard.
    render(<UserInteractionPrompt />);

    emit({ ...base, type: 'email', title: 'Enter email address', fields: { email: { type: 'text' } } });

    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
  });

  it('dismisses with Escape when the prompt can be cancelled', () => {
    const onCancel = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'email',
      title: 'Enter email address',
      fields: { email: { type: 'text' } },
      onCancel,
    });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape when the prompt cannot be cancelled', () => {
    const onCancel = vi.fn();
    render(<UserInteractionPrompt />);

    emit({
      ...base,
      type: 'message-alert',
      title: 'Notice',
      fields: {},
      cancelLabel: null,
      onCancel,
    });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not answer the same prompt twice on a double submit', () => {
    // onSubmit also clears the subject, so a second call would land on an interaction
    // that no longer exists.
    const onSubmit = vi.fn();
    render(<UserInteractionPrompt />);

    emit({ ...base, type: 'email', title: 'Enter email address', fields: { email: { type: 'text' } }, onSubmit });

    const submit = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
