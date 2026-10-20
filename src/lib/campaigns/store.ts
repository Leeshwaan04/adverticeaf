import { CAMPAIGNS_SEED, type Campaign } from "@/data/campaigns";

const UPVOTES_KEY = "adv_campaign_upvotes_v1";
const USER_CAMPAIGNS_KEY = "adv_user_campaigns_v1";
const PROMOTED_KEY = "adv_promoted_campaign_v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getUpvotedIds(): string[] {
  const store = getStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(UPVOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUserCampaigns(): Campaign[] {
  const store = getStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(USER_CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getPromotedCampaign(): Campaign {
  const store = getStorage();
  if (store) {
    try {
      const raw = store.getItem(PROMOTED_KEY);
      if (raw) {
        const item: Campaign = JSON.parse(raw);
        const upvoted = new Set(getUpvotedIds());
        return {
          ...item,
          initialUpvotes: item.initialUpvotes + (upvoted.has(item.id) ? 1 : 0),
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Default spotlight campaign if none promoted by user yet
  const fallback = CAMPAIGNS_SEED[0];
  const upvoted = new Set(getUpvotedIds());
  return {
    ...fallback,
    promoted: true,
    badge: "Campaign of the Day",
    initialUpvotes: fallback.initialUpvotes + (upvoted.has(fallback.id) ? 1 : 0),
  };
}

export function getAllCampaigns(): Campaign[] {
  const userList = getUserCampaigns();
  const upvoted = new Set(getUpvotedIds());

  // Merge seed campaigns and user campaigns, avoiding duplicates
  const all = [...userList, ...CAMPAIGNS_SEED];

  return all.map((c) => ({
    ...c,
    // If the current user upvoted, reflect the +1
    initialUpvotes: c.initialUpvotes + (upvoted.has(c.id) ? 1 : 0),
  }));
}

export function getCampaignBySlug(slug: string): Campaign | undefined {
  const all = getAllCampaigns();
  return all.find((c) => c.slug === slug || c.id === slug);
}

export function isCampaignUpvoted(id: string): boolean {
  const ids = getUpvotedIds();
  return ids.includes(id);
}

export function toggleCampaignUpvote(id: string): { upvoted: boolean } {
  const store = getStorage();
  if (!store) return { upvoted: false };

  const ids = getUpvotedIds();
  const exists = ids.includes(id);
  const next = exists ? ids.filter((x) => x !== id) : [...ids, id];

  try {
    store.setItem(UPVOTES_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("Failed to persist upvote:", err);
  }

  return { upvoted: !exists };
}

export function saveUserCampaign(
  campaignData: Omit<Campaign, "id" | "slug" | "initialUpvotes" | "launchedAt">
): Campaign {
  const store = getStorage();
  const slug = campaignData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `user-${Date.now()}-${slug}`;

  const newCampaign: Campaign = {
    ...campaignData,
    id,
    slug,
    initialUpvotes: 1, // Submitter auto-upvotes
    launchedAt: new Date().toISOString(),
  };

  if (store) {
    try {
      const current = getUserCampaigns();
      store.setItem(USER_CAMPAIGNS_KEY, JSON.stringify([newCampaign, ...current]));
      // Automatically add to upvoted list
      const upvotes = getUpvotedIds();
      if (!upvotes.includes(id)) {
        store.setItem(UPVOTES_KEY, JSON.stringify([...upvotes, id]));
      }
    } catch (err) {
      console.error("Failed to save campaign:", err);
    }
  }

  return newCampaign;
}

export function saveAndPromoteCampaign(
  campaignData: Omit<Campaign, "id" | "slug" | "initialUpvotes" | "launchedAt">,
  plan: "24h" | "7d"
): Campaign {
  const store = getStorage();
  const slug = campaignData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `promoted-${Date.now()}-${slug}`;

  const durationMs = plan === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const promotedUntil = new Date(Date.now() + durationMs).toISOString();

  const newCampaign: Campaign = {
    ...campaignData,
    id,
    slug,
    initialUpvotes: 25, // Starting boost for promoted tier
    launchedAt: new Date().toISOString(),
    promoted: true,
    promotedUntil,
    badge: "Promoted",
  };

  if (store) {
    try {
      // Save to promoted slot
      store.setItem(PROMOTED_KEY, JSON.stringify(newCampaign));

      // Also append to user campaigns list
      const current = getUserCampaigns();
      store.setItem(USER_CAMPAIGNS_KEY, JSON.stringify([newCampaign, ...current]));

      // Upvote
      const upvotes = getUpvotedIds();
      if (!upvotes.includes(id)) {
        store.setItem(UPVOTES_KEY, JSON.stringify([...upvotes, id]));
      }
    } catch (err) {
      console.error("Failed to save promoted campaign:", err);
    }
  }

  return newCampaign;
}

export function promoteExistingCampaign(campaignId: string, plan: "24h" | "7d"): Campaign | null {
  const all = getAllCampaigns();
  const target = all.find((c) => c.id === campaignId || c.slug === campaignId);
  if (!target) return null;

  const durationMs = plan === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const promotedUntil = new Date(Date.now() + durationMs).toISOString();

  const promotedItem: Campaign = {
    ...target,
    promoted: true,
    promotedUntil,
    badge: "Promoted",
    initialUpvotes: target.initialUpvotes + 15,
  };

  const store = getStorage();
  if (store) {
    try {
      store.setItem(PROMOTED_KEY, JSON.stringify(promotedItem));
    } catch (err) {
      console.error("Failed to promote existing campaign:", err);
    }
  }

  return promotedItem;
}

