export const PLATFORMS = ["Short video", "Social feed", "Search or X"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface Criterion {
  id: string;
  title: string;
  weight: number;
  pass: boolean;
  passNote: string;
  tip: string;
}

export interface HookResult {
  score: number;
  label: "Strong" | "Decent" | "Needs work";
  passed: number;
  criteria: Criterion[];
  platformTip?: string;
}

const GENERIC_CLAIMS = [
  "high quality", "high-quality", "best-in-class", "all-in-one", "solution", "innovative", "cutting-edge",
  "revolutionary", "world-class", "state-of-the-art", "game-changing", "next-level", "premium quality",
];
const WEAK_OPENERS = ["introducing", "welcome", "we are", "we're", "our ", "buy ", "the best", "looking for", "are you looking"];
const TENSION_WORDS = [
  "why", "how", "stop", "never", "mistake", "secret", "truth", "without", "before", "instead", "wrong",
  "actually", "nobody", "stopped", "quit", "myth", "really", "worst", "regret",
];

const MAX_WORDS: Record<Platform, number> = { "Short video": 14, "Social feed": 20, "Search or X": 12 };

const PLATFORM_TIPS: Record<Platform, string> = {
  "Short video": "For short video, the first two seconds decide whether people stay. Say or show the hook immediately, with on-screen text.",
  "Social feed": "In a feed, the first line is often cut off. Put the hook in the first 8 to 10 words.",
  "Search or X": "Search headlines are length-limited and read literally. Lead with the specific thing people typed or care about.",
};

export function scoreHook(raw: string, platform: Platform): HookResult | null {
  const text = raw.trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3) return null;

  const lower = text.toLowerCase();
  const maxWords = MAX_WORDS[platform];

  const criteria: Criterion[] = [
    {
      id: "length",
      title: `Short enough to take in at a glance (${maxWords} words or fewer)`,
      weight: 15,
      pass: words.length <= maxWords,
      passNote: `${words.length} words. Easy to scan.`,
      tip: `${words.length} words is long for ${platform.toLowerCase()}. Cut to the single idea that earns the next second of attention.`,
    },
    {
      id: "opener",
      title: "Opens with something concrete, not a generic opener",
      weight: 15,
      pass: !WEAK_OPENERS.some((w) => lower.startsWith(w)),
      passNote: "The opening words do not rely on a stock phrase.",
      tip: "Openers like 'Introducing', 'Our' or 'Buy' talk about you. Start with the viewer's problem, result or a surprising fact instead.",
    },
    {
      id: "viewer",
      title: "Speaks to the viewer (you, your)",
      weight: 15,
      pass: /\b(you|your|you're|you'll)\b/.test(lower),
      passNote: "Addresses the viewer directly.",
      tip: "Hooks that say 'you' or 'your' make it personal. Try rewriting from the viewer's point of view.",
    },
    {
      id: "specific",
      title: "Contains a specific detail (a number or a named thing)",
      weight: 15,
      pass: /\d/.test(text),
      passNote: "Includes a number, which makes the claim feel concrete.",
      tip: "Specifics beat adjectives. Add a real number, timeframe or named detail, such as '3 weeks' instead of 'quickly'.",
    },
    {
      id: "tension",
      title: "Creates curiosity or tension",
      weight: 20,
      pass: text.includes("?") || TENSION_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower)),
      passNote: "Raises a question or tension that makes people want the next line.",
      tip: "Nothing here makes the reader want the next line. Pose a question, name a common mistake, or state a surprising contrast.",
    },
    {
      id: "generic",
      title: "Avoids generic claims (high quality, all-in-one, solution)",
      weight: 20,
      pass: !GENERIC_CLAIMS.some((w) => lower.includes(w)),
      passNote: "No stock marketing phrases found.",
      tip: "Phrases like 'high quality' or 'all-in-one' are what every competitor says. Replace them with proof or a concrete benefit.",
    },
  ];

  const score = criteria.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0);
  const label = score >= 80 ? "Strong" : score >= 55 ? "Decent" : "Needs work";

  return {
    score,
    label,
    passed: criteria.filter((c) => c.pass).length,
    criteria,
    platformTip: PLATFORM_TIPS[platform],
  };
}

export interface Template {
  name: string;
  template: string;
  why: string;
}

export function rewriteTemplates(): Template[] {
  return [
    {
      name: "Name the mistake",
      template: "The [number] mistakes [your audience] make with [problem], and the fix that took [timeframe].",
      why: "Specific numbers plus an implied error give people a reason to keep reading.",
    },
    {
      name: "Outcome without the pain",
      template: "[Result they want], without [thing they dread].",
      why: "Pairs a desirable outcome with a removed obstacle. Make sure your product really delivers both.",
    },
    {
      name: "Contrarian opener",
      template: "Stop [common habit]. Here is what [credible group] do instead.",
      why: "Challenges a habit to create tension. Back it with a real source or result before you publish.",
    },
  ];
}
