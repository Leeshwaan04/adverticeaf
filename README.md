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

The site is a static export (output directory `out`, Node 22) deployed by **Cloudflare Pages' Git integration**: every push to `main` deploys to production and every pull request gets a preview URL. Security headers are in `public/_headers`.

`.github/workflows/ci.yml` is a CI check only: it runs lint and the production build on every push and pull request. It does not deploy. Cloudflare deploys independently, so to stop a failing lint from reaching production, require the "Code Quality & Build Validation" check in the branch protection rules for `main`.

## Paid promotions (Dodo Payments)

Campaign spotlights are paid placements processed by [Dodo Payments](https://www.dodopayments.com), a merchant of record that handles tax, VAT, and chargebacks. The site uses Cloudflare Pages Functions (`/api/payments/*`) with a D1 database for order tracking and placement scheduling.

### Setup (one-time, in Dodo dashboard)

1. Create a **Business** in Dodo and note the `business_id`.
2. Create two **Products** (one-time, USD, tax-inclusive, no PWYP, no PPP, no discount):
   - **24h Spotlight** — $29.00
   - **7-Day Hero Pin** — $79.00
   - Note each product's `product_id`.
3. Create a **Webhook endpoint** at `https://<your-site>.pages.dev/api/payments/webhook` subscribed to:
   - `payment.succeeded`
   - `refund.succeeded`
   - `dispute.created`, `dispute.submitted`, `dispute.escalated`, `dispute.closed`
   - Check **Unwrap payload** so events arrive as `{ type, data: { payment_id } }`.
4. Copy the **Webhook secret** (`whsec_...`).
5. In your Dodo account, generate an **API key** (full access).

### Cloudflare Pages configuration

In the Cloudflare Pages project:

- **Environment variables** (per environment): set the variables below. See `.dev.vars.example` for a local development template.
- **D1 database binding**: create a D1 database (e.g. `promotions_db`), then in Pages → Functions → D1 Bindings, map the binding name `PROMOTIONS_DB` to that database.
- **Run migrations**: from the Cloudflare dashboard or CLI:
  ```bash
  wrangler d1 migrations apply promotions_db --env production
  ```

### Environment variables (Pages runtime, not `NEXT_PUBLIC_`)

| Variable | Purpose |
| --- | --- |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` or `live_mode`. |
| `DODO_PAYMENTS_API_KEY` | Dodo API key (Bearer token for server-to-server calls). |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Webhook verification secret (`whsec_...`). |
| `DODO_BUSINESS_ID` | Dodo business ID. |
| `DODO_PRODUCT_24H` | Product ID for the $29 / 24-hour plan. |
| `DODO_PRODUCT_7D` | Product ID for the $79 / 7-day plan. |
| `PAYMENTS_SITE_URL` | Canonical site URL (e.g. `https://adverticeaf.com`). Used for return/cancel URLs and origin validation. |
| `DODO_LIVE_APPROVED` | Must be `true` to enable live-mode checkout. Set only after Dodo approves the account. |

### Security notes

- Webhook delivery is verified with Standard Webhooks HMAC-SHA256 (300 s tolerance). Unverified events are rejected before any database write.
- Checkout sessions are rate-limited to 10 per 10 minutes per IP (using Cloudflare's `cf-connecting-ip`, which cannot be spoofed by the client).
- Live mode is hard-disabled until `DODO_LIVE_APPROVED=true` and all required variables are present.
- Payment data (card details) never touches this site; Dodo's hosted checkout page handles payment entry.
- Refund and dispute webhooks automatically revoke the corresponding placement via a tombstone table, preventing a refunded campaign from remaining visible.

### Local development

```bash
cp .dev.vars.example .dev.vars
# Fill in test-mode values
wrangler pages dev --d1 promotions_db=@local
```

The test-mode host (`test.dodopayments.com`) and test checkout host (`test.checkout.dodopayments.com`) are used automatically when `DODO_PAYMENTS_ENVIRONMENT=test_mode`.
