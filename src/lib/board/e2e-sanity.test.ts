import { describe, it, expect, beforeEach } from "vitest";
import { handleBoardRequest, resetBoardMemoryForTesting, type BoardEnv } from "../../../server/board";

describe("E2E Sanity Testing — All User Scenarios, Flows & Journeys", () => {
  beforeEach(() => {
    resetBoardMemoryForTesting();
  });

  describe("Journey 1: Clean Slate & Board Discovery", () => {
    it("starts with 0 listings, 0 bids, $0.00 volume and $1.00 lead cost", async () => {
      const req = new Request("https://adverticeaf.com/v1/board", { method: "GET" });
      const res = await handleBoardRequest(req);
      expect(res.status).toBe(200);

      const board = (await res.json()) as {
        season: string;
        rows: Array<{ rank: number }>;
        stats: { listings: number; totalCents: number; clicks: number };
        leadCostCents: number;
        mode: string;
      };

      expect(board.mode).toBe("live");
      expect(board.rows.length).toBe(0);
      expect(board.stats.listings).toBe(0);
      expect(board.stats.totalCents).toBe(0);
      expect(board.stats.clicks).toBe(0);
      expect(board.leadCostCents).toBe(100); // $1.00 minimum bid to take #1
    });

    it("supports all season windows (daily, weekly, monthly, all) gracefully", async () => {
      for (const season of ["daily", "weekly", "monthly", "all"]) {
        const req = new Request(`https://adverticeaf.com/v1/board?season=${season}`, { method: "GET" });
        const res = await handleBoardRequest(req);
        expect(res.status).toBe(200);
        const data = (await res.json()) as { season: string; rows: unknown[] };
        expect(data.season).toBe(season);
        expect(Array.isArray(data.rows)).toBe(true);
      }
    });

    it("supports category filtering on empty and populated boards", async () => {
      const req = new Request("https://adverticeaf.com/v1/board?category=Marketing", { method: "GET" });
      const res = await handleBoardRequest(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { category: string; rows: unknown[] };
      expect(data.category).toBe("Marketing");
      expect(data.rows.length).toBe(0);
    });
  });

  describe("Journey 2: New Listing Creation & Claiming #1 Throne", () => {
    it("calculates accurate pre-purchase quotes for new listings", async () => {
      const quoteReq = new Request("https://adverticeaf.com/v1/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://sypha.ai",
          amountCents: 1000,
        }),
      });

      const quoteRes = await handleBoardRequest(quoteReq);
      expect(quoteRes.status).toBe(200);
      const quote = (await quoteRes.json()) as {
        ok: boolean;
        domain: string;
        isNewListing: boolean;
        amountCents: number;
        newRank: number;
        of: number;
        tookLead: boolean;
        costToLeadCents: number;
      };

      expect(quote.ok).toBe(true);
      expect(quote.domain).toBe("sypha.ai");
      expect(quote.isNewListing).toBe(true);
      expect(quote.amountCents).toBe(1000);
      expect(quote.newRank).toBe(1);
      expect(quote.of).toBe(1);
      expect(quote.tookLead).toBe(true);
    });

    it("places the first bid, takes King of the Hill #1, and updates live stats", async () => {
      const bidReq = new Request("https://adverticeaf.com/v1/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newListing: {
            url: "https://sypha.ai",
            name: "Sypha AI",
            tagline: "Autonomous Agent OS",
            category: "Agents",
          },
          amountCents: 1000, // $10.00
          email: "founder@sypha.ai",
        }),
      });

      const bidRes = await handleBoardRequest(bidReq);
      expect(bidRes.status).toBe(200);
      const bidData = (await bidRes.json()) as {
        ok: boolean;
        bid: { id: string; domain: string; amountCents: number };
        listing: { domain: string; name: string };
      };

      expect(bidData.ok).toBe(true);
      expect(bidData.bid.domain).toBe("sypha.ai");
      expect(bidData.bid.amountCents).toBe(1000);
      expect(bidData.listing.name).toBe("Sypha AI");

      // Verify board state now reflects Sypha AI at rank 1
      const boardReq = new Request("https://adverticeaf.com/v1/board", { method: "GET" });
      const boardRes = await handleBoardRequest(boardReq);
      const board = (await boardRes.json()) as {
        rows: Array<{ rank: number; listing: { domain: string; name: string }; totalCents: number }>;
        stats: { listings: number; totalCents: number };
        leadCostCents: number;
      };

      expect(board.rows.length).toBe(1);
      expect(board.rows[0].rank).toBe(1);
      expect(board.rows[0].listing.domain).toBe("sypha.ai");
      expect(board.rows[0].totalCents).toBe(1000);
      expect(board.stats.listings).toBe(1);
      expect(board.stats.totalCents).toBe(1000);
      // Cost to overtake Sypha AI is $10.00 + $1.00 margin = $11.00 (1100 cents)
      expect(board.leadCostCents).toBe(1100);
    });
  });

  describe("Journey 3: Outbid Battle & Dynamic Re-Ranking", () => {
    it("handles multiple competitors, outbids, and crown handoffs", async () => {
      // 1. Initial bid: Sypha AI bids $10.00
      await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newListing: {
              url: "https://sypha.ai",
              name: "Sypha AI",
              tagline: "Autonomous Agent OS",
              category: "Agents",
            },
            amountCents: 1000,
          }),
        }),
      );

      // 2. Challenger enters: Acme Corp bids $5.00
      await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newListing: {
              url: "https://acme.com",
              name: "Acme Corp",
              tagline: "High Growth Tools",
              category: "Productivity",
            },
            amountCents: 500,
          }),
        }),
      );

      // Check board: Sypha #1 ($10), Acme #2 ($5)
      let boardRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      let board = (await boardRes.json()) as { rows: Array<{ rank: number; listing: { domain: string } }> };
      expect(board.rows[0].listing.domain).toBe("sypha.ai");
      expect(board.rows[1].listing.domain).toBe("acme.com");

      // 3. Counter-bid: Acme boosts with $15.00 more (cumulative $20.00)
      const overtakeBidRes = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "acme.com",
            amountCents: 1500,
          }),
        }),
      );
      expect(overtakeBidRes.status).toBe(200);

      // Check board: Acme now takes #1 ($20), Sypha drops to #2 ($10)
      boardRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      board = (await boardRes.json()) as {
        rows: Array<{ rank: number; listing: { domain: string }; totalCents: number }>;
        leadCostCents: number;
      };
      expect(board.rows[0].listing.domain).toBe("acme.com");
      expect(board.rows[0].totalCents).toBe(2000);
      expect(board.rows[1].listing.domain).toBe("sypha.ai");
      expect(board.rows[1].totalCents).toBe(1000);
      // New lead cost to overtake Acme is $20.00 + $1.00 = $21.00 (2100 cents)
      expect(board.leadCostCents).toBe(2100);
    });
  });

  describe("Journey 4: Click Analytics & Real-Time SSE Stream", () => {
    it("records clicks and updates click counts on listing", async () => {
      // Add listing
      await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newListing: { url: "https://sypha.ai", name: "Sypha", tagline: "AI", category: "Agents" },
            amountCents: 500,
          }),
        }),
      );

      // Record 3 clicks
      for (let i = 0; i < 3; i++) {
        const clickRes = await handleBoardRequest(
          new Request("https://adverticeaf.com/v1/clicks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: "sypha.ai" }),
          }),
        );
        expect(clickRes.status).toBe(200);
      }

      // Check board reflects 3 clicks
      const boardRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      const board = (await boardRes.json()) as { rows: Array<{ clicks: number }>; stats: { clicks: number } };
      expect(board.rows[0].clicks).toBe(3);
      expect(board.stats.clicks).toBe(3);
    });

    it("serves SSE events stream with proper headers", async () => {
      const sseRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/events", { method: "GET" }));
      expect(sseRes.status).toBe(200);
      expect(sseRes.headers.get("Content-Type")).toContain("text/event-stream");
      expect(sseRes.headers.get("Cache-Control")).toContain("no-cache");
    });
  });

  describe("Journey 5: Domain Verification Workflow & SSRF Shield", () => {
    it("generates authentic DNS TXT and HTML meta verification tokens", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/verification?domain=sypha.ai", { method: "GET" }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        token: string;
        methods: Array<{ type: string; value: string }>;
      };

      expect(data.token.startsWith("adv_")).toBe(true);
      expect(data.methods.some((m) => m.type === "dns" && m.value.includes(data.token))).toBe(true);
      expect(data.methods.some((m) => m.type === "meta" && m.value.includes(data.token))).toBe(true);
    });

    it("strictly blocks SSRF attempts on internal/loopback domains", async () => {
      const targets = ["localhost", "127.0.0.1", "169.254.169.254", "internal.corp", "10.0.0.1"];
      for (const t of targets) {
        const res = await handleBoardRequest(
          new Request(`https://adverticeaf.com/v1/verification?domain=${t}`, { method: "GET" }),
        );
        expect(res.status).toBe(400);
      }
    });
  });

  describe("Journey 6: Dynamic Branded OG Card Generation", () => {
    it("renders pixel-perfect 1200x630 SVG social card with security escaping", async () => {
      const res = await handleBoardRequest(
        new Request(
          "https://adverticeaf.com/v1/og?domain=sypha.ai&rank=1&name=Sypha+%3Cb%3EBold%3C%2Fb%3E&spent=%2450.00",
          { method: "GET" },
        ),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

      const svg = await res.text();
      expect(svg).toContain('width="1200" height="630"');
      expect(svg).toContain("Sypha &lt;b&gt;Bold&lt;/b&gt;");
      expect(svg).not.toContain("<b>Bold</b>");
      expect(svg).toContain("KING OF THE HILL");
    });
  });

  describe("Journey 7: Dodo Payments Live Webhook Integration", () => {
    it("processes valid webhook payments and credits listing spend", async () => {
      const payload = JSON.stringify({
        type: "payment.succeeded",
        data: {
          total_amount: 5000, // $50.00
          metadata: {
            domain: "sponsorbrand.com",
            name: "Sponsor Brand",
            url: "https://sponsorbrand.com",
            category: "Developer",
            tagline: "Developer Productivity Platform",
            amountCents: "5000",
            email: "billing@sponsorbrand.com",
          },
        },
      });

      const secret = "whsec_MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE";
      const rawSecret = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
      const id = "msg_123";
      const nowSec = Math.floor(Date.now() / 1000);
      const toSign = `${id}.${nowSec}.${payload}`;
      const key = await crypto.subtle.importKey("raw", rawSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      const req = new Request("https://adverticeaf.com/v1/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": id,
          "webhook-timestamp": String(nowSec),
          "webhook-signature": `v1,${signatureBase64}`,
        },
        body: payload,
      });

      const env: BoardEnv = {
        DODO_PAYMENTS_WEBHOOK_KEY: secret,
      };

      const res = await handleBoardRequest(req, env);
      expect(res.status).toBe(200);

      // Verify the board now has Sponsor Brand with $50.00 spend at rank #1
      const boardRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      const board = (await boardRes.json()) as { rows: Array<{ listing: { domain: string }; totalCents: number }> };
      expect(board.rows.some((r) => r.listing.domain === "sponsorbrand.com" && r.totalCents === 5000)).toBe(true);
    });

    it("rejects unauthorized webhook calls with invalid signatures", async () => {
      const req = new Request("https://adverticeaf.com/v1/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-signature": "invalid_sig",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify({ type: "payment.succeeded" }),
      });

      const env: BoardEnv = {
        DODO_PAYMENTS_WEBHOOK_KEY: "whsec_real_secret",
      };

      const res = await handleBoardRequest(req, env);
      expect(res.status).toBe(401);
    });
  });

  describe("Journey 8: OutbidNav Category Navigation & Zero-Click Experience", () => {
    it("correctly filters rankings across all categories from the Outbid navbar", async () => {
      const categories = [
        "Marketing",
        "SEO",
        "Productivity",
        "Agents",
        "Developer",
        "Crypto",
        "Other",
        "Games",
      ] as const;

      // Seed one listing per category
      for (const [index, cat] of categories.entries()) {
        const domain = `startup-${cat.toLowerCase()}.com`;
        const addRes = await handleBoardRequest(
          new Request("https://adverticeaf.com/v1/bids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              newListing: {
                url: `https://${domain}`,
                name: `Startup ${cat}`,
                tagline: `${cat} platform`,
                category: cat,
              },
              amountCents: (index + 1) * 200,
            }),
          }),
        );
        expect(addRes.status).toBe(200);
      }

      // Verify "All" returns all 8 categories
      const allRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      const allData = (await allRes.json()) as { rows: Array<{ listing: { category: string } }>; stats: { listings: number } };
      expect(allData.rows.length).toBe(8);
      expect(allData.stats.listings).toBe(8);

      // Verify every individual category query returns ONLY that category
      for (const cat of categories) {
        const catRes = await handleBoardRequest(
          new Request(`https://adverticeaf.com/v1/board?category=${cat}`, { method: "GET" }),
        );
        expect(catRes.status).toBe(200);
        const catData = (await catRes.json()) as { category: string; rows: Array<{ listing: { category: string } }> };
        expect(catData.category).toBe(cat);
        expect(catData.rows.length).toBe(1);
        expect(catData.rows[0].listing.category).toBe(cat);
      }
    });

    it("verifies brand name auto-derivation and default categorization for 1-click flows", async () => {
      const addRes = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newListing: {
              url: "https://super-human.com",
              name: "Super Human",
              tagline: "",
              category: "Productivity",
            },
            amountCents: 1500,
          }),
        }),
      );
      expect(addRes.status).toBe(200);

      const boardRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/board", { method: "GET" }));
      const board = (await boardRes.json()) as { rows: Array<{ listing: { name: string; domain: string } }> };
      const row = board.rows.find((r) => r.listing.domain === "super-human.com");
      expect(row).toBeDefined();
      expect(row?.listing.name).toBe("Super Human");
    });
  });

  describe("Journey 9: Daily & Weekly Leaderboard Digest Rollup", () => {
    it("generates structured executive summaries and social-ready digest text", async () => {
      // Seed #1 King
      await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newListing: {
              url: "https://sypha.ai",
              name: "Sypha",
              tagline: "Autonomous Agentic Systems",
              category: "Agents",
            },
            amountCents: 5000,
          }),
        }),
      );

      const digestRes = await handleBoardRequest(new Request("https://adverticeaf.com/v1/digest", { method: "GET" }));
      expect(digestRes.status).toBe(200);

      const digest = (await digestRes.json()) as {
        ok: boolean;
        topKing: { name: string; domain: string; totalCents: number };
        plainText: string;
        markdown: string;
      };

      expect(digest.ok).toBe(true);
      expect(digest.topKing?.name).toBe("Sypha");
      expect(digest.topKing?.domain).toBe("sypha.ai");
      expect(digest.topKing?.totalCents).toBe(5000);
      expect(digest.plainText).toContain("King of the Hill (#1): Sypha (sypha.ai)");
      expect(digest.markdown).toContain("[Sypha](https://adverticeaf.com/?highlight=sypha.ai)");
      // Zero emojis
      expect(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(digest.plainText)).toBe(false);
      expect(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(digest.markdown)).toBe(false);
    });
  });

  describe("Journey 10: NVIDIA Models Suite (Nemotron & Llama Guard)", () => {
    it("generates brand taglines and categorizes domains using NVIDIA Nemotron", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/ai/tagline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://stripe.com" }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; name: string; tagline: string; category: string; modelUsed: string };
      expect(data.ok).toBe(true);
      expect(data.name).toBe("Stripe");
      expect(data.tagline.length).toBeGreaterThan(0);
      expect(data.category).toBeDefined();
      expect(data.modelUsed).toContain("nemotron");
    });

    it("generates executive market commentary using NVIDIA Nemotron 70B", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/ai/digest?season=all", { method: "GET" }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; narrative: string; modelUsed: string };
      expect(data.ok).toBe(true);
      expect(data.narrative.length).toBeGreaterThan(0);
      expect(data.modelUsed).toContain("nemotron-70b");
      // Zero emojis
      expect(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(data.narrative)).toBe(false);
    });

    it("moderates listing content using NVIDIA Llama Guard", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/ai/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: "https://mybrand.com",
            name: "My Brand",
            tagline: "Software and analytics",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; safe: boolean; modelUsed: string };
      expect(data.ok).toBe(true);
      expect(data.safe).toBe(true);
      expect(data.modelUsed).toContain("llama-guard");
    });

    it("generates battle quotes between challenger and king using Nemotron", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/ai/battle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenger: "Linear",
            incumbent: "Cursor",
            amountCents: 500,
          }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; quote: string; modelUsed: string };
      expect(data.ok).toBe(true);
      expect(data.quote.length).toBeGreaterThan(0);
      expect(data.quote).toContain("Linear");
      // Zero emojis
      expect(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(data.quote)).toBe(false);
    });

    it("generates sector mindshare intelligence reports using Nemotron 70B", async () => {
      const res = await handleBoardRequest(
        new Request("https://adverticeaf.com/v1/ai/sectors", { method: "GET" }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; report: string; topSector: string; modelUsed: string };
      expect(data.ok).toBe(true);
      expect(data.report.length).toBeGreaterThan(0);
      expect(data.topSector).toBeDefined();
      expect(data.modelUsed).toContain("nemotron-70b");
      // Zero emojis
      expect(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(data.report)).toBe(false);
    });
  });
});
