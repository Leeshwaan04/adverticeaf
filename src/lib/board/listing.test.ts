import { describe, expect, it } from "vitest";
import { checkListingUrl, checkText, deriveBrandName, validateListing } from "./listing";

describe("checkListingUrl", () => {
  it("adds https, lowercases the host, drops www and keys by host", () => {
    const r = checkListingUrl("WWW.Example-Brand.com");
    expect(r).toMatchObject({ ok: true, url: "https://www.example-brand.com", key: "example-brand.com" });
  });
  it("strips tracking params and fragments but keeps real ones", () => {
    const r = checkListingUrl("https://brand.example/pricing/?utm_source=x&plan=pro&fbclid=abc#top");
    expect(r).toMatchObject({ ok: true, url: "https://brand.example/pricing?plan=pro", key: "brand.example" });
  });
  it("gives the same key regardless of query string", () => {
    const a = checkListingUrl("https://brand.example/?utm_campaign=a");
    const b = checkListingUrl("brand.example");
    expect(a.ok && b.ok && a.key === b.key).toBe(true);
  });
  it("keys shared hosts by first path segment and rejects their bare home page", () => {
    expect(checkListingUrl("https://github.com/Acme/repo")).toMatchObject({ ok: true, key: "github.com/acme" });
    expect(checkListingUrl("https://x.com/@Acme")).toMatchObject({ ok: true, key: "x.com/acme" });
    expect(checkListingUrl("https://github.com").ok).toBe(false);
  });
  it("keys app stores by full path", () => {
    expect(checkListingUrl("https://apps.apple.com/us/app/foo/id123?mt=8")).toMatchObject({ ok: true, key: "apps.apple.com/us/app/foo/id123" });
  });
  it.each([
    ["bit.ly/abc"], ["https://t.co/x"], ["https://discord.gg/xyz"], ["https://discord.com/invite/xyz"],
    ["https://chat.whatsapp.com/abc"], ["https://t.me/+abc"], ["http://127.0.0.1"], ["http://192.168.0.1/x"],
    ["localhost"], ["ftp://example.com"], ["https://user:pw@example.com"], ["https://site.xxx"], ["not a url"], [""],
  ])("rejects %s", (input) => {
    expect(checkListingUrl(input).ok).toBe(false);
  });
});

describe("checkText", () => {
  it("rejects links, control characters and overlong text", () => {
    expect(checkText("visit example.com now", "Tagline", 80)).toBeTruthy();
    expect(checkText("hello\u202Eworld", "Name", 40)).toBeTruthy();
    expect(checkText("x".repeat(50), "Name", 40)).toBeTruthy();
    expect(checkText("Acme Studio", "Name", 40)).toBeUndefined();
  });
});

describe("validateListing", () => {
  it("returns errors per field and a normalised url when valid", () => {
    const bad = validateListing({ url: "", name: "", tagline: "", category: "" });
    expect(Object.keys(bad.errors).sort()).toEqual(["category", "name", "tagline", "url"]);
    const good = validateListing({ url: "acme.example", name: "Acme", tagline: "We make ads", category: "Marketing" });
    expect(good.errors).toEqual({});
    expect(good.url?.key).toBe("acme.example");
  });
});

describe("deriveBrandName", () => {
  it("derives clean human-readable brand names from domains and URLs", () => {
    expect(deriveBrandName("sypha.ai")).toBe("Sypha");
    expect(deriveBrandName("https://stripe.com")).toBe("Stripe");
    expect(deriveBrandName("https://www.cal.com/meeting")).toBe("Cal");
    expect(deriveBrandName("super-human.com")).toBe("Super Human");
    expect(deriveBrandName("my_cool_startup.io")).toBe("My Cool Startup");
  });

  it("handles blank or malformed input gracefully with fallback", () => {
    expect(deriveBrandName("")).toBe("Your Brand");
    expect(deriveBrandName("   ")).toBe("Your Brand");
  });
});

