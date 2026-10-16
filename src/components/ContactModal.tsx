"use client";

import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Done, FormError, Honeypot, PrivacyNote, SubmitButton } from "@/components/FormParts";
import { submitLead, type LeadResult } from "@/lib/lead";
import { hasErrors, normalizeWebsite, required, validEmail, validWebsite, type Errors } from "@/lib/validate";

export interface ContactPrefill {
  topic?: string;
  message?: string;
  website?: string;
}

const BUDGETS = [
  "Not sure yet",
  "Under $5,000 / month",
  "$5,000 to $10,000 / month",
  "$10,000 to $25,000 / month",
  "$25,000 to $50,000 / month",
  "$50,000+ / month",
] as const;

export const TOPICS = [
  "Creative production (UGC, video, 3D)",
  "Review of my ads or creative strategy",
  "Help shortlisting agencies",
  "Something else",
] as const;

type Field = "name" | "email" | "website";

interface Props {
  open: boolean;
  onClose: () => void;
  prefill: ContactPrefill;
}

export default function ContactModal({ open, onClose, prefill }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tell us what you are working on"
      description="Share a few details and we will reply by email. No call is required."
    >
      <ContactForm prefill={prefill} onClose={onClose} />
    </Modal>
  );
}

export function ContactForm({ prefill, onClose }: { prefill: ContactPrefill; onClose?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors<Field>>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);

  const topicDefault = (TOPICS as readonly string[]).includes(prefill.topic ?? "") ? prefill.topic! : TOPICS[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "");

    // Honeypot filled in: pretend success, send nothing.
    if (get("company_url")) {
      setResult({ ok: true, mode: "sent" });
      return;
    }

    const next: Errors<Field> = {
      name: required(get("name"), "Name"),
      email: validEmail(get("email")),
      website: validWebsite(get("website"), { optional: true }),
    };
    setErrors(next);
    if (hasErrors(next)) {
      const first = (["name", "email", "website"] as Field[]).find((k) => next[k]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setPending(true);
    const res = await submitLead("contact", {
      name: get("name").trim(),
      email: get("email").trim(),
      website: get("website").trim() ? normalizeWebsite(get("website")) : "",
      budget: get("budget"),
      topic: get("topic"),
      message: get("message").trim(),
    });
    setPending(false);
    setResult(res);
  }

  if (result?.ok) {
    return <Done mode={result.mode} title="Thanks, we have your details" onClose={onClose ?? (() => setResult(null))} />;
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-4">
      <Honeypot name="company_url" />
      <TextField label="Your name" name="name" autoComplete="name" required error={errors.name} placeholder="Alex Mercer" />
      <TextField label="Work email" name="email" type="email" autoComplete="email" required error={errors.email} placeholder="alex@yourbrand.com" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Brand website" name="website" optional autoComplete="url" defaultValue={prefill.website} error={errors.website} placeholder="yourbrand.com" />
        <SelectField label="Monthly ad budget" name="budget" options={BUDGETS} defaultValue={BUDGETS[0]} />
      </div>
      <SelectField label="What do you need?" name="topic" options={TOPICS} defaultValue={topicDefault} />
      <TextAreaField
        label="Anything we should know"
        name="message"
        optional
        rows={3}
        defaultValue={prefill.message}
        placeholder="Your product, your audience, what is not working today."
      />
      {result && !result.ok && <FormError message={result.error} />}
      <SubmitButton pending={pending}>Send message</SubmitButton>
      <PrivacyNote />
    </form>
  );
}
