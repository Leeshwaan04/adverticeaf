import { describe, expect, it } from "vitest";
import { buildIcs, eventsForBookings, icsDate, icsDateTime, icsEscape, icsFold } from "./ics";
import { DAY_MS, HOUR_MS } from "./rules";
import { fmtClock, fmtDay, fmtSlot } from "./time";
import type { Booking } from "./types";

const D0 = Date.UTC(2026, 9, 20);
const bk = (start: number): Booking => ({ id: `b${start}`, start, headline: "h", listing: { domain: "a.example", name: "A", url: null, category: null } });

describe("ics", () => {
  it("formats UTC date-times and dates", () => {
    expect(icsDateTime(Date.UTC(2026, 0, 5, 7, 8, 9))).toBe("20260105T070809Z");
    expect(icsDate(Date.UTC(2026, 11, 31))).toBe("20261231");
  });
  it("escapes special characters", () => {
    expect(icsEscape("a, b; c\\d\ne")).toBe("a\\, b\; c\\\\d\\ne");
  });
  it("folds long lines at 75 octets, including multibyte characters, and unfolding restores the text", () => {
    const long = "SUMMARY:" + "é".repeat(80);
    const folded = icsFold(long);
    for (const phys of folded.split("\r\n")) expect(new TextEncoder().encode(phys).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n ").join("")).toBe(long);
    expect(icsFold("short")).toBe("short");
  });
  it("merges consecutive hours into one event and keeps separate runs apart", () => {
    const events = eventsForBookings("ord1", "hour", [bk(D0 + 12 * HOUR_MS), bk(D0 + 13 * HOUR_MS), bk(D0 + 14 * HOUR_MS), bk(D0 + DAY_MS + 9 * HOUR_MS)], {
      name: "Studio", headline: "Hello", pageUrl: "https://adverticeaf.com/board/spotlight",
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ start: D0 + 12 * HOUR_MS, end: D0 + 15 * HOUR_MS, uid: `ord1-${D0 + 12 * HOUR_MS}@adverticeaf.com` });
    expect(events[1].end - events[1].start).toBe(HOUR_MS);
  });
  it("builds a valid calendar with CRLF endings, an alarm for hours and all-day dates for days", () => {
    const hours = buildIcs(eventsForBookings("o", "hour", [bk(D0 + 12 * HOUR_MS)], { name: "S", headline: "H", pageUrl: "https://x.example/p", titlePrefix: "[Demo] " }), D0);
    expect(hours.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(hours.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(hours).toContain("DTSTART:20261020T120000Z");
    expect(hours).toContain("DTEND:20261020T130000Z");
    expect(hours).toContain("SUMMARY:[Demo] AdverticeAF homepage spotlight: S");
    expect(hours).toContain("TRIGGER:-PT15M");
    expect(hours.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
    const days = buildIcs(eventsForBookings("o", "day", [bk(D0 + DAY_MS), bk(D0 + 2 * DAY_MS)], { name: "S", headline: "H", pageUrl: "https://x.example/p" }), D0);
    expect(days).toContain("DTSTART;VALUE=DATE:20261021");
    expect(days).toContain("DTEND;VALUE=DATE:20261023");
    expect(days).not.toContain("VALARM");
  });
});

describe("time formatting (UTC)", () => {
  it("formats clock and day", () => {
    expect(fmtClock(D0 + 14 * HOUR_MS, "utc")).toBe("14:00");
    expect(fmtClock(D0, "utc")).toBe("00:00");
    expect(fmtDay(D0, "utc")).toBe("Tue, Oct 20");
    expect(fmtSlot(D0 + 23 * HOUR_MS, "utc")).toBe("Tue, Oct 20, 23:00 to 00:00 UTC");
    expect(fmtSlot(D0 + 12 * HOUR_MS, "utc", "x", 3)).toBe("Tue, Oct 20, 12:00 to 15:00 UTC");
  });
});
