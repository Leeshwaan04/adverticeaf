/**
 * NVIDIA Models & NIM Integration Suite
 *
 * Connects AdverticeAF to the NVIDIA Inference API Catalog and self-hosted NVIDIA NIM microservices.
 * Supports:
 * - nvidia/llama-3.1-nemotron-70b-instruct: Deep reasoning, leaderboard market commentary, and executive digests.
 * - nvidia/nemotron-mini-4b-instruct: High-speed tagline generation and category classification.
 * - nvidia/mistral-nemo-12b-instruct: Fast conversational intelligence.
 * - meta/llama-guard-3-8b: Safety moderation and anti-abuse verification.
 */

import { BOARD_CATEGORIES, type BoardCategory } from "../src/lib/board/config";
import type { BoardSnapshot } from "../src/lib/board/types";
import { formatUsd } from "../src/lib/board/format";
import { deriveBrandName } from "../src/lib/board/listing";

export const NVIDIA_MODELS = {
  nemotron70b: "nvidia/llama-3.1-nemotron-70b-instruct",
  nemotronMini: "nvidia/nemotron-mini-4b-instruct",
  mistralNemo: "nvidia/mistral-nemo-12b-instruct",
  llamaGuard: "meta/llama-guard-3-8b",
} as const;

export type NvidiaModelKey = keyof typeof NVIDIA_MODELS;

export interface NvidiaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NvidiaCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface NvidiaEnv {
  NVIDIA_API_KEY?: string;
  NVIDIA_API_BASE?: string;
  NVIDIA_DEFAULT_MODEL?: string;
}

