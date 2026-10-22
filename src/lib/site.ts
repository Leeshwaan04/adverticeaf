/**
 * Single source of truth for facts about the site and the business.
 *
 * Nothing here is invented. Anything we cannot state truthfully stays empty,
 * and the UI hides the section that depends on it rather than showing a
 * placeholder. Fill these in as real information becomes available.
 */

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  linkedin?: string;
}

export const SITE = {
  name: "AdverticeAF",
  url: "https://adverticeaf.com",
  description:
    "The public pay-to-rank advertising board and digital attention marketplace. Top spenders claim rank #1, gain viral visibility, and earn direct high-intent traffic.",

  /** Date the board rules and policy pages were last reviewed (ISO). */
  lastReviewed: "2026-10-22",

  formEndpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@adverticeaf.com",

  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "AdverticeAF Inc.",
  location: process.env.NEXT_PUBLIC_LOCATION ?? "Remote",

  team: [] as TeamMember[],
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
