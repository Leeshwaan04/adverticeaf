"use client";

import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Done, FormError, Honeypot, PrivacyNote, SubmitButton } from "@/components/FormParts";
import { submitLead, type LeadResult } from "@/lib/lead";
import { CATEGORIES } from "@/data/agencies";
import { hasErrors, normalizeWebsite, required, validEmail, validWebsite, type Errors } from "@/lib/validate";

type Field = "agency" | "website" | "email" | "sources";

export default function ListingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-xl"
      title="Suggest or correct a listing"
      description="Listings are reviewed against public sources before they appear. Submitting does not guarantee inclusion."
    >
      <ListingForm onClose={onClose} />
    </Modal>
  );
}

function ListingForm({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors<Field>>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "");

    if (get("company_url")) {
      setResult({ ok: true, mode: "sent" });
      return;
    }

    const next: Errors<Field> = {
      agency: required(get("agency"), "Agency name"),
      website: validWebsite(get("website")),
      email: validEmail(get("email")),
      sources: required(get("sources"), "At least one public source link"),
    };
    setErrors(next);
    if (hasErrors(next)) {
      const first = (["agency", "website", "email", "sources"] as Field[]).find((k) => next[k]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setPending(true);
    const res = await submitLead("agency-listing", {
      agency: get("agency").trim(),
      website: normalizeWebsite(get("website")),
      email: get("email").trim(),
      category: get("category"),
      location: get("location").trim(),
      sources: get("sources").trim(),
      details: get("details").trim(),
    });
    setPending(false);
    setResult(res);
  }

  if (result?.ok) {
    return <Done mode={result.mode} title="Thanks, we will review it" onClose={onClose} />;
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-4">
      <Honeypot name="company_url" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Agency name" name="agency" required error={errors.agency} placeholder="Your agency" />
        <TextField label="Website" name="website" required autoComplete="url" error={errors.website} placeholder="youragency.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Your work email" name="email" type="email" autoComplete="email" required error={errors.email} hint="We may email you to confirm you represent the agency." placeholder="you@youragency.com" />
        <TextField label="City and country" name="location" optional placeholder="Mumbai, India" />
      </div>
      <SelectField label="Closest category" name="category" options={CATEGORIES} defaultValue={CATEGORIES[0]} />
      <TextAreaField
        label="Public source links"
        name="sources"
        required
        rows={3}
        error={errors.sources}
        hint="Links to press, awards or case studies that support your listing, one per line."
        placeholder="https://..."
      />
      <TextAreaField label="Corrections or extra details" name="details" optional rows={2} />
      {result && !result.ok && <FormError message={result.error} />}
      <SubmitButton pending={pending}>Submit for review</SubmitButton>
      <PrivacyNote />
    </form>
  );
}