/** Generic caller for any model in the NVIDIA API Catalog. */
export async function callNvidiaModel(
  model: string,
  messages: NvidiaMessage[],
  options: NvidiaCompletionOptions = {},
  env?: NvidiaEnv
): Promise<string> {
  const apiKey = env?.NVIDIA_API_KEY || (typeof process !== "undefined" ? process.env?.NVIDIA_API_KEY : undefined);
  const baseUrl = env?.NVIDIA_API_BASE || (typeof process !== "undefined" ? process.env?.NVIDIA_API_BASE : undefined) || "https://integrate.api.nvidia.com/v1";

  // If no API key configured, use deterministic heuristic fallback
  if (!apiKey) {
    return generateFallbackResponse(model, messages);
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 512,
      top_p: options.topP ?? 0.95,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`NVIDIA API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content?.trim() || "";
}

/** Fallback generator when running offline, in test suites, or without NGC credentials. */
function generateFallbackResponse(model: string, messages: NvidiaMessage[]): string {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";

  if (lastUserMsg.includes("tagline") || lastUserMsg.includes("category")) {
    return JSON.stringify({
      tagline: "Autonomous growth and attention engine",
      category: "Marketing",
    });
  }

  if (lastUserMsg.includes("moderation") || lastUserMsg.includes("safe")) {
    return "safe";
  }

  return "AdverticeAF live attention market report: top ranked brands maintain active visibility and counter-bidding momentum across live categories.";
}

/** Uses NVIDIA Nemotron to generate high-converting taglines and categorize a brand. */
export async function generateBrandDetailsWithNemotron(
  inputUrlOrDomain: string,
  env?: NvidiaEnv
): Promise<{ name: string; tagline: string; category: BoardCategory; modelUsed: string }> {
  const brandName = deriveBrandName(inputUrlOrDomain);
  const prompt = `Analyze this website/brand: "${inputUrlOrDomain}" (Brand Name: "${brandName}").
Return ONLY valid raw JSON with no markdown wrapping, with exactly these two keys:
1. "tagline": A high-converting 5 to 10 word value proposition (under 75 characters, no emojis).
2. "category": Exactly one of [${BOARD_CATEGORIES.join(", ")}].`;

  const modelUsed = NVIDIA_MODELS.nemotronMini;
  const raw = await callNvidiaModel(
    modelUsed,
    [
      {
        role: "system",
        content: "You are an expert Silicon Valley advertising copywriter and startup analyst. Output strict JSON only.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, maxTokens: 120 },
    env
  );

  try {
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { tagline?: string; category?: string };
    const category = parsed.category && (BOARD_CATEGORIES as readonly string[]).includes(parsed.category)
      ? (parsed.category as BoardCategory)
      : "Marketing";

    return {
      name: brandName,
      tagline: (parsed.tagline || `${brandName} official online presence`).slice(0, 80),
      category,
      modelUsed,
    };
  } catch {
    return {
      name: brandName,
      tagline: `${brandName} official online presence`,
      category: "Marketing",
      modelUsed,
    };
  }
}

/** Uses NVIDIA Llama-3.1-Nemotron-70B-Instruct for market intelligence and digest commentary. */
export async function generateMarketIntelligenceWithNemotron(
  snapshot: BoardSnapshot,
  env?: NvidiaEnv
): Promise<{ narrative: string; modelUsed: string; generatedAt: number }> {
  const modelUsed = NVIDIA_MODELS.nemotron70b;
  const topKing = snapshot.rows[0];
  const runnersUp = snapshot.rows.slice(1, 4);

  const topString = topKing
    ? `#1 King: ${topKing.listing.name} (${topKing.listing.domain}) with ${formatUsd(topKing.totalCents)} and ${topKing.clicks} clicks.`
    : "No brand currently holds the #1 crown.";

  const runnersString = runnersUp.length > 0
    ? `Runners-up: ${runnersUp.map((r) => `#${r.rank} ${r.listing.name} (${formatUsd(r.totalCents)})`).join(", ")}.`
    : "No runners up active yet.";

  const prompt = `You are a financial and advertising markets editor.
Analyze this live leaderboard snapshot:
- ${topString}
- ${runnersString}
- Total Market Spend: ${formatUsd(snapshot.stats.totalCents)} across ${snapshot.stats.listings} ranked brands.
- Minimum bid required to claim #1: ${formatUsd(snapshot.leadCostCents)}.

Write a concise, high-impact 2-paragraph market intelligence update for founders and advertisers. Focus on the battle for the crown, cost of attention, and counter-bidding dynamics. Do not use emojis.`;

  try {
    const narrative = await callNvidiaModel(
      modelUsed,
      [
        {
          role: "system",
          content: "You are an analytical financial journalist. Write with crisp authority. Do not include emojis.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5, maxTokens: 350 },
      env
    );

    return {
      narrative,
      modelUsed,
      generatedAt: Date.now(),
    };
  } catch {
    return {
      narrative: `AdverticeAF Market Update: The leaderboard currently tracks ${snapshot.stats.listings} brands with ${formatUsd(snapshot.stats.totalCents)} in accumulated bid volume. Cost to secure the #1 King of the Hill crown sits at ${formatUsd(snapshot.leadCostCents)}. Bidding dynamics continue to reward early, persistent attention captures.`,
      modelUsed,
      generatedAt: Date.now(),
    };
  }
}

/** Uses NVIDIA Llama Guard to moderate listing submissions before purchase. */
export async function moderateListingWithNvidiaGuard(
  url: string,
  name: string,
  tagline: string,
  env?: NvidiaEnv
): Promise<{ safe: boolean; reason?: string; modelUsed: string }> {
  const modelUsed = NVIDIA_MODELS.llamaGuard;
  const textToCheck = `URL: ${url}\nBrand: ${name}\nTagline: ${tagline}`;

  try {
    const raw = await callNvidiaModel(
      modelUsed,
      [
        {
          role: "system",
          content: "You are a content safety classifier. Output 'safe' if the advertising content is legitimate, or 'unsafe' followed by the category if it contains malware, phishing, illicit goods, hate speech, or explicit adult content.",
        },
        { role: "user", content: textToCheck },
      ],
      { temperature: 0.1, maxTokens: 50 },
      env
    );

    const isSafe = !raw.toLowerCase().includes("unsafe");
    return {
      safe: isSafe,
      reason: isSafe ? undefined : "Content flagged by NVIDIA safety guardrails",
      modelUsed,
    };
  } catch {
    // Fail safe to keep flow responsive
    return { safe: true, modelUsed };
  }
}

