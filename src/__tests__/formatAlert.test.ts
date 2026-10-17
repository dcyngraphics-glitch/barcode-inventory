import { describe, it, expect } from 'vitest';
import { formatAlertMessage } from '@/utils/formatAlert';

/**
 * Dexie Cloud sends alerts with {placeholder} tokens and a separate messageParams map
 * (e.g. "A One-Time password has been sent to {email}"). Rendering the raw template
 * would show the user "{email}", so the tokens have to be substituted.
 */
describe('formatAlertMessage', () => {
  it('substitutes messageParams into the message', () => {
    expect(
      formatAlertMessage({
        message: 'A One-Time password has been sent to {email}',
        messageParams: { email: 'me@example.com' },
      }),
    ).toBe('A One-Time password has been sent to me@example.com');
  });

  it('leaves an unknown placeholder visible rather than printing undefined', () => {
    expect(formatAlertMessage({ message: 'Sent to {email}', messageParams: {} })).toBe('Sent to {email}');
  });

  it('substitutes several placeholders in one message', () => {
    expect(
      formatAlertMessage({ message: '{a} and {b}', messageParams: { a: 'one', b: 'two' } }),
    ).toBe('one and two');
  });

  it('tolerates a missing message', () => {
    expect(formatAlertMessage({})).toBe('');
  });

  it('tolerates a missing alert entirely', () => {
    expect(formatAlertMessage(undefined)).toBe('');
  });
});
