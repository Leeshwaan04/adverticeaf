# AdverticeAF (adverticeaf.com)

A creative lab and a source-linked directory of creative and social-first ad agencies, with two free tools: a Hook Checker and a Budget Planner.

## Principles

- **Nothing unverifiable is presented as fact.** Every directory fact links to a public source, self-reported claims are labelled, and disagreements between sources are shown. There are no ratings, rankings or "verified" badges because there is no process behind them.
- **Forms never claim success unless something was handed off.** See `src/lib/lead.ts`.
- **The tools are honest about what they are.** The Hook Checker is a rule-based checklist (not AI). The Budget Planner is a transparent model with editable assumptions (not a forecast).

## Tech stack

Next.js 16 (App Router, static export) · React 19 · Tailwind CSS v4 · TypeScript · Lucide icons · `next/font` (self-hosted Inter and Space Grotesk).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build    # static export to ./out
```

Node 20 or newer.

## Configuration

Facts about the business live in `src/lib/site.ts`. Anything that is not known stays empty and the UI hides what depends on it.

| Variable (build time) | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FORM_ENDPOINT` | URL that accepts a JSON `POST` (Formspree, a Cloudflare Pages Function, etc.). Used by the contact and listing forms. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public contact address. Shown in the footer, contact page and privacy policy, and used as a `mailto:` fallback. |
| `NEXT_PUBLIC_LEGAL_ENTITY` | Registered business name. Shown in the footer and legal pages. |
| `NEXT_PUBLIC_LOCATION` | Where the business is based. Shown on the contact page. |

With neither a form endpoint nor a contact email set, the forms tell visitors that nothing was sent. Set at least one before launch. `NEXT_PUBLIC_*` values are inlined at build, so set them in the CI and Cloudflare build environment.

Named team members go in `SITE.team` in `src/lib/site.ts`. The About page shows the section only when it has entries.

## Project structure

```
src/
  app/
    page.tsx                 Home: hero, Hook Checker, directory teaser, formats, planner, services, FAQ
    agencies/                Directory (URL-synced filters) and /agencies/[slug] profile pages
    about, contact, methodology, privacy, terms
    sitemap.ts, robots.ts    Static metadata routes
  components/
    ui/                      Button, Modal (native <dialog>), Field, Section
    HookChecker, BudgetPlanner, DirectoryExplorer, AgencyCard, ...
  data/agencies.ts           Directory data with per-fact sources
  lib/                       site config, lead submission, validation, hook scoring
```

## Updating the directory

Edit `src/data/agencies.ts`. Each fact needs a `source`. Put disagreements in `notes`, set `lastVerified`, and do not add ratings or unsourced claims. See `/methodology` for the editorial rules.

## Deployment

Static export deployed to Cloudflare Pages by `.github/workflows/deploy.yml` (output directory `out`, Node 22). Security headers are in `public/_headers`.
