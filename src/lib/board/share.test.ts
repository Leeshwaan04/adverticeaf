import { describe, expect, it } from "vitest";
import {
  BADGE_STYLE,
  CARD_PAD,
  CARD_W,
  badgeCss,
  buildBadgeSnippets,
  buildXIntentUrl,
  cleanText,
  escapeHtml,
  escapeMarkdown,
  fitText,
  layoutShareCard,
  safeHttpUrl,
  slugify,
  truncate,
  wrapText,
} from "./share";

/** Every character is 10px wide at size 20 (0.5 em). */
const measure = (t: string) => Array.from(t).length * 10;
const measureAt = (t: string, size: number) => Array.from(t).length * size * 0.5;
const cardMeasure = (t: string, size: number, weight: number) => Array.from(t).length * size * (weight >= 700 ? 0.6 : 0.52);

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("abc", 3)).toBe("abc");
    expect(truncate("", 5)).toBe("");
  });
  it("cuts at the limit with an ellipsis that counts toward it", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(Array.from(truncate("abcdef", 4))).toHaveLength(4);
  });
  it("handles degenerate limits", () => {
    expect(truncate("abc", 0)).toBe("");
    expect(truncate("abc", 1)).toBe("…");
  });
  it("does not split emoji", () => {
    expect(truncate("😀😀😀😀", 3)).toBe("😀😀…");
  });
});

