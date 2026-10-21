/**
 * Pure helpers for the viral growth components (ShareCard, BadgeEmbed, AlertOptIn).
 * Everything here is deterministic and free of DOM access except `copyText`, which only touches
 * browser APIs when it is called.
 */

/* ------------------------------------------------------------------ text helpers */

/** Collapse whitespace, strip control characters. */
export function cleanText(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** Shorten to at most `max` characters (code points), ending in an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (max <= 0) return "";
  if (chars.length <= max) return text;
  if (max === 1) return "…";
  return `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/** "Northwind Studio (sample)!" -> "northwind-studio-sample". Always safe for a file name. */
export function slugify(text: string, fallback = "share"): string {
  const s = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return s || fallback;
}

/* ------------------------------------------------------------------ wrapping and fitting */

/** Width in pixels of `text` at the font size being tried. Injected so the logic is testable. */
export type Measure = (text: string) => number;

const ELLIPSIS = "…";

function ellipsize(line: string, maxWidth: number, measure: Measure): string {
  let chars = Array.from(line.trimEnd());
  while (chars.length > 0 && measure(chars.join("") + ELLIPSIS) > maxWidth) chars = chars.slice(0, -1);
  return chars.length === 0 ? ELLIPSIS : chars.join("").trimEnd() + ELLIPSIS;
}

/**
 * Greedy word wrap. Words wider than `maxWidth` are split by character. When `maxLines` is given
 * and the text needs more, the last line is cut with an ellipsis so nothing ever overflows.
 */
export function wrapText(text: string, maxWidth: number, measure: Measure, opts: { maxLines?: number } = {}): string[] {
  const clean = cleanText(text);
  if (!clean || maxWidth <= 0) return [];
  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    if (measure(word) <= maxWidth) {
      current = word;
      return;
    }
    // Too wide on its own: break by character, filling whole lines.
    let piece = "";
    for (const ch of Array.from(word)) {
      if (piece && measure(piece + ch) > maxWidth) {
        lines.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    current = piece;
  };

  for (const word of clean.split(" ")) {
    if (!current) {
      pushWord(word);
      continue;
    }
    const candidate = `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = "";
      pushWord(word);
    }
  }
  if (current) lines.push(current);

  const max = opts.maxLines;
  if (max !== undefined && max > 0 && lines.length > max) {
    const kept = lines.slice(0, max);
    // Re-join the overflow into the last line so the ellipsis marks that more text existed.
    kept[max - 1] = ellipsize(`${kept[max - 1]} ${lines.slice(max).join(" ")}`, maxWidth, measure);
    return kept;
  }
  return lines;
}

export interface FitOptions {
  maxWidth: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  /** Width of `text` at a given font size. */
  measureAt: (text: string, size: number) => number;
  step?: number;
}

export interface Fitted {
  size: number;
  lines: string[];
  truncated: boolean;
}

/** Largest font size (within bounds) at which the text fits in `maxLines`; truncates only at `minSize`. */
export function fitText(text: string, o: FitOptions): Fitted {
  const step = Math.max(1, o.step ?? 2);
  const lo = Math.min(o.minSize, o.maxSize);
  for (let size = o.maxSize; size >= lo; size -= step) {
    const lines = wrapText(text, o.maxWidth, (t) => o.measureAt(t, size));
    if (lines.length <= o.maxLines) return { size, lines, truncated: false };
  }
  const lines = wrapText(text, o.maxWidth, (t) => o.measureAt(t, lo), { maxLines: o.maxLines });
  return { size: lo, lines, truncated: true };
}

/* ------------------------------------------------------------------ share card layout */

export const CARD_W = 1200;
export const CARD_H = 630;
export const CARD_PAD = 80;

export interface CardInput {
  kicker: string;
  big: string;
  title: string;
  subtitle?: string;
}

export interface CardLine {
  text: string;
  /** Vertical centre of the line in pixels. */
  y: number;
}

export interface CardBlock {
  role: "kicker" | "big" | "title" | "subtitle";
  size: number;
  weight: number;
  lines: CardLine[];
}

export interface CardLayout {
  blocks: CardBlock[];
  /** Bottom of the content region, for tests. */
  contentTop: number;
  contentBottom: number;
}

export type CardMeasure = (text: string, size: number, weight: number) => number;

const KICKER_Y = 100;
const CONTENT_TOP = 150;
const CONTENT_BOTTOM = 520;
const MAX_CHARS = { kicker: 80, big: 40, title: 120, subtitle: 160 } as const;

interface Spec {
  role: "big" | "title" | "subtitle";
  text: string;
  weight: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  lh: number;
  gapAfter: number;
}

/**
 * Place the card text. Sizes shrink as a group until everything fits the content region, and
 * every line is wrapped or truncated to the card width, so no input can overflow the image.
 */
