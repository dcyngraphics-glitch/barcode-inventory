import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react';
import { Toast, useToast, type ToastMessage } from '../components/Toast';

describe('Toast multiple messages', () => {
  it('should render multiple toasts', () => {
    const toasts: ToastMessage[] = [
      { id: '1', type: 'success', text: 'First toast' },
      { id: '2', type: 'error', text: 'Second toast' },
      { id: '3', type: 'info', text: 'Third toast' },
    ];
    const { container } = render(<Toast toasts={toasts} onDismiss={() => {}} />);
    const toastElements = container.querySelectorAll('.toast');
    expect(toastElements.length).toBe(3);
  });

  it('should render all toast texts', () => {
    const toasts: ToastMessage[] = [
      { id: '1', type: 'success', text: 'First toast' },
      { id: '2', type: 'error', text: 'Second toast' },
    ];
    render(<Toast toasts={toasts} onDismiss={() => {}} />);
    expect(screen.getByText('First toast')).toBeTruthy();
    expect(screen.getByText('Second toast')).toBeTruthy();
  });

  it('should dismiss an individual toast without removing the others', async () => {
    const onDismiss = vi.fn();
    const toasts: ToastMessage[] = [
      { id: '1', type: 'success', text: 'First toast' },
      { id: '2', type: 'error', text: 'Second toast' },
    ];
    const { container } = render(<Toast toasts={toasts} onDismiss={onDismiss} />);
    const dismissButtons = container.querySelectorAll('button[aria-label="Dismiss"]');
    expect(dismissButtons.length).toBe(2);

    fireEvent.click(dismissButtons[1]);
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('2'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('useToast queue', () => {
  it('should accumulate multiple toasts and dismiss them individually', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('success', 'First');
    });
    act(() => {
      result.current.showToast('error', 'Second');
    });

    expect(result.current.toasts.length).toBe(2);
    expect(result.current.toasts[0].text).toBe('First');
    expect(result.current.toasts[1].text).toBe('Second');
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);

    act(() => {
      result.current.dismissToast(result.current.toasts[0].id);
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].text).toBe('Second');
  });
});