describe("cleanText and slugify", () => {
  it("collapses whitespace and strips control chars", () => {
    expect(cleanText("  a \n\t b\u0000c  ")).toBe("a b c");
  });
  it("builds file-safe slugs", () => {
    expect(slugify("Northwind Studio (sample)!")).toBe("northwind-studio-sample");
    expect(slugify("Café Déjà")).toBe("cafe-deja");
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("!!!")).toBe("share");
    expect(slugify("", "x")).toBe("x");
  });
  it("caps slug length without a trailing dash", () => {
    const s = slugify(`${"a".repeat(47)} bbbbbb`);
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("wrapText", () => {
  it("returns no lines for empty text or no room", () => {
    expect(wrapText("", 100, measure)).toEqual([]);
    expect(wrapText("   ", 100, measure)).toEqual([]);
    expect(wrapText("abc", 0, measure)).toEqual([]);
  });
  it("wraps on word boundaries", () => {
    expect(wrapText("one two three four", 90, measure)).toEqual(["one two", "three", "four"]);
  });
  it("keeps a line exactly at the width boundary", () => {
    expect(wrapText("abcd efgh", 90, measure)).toEqual(["abcd efgh"]);
    expect(wrapText("abcd efgh", 89, measure)).toEqual(["abcd", "efgh"]);
  });
  it("breaks a word wider than the line by character", () => {
    expect(wrapText("abcdefghij", 40, measure)).toEqual(["abcd", "efgh", "ij"]);
  });
  it("breaks a long word that follows short text", () => {
    expect(wrapText("hi abcdefghij", 40, measure)).toEqual(["hi", "abcd", "efgh", "ij"]);
  });
  it("never loops on a glyph wider than the line", () => {
    expect(wrapText("abc", 5, measure)).toEqual(["a", "b", "c"]);
  });
  it("truncates with an ellipsis when over maxLines, and the result still fits", () => {
    const lines = wrapText("one two three four five six", 70, measure, { maxLines: 2 });
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(70);
  });
  it("does not add an ellipsis when it fits maxLines", () => {
    expect(wrapText("one two three", 70, measure, { maxLines: 2 })).toEqual(["one two", "three"]);
  });
  it("collapses newlines and repeated spaces", () => {
    expect(wrapText("a\n\nb   c", 100, measure)).toEqual(["a b c"]);
  });
});

describe("fitText", () => {
  const base = { maxWidth: 400, maxSize: 40, minSize: 10, maxLines: 1, measureAt };
  it("uses the max size when it fits", () => {
    const r = fitText("abcd", base);
    expect(r).toEqual({ size: 40, lines: ["abcd"], truncated: false });
  });
  it("shrinks until it fits on one line", () => {
    // 20 chars at size s is 10*s wide; 400 wide means s <= 40 ok, 40 chars needs s <= 20.
    const r = fitText("a".repeat(40), base);
    expect(r.size).toBe(20);
    expect(r.lines).toHaveLength(1);
    expect(measureAt(r.lines[0], r.size)).toBeLessThanOrEqual(400);
    expect(r.truncated).toBe(false);
  });
  it("truncates only after reaching the minimum size", () => {
    const r = fitText("a".repeat(500), base);
    expect(r.size).toBe(10);
    expect(r.truncated).toBe(true);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].endsWith("…")).toBe(true);
    expect(measureAt(r.lines[0], r.size)).toBeLessThanOrEqual(400);
  });
  it("allows multiple lines before shrinking further", () => {
    const r = fitText("alpha beta gamma delta epsilon", { ...base, maxLines: 2, maxSize: 30 });
    expect(r.lines.length).toBeLessThanOrEqual(2);
    for (const l of r.lines) expect(measureAt(l, r.size)).toBeLessThanOrEqual(400);
  });
});

describe("layoutShareCard", () => {
  const width = CARD_W - CARD_PAD * 2;
  const check = (layout: ReturnType<typeof layoutShareCard>) => {
    for (const b of layout.blocks) {
      for (const l of b.lines) {
        expect(cardMeasure(l.text, b.size, b.weight)).toBeLessThanOrEqual(width + 0.001);
        if (b.role !== "kicker") {
          expect(l.y - b.size / 2).toBeGreaterThanOrEqual(layout.contentTop - 1);
          expect(l.y + b.size / 2).toBeLessThanOrEqual(layout.contentBottom + 1);
        }
      }
    }
  };

  it("lays out a typical card with big text as large as possible", () => {
    const layout = layoutShareCard({ kicker: "AdverticeAF Board", big: "#1", title: "Northwind Studio (sample)", subtitle: "Sample tagline" }, cardMeasure);
    expect(layout.blocks.map((b) => b.role)).toEqual(["kicker", "big", "title", "subtitle"]);
    expect(layout.blocks.find((b) => b.role === "big")?.size).toBe(180);
    check(layout);
  });
  it("omits an empty subtitle", () => {
    const layout = layoutShareCard({ kicker: "K", big: "#2", title: "T" }, cardMeasure);
    expect(layout.blocks.map((b) => b.role)).toEqual(["kicker", "big", "title"]);
  });
  it("never overflows for worst-case long inputs", () => {
    const long = "Supercalifragilisticexpialidocious ".repeat(12);
    const layout = layoutShareCard({ kicker: long, big: long, title: long, subtitle: long }, cardMeasure);
    check(layout);
    for (const b of layout.blocks) expect(b.lines.length).toBeLessThanOrEqual(2);
  });
  it("never overflows for one unbroken string", () => {
    const layout = layoutShareCard({ kicker: "x".repeat(300), big: "W".repeat(300), title: "y".repeat(500), subtitle: "z".repeat(500) }, cardMeasure);
    check(layout);
  });
  it("shrinks text as a group to keep everything in the content region", () => {
    const layout = layoutShareCard({ kicker: "K", big: "A".repeat(30), title: "word ".repeat(24), subtitle: "word ".repeat(30) }, cardMeasure);
    check(layout);
    const big = layout.blocks.find((b) => b.role === "big");
    expect(big && big.size).toBeLessThan(180);
  });
  it("keeps lines in reading order", () => {
    const layout = layoutShareCard({ kicker: "K", big: "Big", title: "word ".repeat(20), subtitle: "sub" }, cardMeasure);
    const ys = layout.blocks.flatMap((b) => b.lines.map((l) => l.y));
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
  it("copes with all-empty input", () => {
    const layout = layoutShareCard({ kicker: "", big: "", title: "" }, cardMeasure);
    expect(layout.blocks).toEqual([]);
  });
});

describe("safeHttpUrl", () => {
  it("accepts http and https and normalises", () => {
    expect(safeHttpUrl("https://adverticeaf.example/board")).toBe("https://adverticeaf.example/board");
    expect(safeHttpUrl("  http://a.example  ")).toBe("http://a.example/");
  });
  it("rejects other schemes and garbage", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<b>x</b>")).toBeNull();
    expect(safeHttpUrl("ftp://a.example")).toBeNull();
    expect(safeHttpUrl("/board")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });
});

describe("buildXIntentUrl", () => {
  it("encodes text and url", () => {
    const u = buildXIntentUrl({ text: "I'm #1 & loving it! 100%", url: "https://adverticeaf.example/board?x=1&y=2" });
    expect(u.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    const parsed = new URL(u);
    expect(parsed.searchParams.get("text")).toBe("I'm #1 & loving it! 100%");
    expect(parsed.searchParams.get("url")).toBe("https://adverticeaf.example/board?x=1&y=2");
    expect(u).not.toContain(" ");
    expect(u.split("?")[1].split("&")).toHaveLength(2);
  });
  it("drops an unsafe url but keeps the text", () => {
    const u = buildXIntentUrl({ text: "hello", url: "javascript:alert(1)" });
    expect(u).toBe("https://twitter.com/intent/tweet?text=hello");
  });
  it("caps very long text", () => {
    const parsed = new URL(buildXIntentUrl({ text: "a".repeat(1000), url: "https://a.example" }));
    expect(Array.from(parsed.searchParams.get("text") ?? "").length).toBe(240);
  });
  it("cannot inject extra parameters through text", () => {
    const parsed = new URL(buildXIntentUrl({ text: "x&url=https://evil.example#", url: "https://a.example" }));
    expect(parsed.searchParams.getAll("url")).toEqual(["https://a.example/"]);
  });
});

describe("escaping", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;");
  });
  it("escapes ampersands first so entities are not double-decoded", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
  it("escapes Markdown metacharacters", () => {
    expect(escapeMarkdown("a [b](c) *d* _e_ `f`")).toBe("a \\[b\\]\\(c\\) \\*d\\* \\_e\\_ \\`f\\`");
    expect(escapeMarkdown("line1\nline2")).toBe("line1 line2");
  });
});

describe("buildBadgeSnippets", () => {
  const href = "https://adverticeaf.example/board?id=abc";

  it("builds html, markdown and link", () => {
    const s = buildBadgeSnippets("Ranked #3 on the AdverticeAF Board", href);
    expect(s).not.toBeNull();
    expect(s?.link).toBe(href);
    expect(s?.html).toContain(`href="${href}"`);
    expect(s?.html).toContain('rel="noopener"');
    expect(s?.html).toContain(">Ranked #3 on the AdverticeAF Board</a>");
    expect(s?.html).toContain(`style="${badgeCss()}"`);
    expect(s?.markdown).toBe(`[Ranked \\#3 on the AdverticeAF Board](${href})`);
  });
  it("escapes the label in the HTML snippet so it cannot break out", () => {
    const s = buildBadgeSnippets(`</a><img src=x onerror="alert(1)">`, href);
    expect(s?.html).not.toContain("<img");
    expect(s?.html).not.toContain('onerror="');
    expect(s?.html).toContain("&lt;/a&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
  it("escapes quotes and ampersands in the href attribute", () => {
    const s = buildBadgeSnippets("x", 'https://a.example/p?a=1&b="2"');
    expect(s?.html).toContain("&amp;");
    expect(s?.html).not.toMatch(/href="[^"]*"[^ >]*"/);
    expect(s?.html.match(/href="([^"]*)"/)?.[1]).not.toContain('"');
  });
  it("escapes parentheses in the Markdown url so the link cannot be cut short", () => {
    const s = buildBadgeSnippets("x", "https://a.example/p(1)");
    expect(s?.markdown).toBe("[x](https://a.example/p%281%29)");
  });
  it("rejects non-http hrefs", () => {
    expect(buildBadgeSnippets("x", "javascript:alert(1)")).toBeNull();
    expect(buildBadgeSnippets("x", "data:text/html,hi")).toBeNull();
    expect(buildBadgeSnippets("x", "not a url")).toBeNull();
  });
  it("falls back to a default label when the label is blank", () => {
    expect(buildBadgeSnippets("   ", href)?.html).toContain(">Listed on the AdverticeAF Board</a>");
  });
  it("derives the css string from the style object", () => {
    const css = badgeCss();
    expect(css).toContain("border-radius:999px");
    expect(css).toContain("text-decoration:none");
    expect(css.split(";")).toHaveLength(Object.keys(BADGE_STYLE).length);
  });
});
