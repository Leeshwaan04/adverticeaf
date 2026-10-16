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
    "A creative lab and a curated, source-linked directory of creative and social-first ad agencies, with free tools to check an ad hook and plan a media budget.",

  /** Date the directory data and policy pages were last reviewed (ISO). */
  lastReviewed: "2026-10-16",

  /**
   * Where form submissions go. Set at build time (NEXT_PUBLIC_* values are inlined).
   *  - NEXT_PUBLIC_FORM_ENDPOINT: a URL that accepts a JSON POST (Formspree, Cloudflare Pages Function, etc.)
   *  - NEXT_PUBLIC_CONTACT_EMAIL: public contact address, also used as a mailto fallback
   */
  formEndpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",

  /** Registered business name and place of registration. Leave empty until confirmed. */
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "",
  location: process.env.NEXT_PUBLIC_LOCATION ?? "",

  /** Named people behind the site. The About page shows this section only when non-empty. */
  team: [] as TeamMember[],
} as const;

export const NAV_LINKS = [
  { href: "/#hook-checker", label: "Hook Checker" },
  { href: "/agencies", label: "Agency Directory" },
  { href: "/#planner", label: "Budget Planner" },
  { href: "/#services", label: "Services" },
  { href: "/about", label: "About" },
] as const;
