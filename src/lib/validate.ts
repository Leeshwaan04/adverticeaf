export type Errors<K extends string> = Partial<Record<K, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function required(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required.`;
}

export function validEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required.";
  return EMAIL_RE.test(value.trim()) ? undefined : "Enter a valid email address, like name@company.com.";
}

/** Accepts "example.com", "www.example.com/path" or a full http(s) URL. */
export function validWebsite(value: string, { optional = false } = {}): string | undefined {
  const v = value.trim();
  if (!v) return optional ? undefined : "Website is required.";
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.hostname.includes(".") ? undefined : "Enter a valid website, like yourbrand.com.";
  } catch {
    return "Enter a valid website, like yourbrand.com.";
  }
}

export function normalizeWebsite(value: string): string {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
