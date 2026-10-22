import { describe, it, expect } from "vitest";
import { handleBoardRequest, type BoardEnv } from "../../../server/board";

describe("Server Board API Endpoints", () => {
  it("GET /v1/board returns live snapshot with rankings and stats", async () => {
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
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.rows[0].rank).toBe(1);
    expect(data.leadCostCents).toBeGreaterThanOrEqual(100);
    expect(data.stats.listings).toBeGreaterThanOrEqual(data.rows.length);
  });

  it("POST /v1/quote calculates rank projections correctly", async () => {
    const req = new Request("https://adverticeaf.com/v1/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "sypha.ai",
        amountCents: 500000,
      }),
    });

    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; newRank: number; tookLead: boolean };
    expect(data.ok).toBe(true);
    expect(data.newRank).toBe(1);
    expect(data.tookLead).toBe(true);
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

  it("POST /v1/alerts rejects invalid inputs", async () => {
    const req = new Request("https://adverticeaf.com/v1/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "",
        email: "not-an-email",
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

  it("GET /v1/og generates branded 1200x630 vector SVG share card", async () => {
    const req = new Request("https://adverticeaf.com/v1/og?domain=sypha.ai&name=Sypha+AI&rank=1&spent=%242%2C500", {
      method: "GET",
    });
    const res = await handleBoardRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

    const svg = await res.text();
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain("Sypha AI");
    expect(svg).toContain("KING OF THE HILL");
    expect(svg).toContain("$2,500");
    expect(svg).toContain("adverticeaf.com/board");
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
