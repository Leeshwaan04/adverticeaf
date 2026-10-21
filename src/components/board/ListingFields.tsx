"use client";

import { SelectField, TextField } from "@/components/ui/Field";
import { BOARD_CATEGORIES, RULES } from "@/lib/board/config";
import { checkListingUrl, type ListingErrors, type ListingFields as Fields } from "@/lib/board/listing";

interface Props {
  values: Fields;
  errors: ListingErrors;
  onChange: (field: keyof Fields, value: string) => void;
  /** Hide the link field when the listing already exists. */
  lockUrl?: boolean;
  /** Override the tagline label, e.g. "Message" for a sponsor slot. */
  taglineLabel?: string;
  taglineMax?: number;
}

/** Shared listing form: link, name, tagline, category. Shows exactly what link will be used. */
export default function ListingFields({ values, errors, onChange, lockUrl, taglineLabel = "Tagline", taglineMax = RULES.taglineMax }: Props) {
  const check = values.url.trim() ? checkListingUrl(values.url) : null;
  return (
    <div className="space-y-4">
      {!lockUrl && (
        <TextField
          label="Link people will visit"
          name="url"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbrand.com"
          value={values.url}
          error={errors.url}
          hint={check && check.ok ? `We will link to ${check.url}. Tracking parameters are removed.` : "Your own website, app page or profile. No shorteners or invite links."}
          onChange={(e) => onChange("url", e.target.value)}
        />
      )}
      <TextField
        label="Name"
        name="name"
        maxLength={RULES.nameMax + 10}
        placeholder="Your brand"
        value={values.name}
        error={errors.name}
        hint={`${values.name.trim().length}/${RULES.nameMax}`}
        onChange={(e) => onChange("name", e.target.value)}
      />
      <TextField
        label={taglineLabel}
        name="tagline"
        maxLength={taglineMax + 10}
        placeholder="What you do, in a few words"
        value={values.tagline}
        error={errors.tagline}
        hint={`${values.tagline.trim().length}/${taglineMax}`}
        onChange={(e) => onChange("tagline", e.target.value)}
      />
      <SelectField
        label="Category"
        name="category"
        options={["", ...BOARD_CATEGORIES]}
        value={values.category}
        error={errors.category}
        onChange={(e) => onChange("category", e.target.value)}
      />
    </div>
  );
}
