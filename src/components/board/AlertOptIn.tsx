"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { validEmail } from "@/lib/validate";

export interface AlertOptInProps {
  /** What the alert is for, e.g. "when someone outbids you". */
  reason: string;
  /** Called with a validated email. Resolve ok to show confirmation, or return an error message. */
  onSubmit: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Optional heading override. */
  heading?: string;
  /** Optional button label override. */
  buttonLabel?: string;
}

type Phase = "idle" | "pending" | "success" | "error";

export const CONSENT_TEXT = "We will email you only about this. Unsubscribe any time.";
const GENERIC_ERROR = "We could not save your alert. Please try again.";

export default function AlertOptIn({ reason, onSubmit, heading, buttonLabel = "Alert me" }: AlertOptInProps) {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [serverError, setServerError] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === "pending") return;

    // Honeypot: real people never see this field. Pretend it worked, send nothing.
    if (trap.trim()) {
      setSavedEmail(email.trim());
      setPhase("success");
      return;
    }

    const err = validEmail(email);
    setFieldError(err);
    if (err) return;

    const clean = email.trim();
    setPhase("pending");
    setServerError("");
    try {
      const result = await onSubmit(clean);
      if (result.ok) {
        setSavedEmail(clean);
        setPhase("success");
      } else {
        setServerError(result.error || GENERIC_ERROR);
        setPhase("error");
      }
    } catch {
      setServerError(GENERIC_ERROR);
      setPhase("error");
    }
  };

  const title = heading ?? `Get an alert ${reason}`;

  if (phase === "success") {
    return (
      <section aria-label="Email alert" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div role="status" aria-live="polite">
          <p className="text-sm font-bold text-ok">Done: alert saved.</p>
          <p className="mt-1 text-sm text-fg">
            We will email {savedEmail} {reason}.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setPhase("idle");
            setEmail("");
            setTrap("");
          }}
        >
          Use a different email
        </Button>
      </section>
    );
  }

  const pending = phase === "pending";

  return (
    <section aria-label="Email alert" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="text-base font-bold text-fg">{title}</h3>
      <form onSubmit={submit} noValidate className="mt-3 space-y-3">
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(undefined);
          }}
          error={fieldError}
          disabled={pending}
        />

        {/* Honeypot. Hidden from sight and from assistive tech; bots tend to fill it. */}
        <div aria-hidden="true" className="absolute -left-[10000px] h-0 w-0 overflow-hidden">
          <label>
            Leave this field empty
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving..." : buttonLabel}
        </Button>

        <p className="text-xs text-muted">
          {CONSENT_TEXT}
        </p>

        <div role="status" aria-live="polite">
          {phase === "pending" && <p className="text-sm text-fg">Saving your alert...</p>}
          {phase === "error" && (
            <p className="text-sm font-medium text-bad">
              Problem: {serverError} Your email is still filled in, so you can try again.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
