"use client";

import { useId, type ReactNode } from "react";

const CONTROL =
  "w-full min-h-11 rounded-xl border bg-ink px-4 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/40";

interface WrapperProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean; className: string }) => ReactNode;
}

function FieldWrapper({ label, hint, error, optional, children }: WrapperProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);
  const className = `${CONTROL} ${invalid ? "border-bad" : "border-line-strong"}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-fg">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children({ id, describedBy, invalid, className })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

type CommonProps = Omit<WrapperProps, "children"> & { name: string };

export function TextField({
  label, hint, error, optional, name, ...rest
}: CommonProps & Omit<React.ComponentProps<"input">, "name" | "id" | "className">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid, className }) => (
        <input id={id} name={name} aria-invalid={invalid} aria-describedby={describedBy} className={className} {...rest} />
      )}
    </FieldWrapper>
  );
}

export function SelectField({
  label, hint, error, optional, name, options, ...rest
}: CommonProps & { options: readonly string[] } & Omit<React.ComponentProps<"select">, "name" | "id" | "className" | "children">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid, className }) => (
        <select id={id} name={name} aria-invalid={invalid} aria-describedby={describedBy} className={className} {...rest}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  );
}

export function TextAreaField({
  label, hint, error, optional, name, ...rest
}: CommonProps & Omit<React.ComponentProps<"textarea">, "name" | "id" | "className">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid, className }) => (
        <textarea id={id} name={name} aria-invalid={invalid} aria-describedby={describedBy} className={`${className} resize-y`} {...rest} />
      )}
    </FieldWrapper>
  );
}