export function layoutShareCard(input: CardInput, measure: CardMeasure): CardLayout {
  const width = CARD_W - CARD_PAD * 2;
  const kickerText = truncate(cleanText(input.kicker), MAX_CHARS.kicker);
  const specs: Spec[] = [
    { role: "big", text: truncate(cleanText(input.big), MAX_CHARS.big), weight: 800, maxSize: 180, minSize: 56, maxLines: 2, lh: 1.1, gapAfter: 24 },
    { role: "title", text: truncate(cleanText(input.title), MAX_CHARS.title), weight: 700, maxSize: 60, minSize: 30, maxLines: 2, lh: 1.2, gapAfter: 14 },
    { role: "subtitle", text: truncate(cleanText(input.subtitle ?? ""), MAX_CHARS.subtitle), weight: 500, maxSize: 32, minSize: 22, maxLines: 2, lh: 1.25, gapAfter: 0 },
  ];

  const place = (scale: number) => {
    const fitted = specs
      .filter((s) => s.text)
      .map((s) => {
        const maxSize = Math.max(s.minSize, Math.round(s.maxSize * scale));
        const f = fitText(s.text, { maxWidth: width, maxSize, minSize: s.minSize, maxLines: s.maxLines, measureAt: (t, size) => measure(t, size, s.weight) });
        return { spec: s, fit: f, height: f.lines.length * f.size * s.lh };
      })
      .filter((b) => b.fit.lines.length > 0);
    const total = fitted.reduce((sum, b, i) => sum + b.height + (i < fitted.length - 1 ? b.spec.gapAfter : 0), 0);
    return { fitted, total };
  };

  let chosen = place(1);
  for (let scale = 0.95; chosen.total > CONTENT_BOTTOM - CONTENT_TOP && scale >= 0.3; scale -= 0.05) {
    chosen = place(scale);
  }

  const blocks: CardBlock[] = [];
  const kicker = fitText(kickerText, { maxWidth: width, maxSize: 28, minSize: 18, maxLines: 1, measureAt: (t, size) => measure(t, size, 700) });
  if (kicker.lines.length > 0) {
    blocks.push({ role: "kicker", size: kicker.size, weight: 700, lines: [{ text: kicker.lines[0], y: KICKER_Y }] });
  }

  const region = CONTENT_BOTTOM - CONTENT_TOP;
  let top = CONTENT_TOP + Math.max(0, (region - chosen.total) / 2);
  for (const { spec, fit } of chosen.fitted) {
    const lineH = fit.size * spec.lh;
    blocks.push({
      role: spec.role,
      size: fit.size,
      weight: spec.weight,
      lines: fit.lines.map((text, i) => ({ text, y: Math.round(top + lineH * i + lineH / 2) })),
    });
    top += lineH * fit.lines.length + spec.gapAfter;
  }
  return { blocks, contentTop: CONTENT_TOP, contentBottom: CONTENT_BOTTOM };
}

/* ------------------------------------------------------------------ URLs and X intent */

/** Normalised http(s) URL, or null for anything else (javascript:, data:, garbage). */
export function safeHttpUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname) return null;
    return u.href;
  } catch {
    return null;
  }
}

const X_TEXT_MAX = 240;

/** Tweet composer link. The url is dropped when it is not http(s); the text is capped. */
export function buildXIntentUrl({ text, url }: { text: string; url: string }): string {
  const params = [`text=${encodeURIComponent(truncate(cleanText(text), X_TEXT_MAX))}`];
  const safe = safeHttpUrl(url);
  if (safe) params.push(`url=${encodeURIComponent(safe)}`);
  return `https://twitter.com/intent/tweet?${params.join("&")}`;
}

/* ------------------------------------------------------------------ badge snippets */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Backslash-escape Markdown metacharacters in link text. Newlines become spaces. */
export function escapeMarkdown(value: string): string {
  return cleanText(value).replace(/([\\`*_{}[\]()#+!|<>~])/g, "\\$1");
}

/** Inline style shared by the HTML snippet and the live preview. */
export const BADGE_STYLE = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "#030712",
  color: "#22d3ee",
  border: "1px solid #334155",
  font: "600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  textDecoration: "none",
} as const;

function kebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export function badgeCss(): string {
  return Object.entries(BADGE_STYLE)
    .map(([k, v]) => `${kebab(k)}:${v}`)
    .join(";");
}

export interface BadgeSnippets {
  html: string;
  markdown: string;
  link: string;
}

/** Ready-to-paste badge snippets, or null when `href` is not a valid http(s) URL. */
export function buildBadgeSnippets(label: string, href: string): BadgeSnippets | null {
  const url = safeHttpUrl(href);
  if (!url) return null;
  const text = cleanText(label) || "Listed on the AdverticeAF Board";
  const mdUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return {
    html: `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="${escapeHtml(badgeCss())}">${escapeHtml(text)}</a>`,
    markdown: `[${escapeMarkdown(text)}](${mdUrl})`,
    link: url,
  };
}

/* ------------------------------------------------------------------ clipboard */

export type CopyResult = "ok" | "blocked";

/** Copy text. Uses the async Clipboard API, then a hidden textarea fallback. Never throws. */
export async function copyText(text: string): Promise<CopyResult> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "ok";
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    if (typeof document === "undefined") return "blocked";
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? "ok" : "blocked";
  } catch {
    return "blocked";
  }
}
