"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SelectField, TextField } from "@/components/ui/Field";
import { BOARD_CATEGORIES, RULES } from "@/lib/board/config";
import { checkListingUrl, deriveBrandName, type ListingErrors, type ListingFields as Fields } from "@/lib/board/listing";

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

/** Streamlined listing form: URL + auto-derived Name, with optional expandable tagline/category. */
export default function ListingFields({
  values,
  errors,
  onChange,
  lockUrl,
  taglineLabel = "Tagline (optional)",
  taglineMax = RULES.taglineMax,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(() => Boolean(values.tagline || (values.category && values.category !== "Marketing")));
  const check = values.url.trim() ? checkListingUrl(values.url) : null;

  const handleUrlChange = (newUrl: string) => {
    onChange("url", newUrl);
    // If name is blank or matches a previously derived name, auto-fill it
    if (!values.name.trim() && newUrl.trim()) {
      const derived = deriveBrandName(newUrl);
      if (derived && derived !== "Your Brand") {
        onChange("name", derived);
      }
    }
  };

  return (
    <div className="space-y-4">
      {!lockUrl && (
        <TextField
          label="Your Website URL"
          name="url"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbrand.com"
          value={values.url}
          error={errors.url}
          hint={check && check.ok ? `Will link to ${check.url}` : "Enter your website address (e.g. acme.com)"}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      )}
      <TextField
        label="Brand Name"
        name="name"
        maxLength={RULES.nameMax}
        placeholder="Your Brand"
        value={values.name}
        error={errors.name}
        hint={`${values.name.trim().length}/${RULES.nameMax}`}
        onChange={(e) => onChange("name", e.target.value)}
      />

      {/* Advanced Details Toggle */}
      <div className="border-t border-line/60 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{showAdvanced ? "Hide Extra Details" : "Add Tagline & Category (optional)"}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 rounded-xl border border-line bg-raised/40 p-3.5">
            <TextField
              label={taglineLabel}
              name="tagline"
              maxLength={taglineMax}
              placeholder="What you do in a few words"
              value={values.tagline}
              error={errors.tagline}
              hint={`${values.tagline.trim().length}/${taglineMax}`}
              onChange={(e) => onChange("tagline", e.target.value)}
            />
            <SelectField
              label="Category"
              name="category"
              options={["", ...BOARD_CATEGORIES]}
              value={values.category || "Marketing"}
              error={errors.category}
              onChange={(e) => onChange("category", e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
