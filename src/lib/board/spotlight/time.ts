/** Time formatting for slots. The grid is always laid out in UTC; "local" only changes the labels. */
export type Zone = "utc" | "local";

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(zone: Zone, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${zone}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { ...opts, ...(zone === "utc" ? { timeZone: "UTC" } : {}) });
    cache.set(key, f);
  }
  return f;
}

/** "14:00" (24-hour). In a half-hour zone the local label is "19:30". */
export function fmtClock(ms: number, zone: Zone): string {
  return fmt(zone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
}

/** "Tue, Oct 20" */
export function fmtDay(ms: number, zone: Zone): string {
  return fmt(zone, { weekday: "short", month: "short", day: "numeric" }).format(ms);
}

/** "Tue" */
export function fmtWeekday(ms: number, zone: Zone): string {
  return fmt(zone, { weekday: "short" }).format(ms);
}

/** "20" */
export function fmtDayNumber(ms: number, zone: Zone): string {
  return fmt(zone, { day: "numeric" }).format(ms);
}

export function zoneName(zone: Zone, localName: string): string {
  return zone === "utc" ? "UTC" : localName;
}

/** "Tue, Oct 20, 14:00 to 15:00 UTC" for one hour starting at `start`. */
export function fmtSlot(start: number, zone: Zone, localName = "local time", hours = 1): string {
  const end = start + hours * 3_600_000;
  return `${fmtDay(start, zone)}, ${fmtClock(start, zone)} to ${fmtClock(end, zone)} ${zoneName(zone, localName)}`;
}

/** Local time-zone name, or "UTC" if the runtime cannot tell. */
export function detectLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
