import { describe, it, expect, beforeEach } from "vitest";
import { handleBoardRequest, resetBoardMemoryForTesting, type BoardEnv } from "../../../server/board";

describe("Server Board API Endpoints & VAPT Security", () => {
  beforeEach(() => {
    resetBoardMemoryForTesting();
  });

  it("GET /v1/board returns clean slate live snapshot from scratch", async () => {
    const req = new Request("https://adverticeaf.com/v1/board", { method: "GET" });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");

    const data = (await res.json()) as {
      season: string;
      rows: Array<{ rank: number; listing: { domain: string; name: string } }>;
      stats: { listings: number; totalCents: number };
      leadCostCents: number;
      mode: string;
    };

    expect(data.mode).toBe("live");
    expect(data.rows.length).toBe(0);
    expect(data.leadCostCents).toBe(100);
    expect(data.stats.listings).toBe(0);
  });

  it("POST /v1/quote calculates rank projections correctly for new listings", async () => {
    const req = new Request("https://adverticeaf.com/v1/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "mybrand.com",
        amountCents: 500,
      }),
    });

    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      domain: string;
      newRank: number;
      amountCents: number;
      costToLeadCents: number;
      tookLead: boolean;
    };
    expect(data.ok).toBe(true);
    expect(data.domain).toBe("mybrand.com");
    expect(data.amountCents).toBe(500);
    expect(data.costToLeadCents).toBe(100);
    expect(data.newRank).toBe(1);
    expect(data.tookLead).toBe(true);
  });

  it("GET /v1/events connects to live Server-Sent Events stream", async () => {
    const req = new Request("https://adverticeaf.com/v1/events", { method: "GET" });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(res.body).not.toBeNull();
  });

  it("POST /v1/alerts registers an email for outbid alerts", async () => {
    const req = new Request("https://adverticeaf.com/v1/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "sypha.ai",
        email: "founder@sypha.ai",
      }),
    });

    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; message: string };
    expect(data.ok).toBe(true);
    expect(data.message).toContain("founder@sypha.ai");
  });

  it("VAPT: POST /v1/alerts rejects CRLF injection and invalid emails", async () => {
    const req = new Request("https://adverticeaf.com/v1/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "sypha.ai",
        email: "attacker@evil.com\r\nBcc: victim@target.com",
      }),
    });

    const res = await handleBoardRequest(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
  });

  it("GET /v1/verification returns DNS TXT and HTML meta instructions", async () => {
    const req = new Request("https://adverticeaf.com/v1/verification?domain=sypha.ai", { method: "GET" });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      verified: boolean;
      token: string;
      methods: Array<{ type: string; value: string }>;
    };

    expect(data.token.startsWith("adv_")).toBe(true);
    expect(data.methods.length).toBe(2);
    const dnsMethod = data.methods.find((m) => m.type === "dns");
    const metaMethod = data.methods.find((m) => m.type === "meta");
    expect(dnsMethod?.value).toContain(data.token);
    expect(metaMethod?.value).toContain(data.token);
  });

  it("VAPT: SSRF protection blocks localhost, private IPs and cloud metadata", async () => {
    const ssrfTargets = ["localhost", "127.0.0.1", "169.254.169.254", "internal.corp"];
    for (const target of ssrfTargets) {
      const req = new Request(`https://adverticeaf.com/v1/verification?domain=${target}`, { method: "GET" });
      const res = await handleBoardRequest(req);
      expect(res.status).toBe(400);
    }
  });

  it("GET /v1/og generates branded 1200x630 vector SVG share card with XML escaping", async () => {
    const req = new Request("https://adverticeaf.com/v1/og?domain=sypha.ai&name=Sypha+%3Cscript%3E&rank=1&spent=%242%2C500", {
      method: "GET",
    });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

    const svg = await res.text();
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain("Sypha &lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("KING OF THE HILL");
  });

  it("GET /api/og route also generates SVG card via /api prefix", async () => {
    const req = new Request("https://adverticeaf.com/api/og?domain=acme.com&rank=3&name=Acme+Corp", {
      method: "GET",
    });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

    const svg = await res.text();
    expect(svg).toContain("Acme Corp");
    expect(svg).toContain("#3 RANK ON BOARD");
  });

  it("D1 Database bindings execute queries when PROMOTIONS_DB is provided", async () => {
    const executedStatements: string[] = [];

    const mockDb = {
      prepare(sql: string) {
        executedStatements.push(sql.trim());
        const runner = {
          async first<T>() {
            return { cnt: 5 } as T;
          },
          async all<T>() {
            return { results: [] } as { results: T[] };
          },
          async run() {
            return { success: true };
          },
        };
        return {
          bind(...values: unknown[]) {
            void values;
            return runner;
          },
          ...runner,
        };
      },
    };

    const env: BoardEnv = {
      PROMOTIONS_DB: mockDb,
      DODO_PAYMENTS_API_KEY: "test_key",
      DODO_PRODUCT_ID: "test_product",
    };

    const req = new Request("https://adverticeaf.com/v1/board", { method: "GET" });
    const res = await handleBoardRequest(req, env);
    expect(res.status).toBe(200);
    expect(executedStatements.some((s) => s.includes("board_listings"))).toBe(true);
  });
});
