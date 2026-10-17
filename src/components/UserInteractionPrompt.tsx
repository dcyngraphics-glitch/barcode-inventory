import { useEffect, useState, type FormEvent } from 'react';
import { Mail, ShieldCheck, ShieldAlert } from 'lucide-react';
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

  useEffect(() => {
    if (!cloud?.userInteraction?.subscribe) return;

    const subscription = cloud.userInteraction.subscribe((next: any) => {
      setInteraction(next);
      // Never carry a typed code over into the next prompt.
      setValues({});
    });

    return () => subscription?.unsubscribe?.();
  }, [cloud]);

  if (!interaction) return null;

  const fields: Record<string, any> = interaction.fields ?? {};
  const fieldNames = Object.keys(fields);
  const alerts: any[] = interaction.alerts ?? [];
  const canCancel = interaction.cancelLabel !== null && typeof interaction.onCancel === 'function';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // onSubmit also clears the subject, which unmounts this prompt.
    interaction.onSubmit?.(values);
  };

  return (
    <div className="interaction-overlay" role="dialog" aria-modal="true" aria-label={interaction.title}>
      <div className="login-card">
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
                  type={name === 'email' ? 'email' : 'text'}
                  inputMode={name === 'otp' ? 'numeric' : undefined}
                  autoComplete={name === 'otp' ? 'one-time-code' : undefined}
                  placeholder={field.placeholder ?? ''}
                  value={values[name] ?? ''}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [name]: event.target.value }))
                  }
                  autoFocus={fieldNames.length === 1}
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
