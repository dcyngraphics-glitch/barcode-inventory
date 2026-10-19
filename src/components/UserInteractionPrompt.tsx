import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import db from '@/db/dexie';
import { formatAlertMessage } from '@/utils/formatAlert';

/**
 * Renders whatever Dexie Cloud is currently asking the user for, in this app's styling.
 *
 * Dexie Cloud drives the login conversation itself and asks for input through
 * db.cloud.userInteraction rather than returning a value: a single call to
 * db.cloud.login() emits an email prompt, then an OTP prompt, and only resolves once
 * the code is verified. The same channel carries the "you have unsynced changes"
 * confirmation when logging out.
 *
 * Mounted once at the app root (see App.tsx) so the observable is ALWAYS listened to —
 * the logout confirmation can fire from any screen, not just the login one.
 */
export function UserInteractionPrompt() {
  const cloud = (db as any).cloud;
  const [interaction, setInteraction] = useState<any>(undefined);
  const [values, setValues] = useState<Record<string, string>>({});
  const cardRef = useRef<HTMLDivElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!cloud?.userInteraction?.subscribe) return;

    const subscription = cloud.userInteraction.subscribe((next: any) => {
      setInteraction(next);
      // Never carry a typed code over into the next prompt.
      setValues({});
      submittedRef.current = false;
    });

    return () => subscription?.unsubscribe?.();
  }, [cloud]);

  // aria-modal="true" promises that focus stays inside the dialog, so move it in when a
  // prompt opens and hand it back to whatever had it when the prompt closes.
  useEffect(() => {
    if (!interaction) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    cardRef.current?.querySelector<HTMLElement>('input, button')?.focus();

    return () => previouslyFocused?.focus?.();
  }, [interaction]);

  if (!interaction) return null;

  const fields: Record<string, any> = interaction.fields ?? {};
  const fieldNames = Object.keys(fields);
  const alerts: any[] = interaction.alerts ?? [];
  const canCancel = interaction.cancelLabel !== null && typeof interaction.onCancel === 'function';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // A double-tap must not answer the same prompt twice: onSubmit also clears the
    // subject, so the second call would land on an interaction that no longer exists.
    if (submittedRef.current) return;
    submittedRef.current = true;
    interaction.onSubmit?.(values);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && canCancel) {
      event.preventDefault();
      interaction.onCancel?.();
      return;
    }

    if (event.key !== 'Tab') return;

    // Keep Tab inside the dialog — there is no native focus trap for a div-based modal.
    const focusable = cardRef.current?.querySelectorAll<HTMLElement>('input, button');
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="interaction-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={interaction.title}
      onKeyDown={handleKeyDown}
    >
      <div className="login-card" ref={cardRef}>
        <div className="login-logo">
          {interaction.type === 'otp' ? <ShieldCheck size={40} /> : <Mail size={40} />}
        </div>

        <h1>{interaction.title}</h1>

        {alerts.map((alert, index) => (
          <div
            key={index}
            role={alert?.type === 'error' ? 'alert' : 'status'}
            className={alert?.type === 'error' ? 'login-error' : 'login-hint'}
          >
            {formatAlertMessage(alert)}
          </div>
        ))}

        <form className="login-form" onSubmit={handleSubmit}>
          {fieldNames.map((name) => {
            const field = fields[name] ?? {};
            const label = field.label || name.charAt(0).toUpperCase() + name.slice(1);
            const id = `interaction-${name}`;

            return (
              <div key={name}>
                <label htmlFor={id}>{label}</label>
                <input
                  id={id}
                  className="login-input"
                  type={name === 'email' ? 'email' : 'text'}
                  // Deliberately NO inputMode. Dexie Cloud's OTP is alphanumeric, and
                  // inputMode="numeric" forced a digits-only keypad on mobile, so the
                  // letters in the code were physically untypeable.
                  autoComplete={name === 'otp' ? 'one-time-code' : undefined}
                  autoCorrect={name === 'otp' ? 'off' : undefined}
                  spellCheck={name === 'otp' ? false : undefined}
                  placeholder={field.placeholder ?? ''}
                  value={values[name] ?? ''}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [name]: event.target.value }))
                  }
                />
              </div>
            );
          })}

          <button type="submit" className="login-submit">
            {interaction.submitLabel || 'Submit'}
          </button>

          {canCancel && (
            <button
              type="button"
              className="interaction-cancel"
              onClick={() => interaction.onCancel?.()}
            >
              {interaction.cancelLabel}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
