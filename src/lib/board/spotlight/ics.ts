/**
 * Minimal RFC 5545 calendar file writer, so a buyer can add their placement to a calendar with a reminder.
 * Pure: the caller passes the DTSTAMP time. Lines end in CRLF and are folded at 75 octets.
 */
import { DAY_MS, HOUR_MS, groupRuns } from "./rules";
import type { Booking, UnitKind } from "./types";

export interface IcsEvent {
  uid: string;
  /** Epoch ms. For all-day events this is 00:00 UTC of the first day. */
  start: number;
  /** Epoch ms, exclusive. */
  end: number;
  summary: string;
  description?: string;
  url?: string;
  allDay?: boolean;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function icsDateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function icsDate(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line so no physical line exceeds 75 octets (UTF-8), continuing with a leading space. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    bytes += b;
  }
  if (cur) parts.push(cur);
  return parts.join("\r\n ");
}

export function buildIcs(events: readonly IcsEvent[], now: number): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AdverticeAF//Board Spotlight//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${icsDateTime(now)}`);
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${icsDate(e.start)}`, `DTEND;VALUE=DATE:${icsDate(e.end)}`);
    else lines.push(`DTSTART:${icsDateTime(e.start)}`, `DTEND:${icsDateTime(e.end)}`);
    lines.push(`SUMMARY:${icsEscape(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (!e.allDay) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(e.summary)}`, "TRIGGER:-PT15M", "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** One event per run of consecutive units, so 3 hours in a row is a single 3-hour event. */
export function eventsForBookings(
  orderId: string,
  kind: UnitKind,
  bookings: readonly Booking[],
  opts: { titlePrefix?: string; name: string; headline: string; pageUrl: string },
): IcsEvent[] {
  const step = kind === "hour" ? HOUR_MS : DAY_MS;
  const what = kind === "hour" ? "AdverticeAF homepage spotlight" : "AdverticeAF tool sponsorship";
  return groupRuns(bookings.map((b) => b.start), step).map((run) => ({
    uid: `${orderId}-${run[0]}@adverticeaf.com`,
    start: run[0],
    end: run[run.length - 1] + step,
    allDay: kind === "day",
    summary: `${opts.titlePrefix ?? ""}${what}: ${opts.name}`,
    description: `Paid placement. Headline: ${opts.headline}. Times are shown in UTC.`,
    url: opts.pageUrl,
  }));
}
