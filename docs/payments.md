# Payments (Razorpay on Cloudflare Pages)

Payments run as **Cloudflare Pages Functions** next to the static site (`functions/`). The browser never sees the secret key and never sets a price.

## How a payment works

1. Browser: `POST /api/payments/create-order` with a product (`sku`) and, for a Spotlight, the campaign details.
   The **server** looks up the price (`functions/_lib/catalog.ts`), validates the campaign, refuses if it has nowhere to store it, and creates a Razorpay order.
2. Browser opens Razorpay Checkout (the script is loaded only now) and the buyer pays.
3. Browser: `POST /api/payments/verify`. The server checks the signature, **re-reads the order and payment from Razorpay**, captures if needed, confirms amount and currency, then publishes the promotion.
4. Razorpay also calls `POST /api/payments/webhook`. This is the source of truth if the buyer closes the tab before step 3. Both paths are idempotent.
5. `GET /api/promoted` serves the live Spotlight to everyone. Spotlights run one at a time in the order they were paid for.

`GET /api/payments/config` tells the UI what is available (configured, test or live, storage bound) so buyers never fill in a form for something that cannot be sold.

## Setup (once)

### 1. Razorpay
- Dashboard, **Test mode**: Account & Settings, API Keys, generate a key pair. Live keys only after KYC and activation.
- **International / USD payments** must be enabled on the account. Test keys do not prove this will be approved for live. Set `RAZORPAY_CURRENCY=INR` to fall back to rupees.
- Webhook: Settings, Webhooks, add `https://adverticeaf.com/api/payments/webhook` with a **secret you choose**, and subscribe to `payment.captured` and `order.paid`.

### 2. Cloudflare Pages (project adverticeaf)
- **Settings, Variables and Secrets** (Production, and Preview if you want previews to take test payments). Add as **secrets**:
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Plain variable: `RAZORPAY_CURRENCY` (default `USD`).
- **Settings, Bindings**: add a **KV namespace** binding named `PAYMENTS` (create the namespace first under Workers & Pages, KV). Without it the server refuses to sell Spotlights.
- Do not commit a `wrangler.toml` that defines bindings: Cloudflare would then treat the file as the source of truth and ignore the dashboard.
- Redeploy after changing variables.

### 3. Go live safely
Use **test** keys first. Verify the whole flow on `/pay/test` (a `$1` product the server only sells with test keys), then buy a Spotlight in test mode and confirm it shows on `/campaigns` from a second browser. Only then swap in live keys and the live webhook secret.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in TEST keys; this file is git-ignored
npm run build
npx wrangler pages dev out --port 8799 --kv PAYMENTS --compatibility-date=2025-09-01
```
Open `http://localhost:8799/pay/test`. Local KV is simulated and stored in `.wrangler/` (git-ignored).

## Safeguards

| Risk | Defence |
| --- | --- |
| Buyer edits the price | The price comes from the server catalog; a client amount is ignored except inside a range the server enforces |
| Forged payment confirmation | HMAC signature, then re-read from Razorpay, then amount and currency must match |
| Forged webhook | Signature over the raw body; the event is re-checked against Razorpay |
| Paid but not delivered | Spotlight orders are refused unless KV storage is bound |
| Double click or retry | Idempotency key; a changed campaign creates a new order |
| Replay | Fulfilment is idempotent: one promotion per order |
| Abuse | Origin check, JSON only, body size limits, link and text validation |
| Secret exposure | Only in Cloudflare secrets or `.dev.vars`; never returned or logged |

All of these are covered by tests in `functions/` (`npm test`).

## Known limits
- KV is not transactional. The queue is computed on read from one key per order, so there are no lost updates, but a Durable Object or D1 would suit higher volume.
- No automatic refunds or admin screen yet: refund in the Razorpay dashboard.
- Add a Cloudflare rate-limiting rule for `/api/payments/*` (Security, WAF).
- Spotlight content is checked automatically (links, text, categories) but no person reviews it before it goes live. Decide whether you want a review step.
- The Board is not wired to payments yet; its `bid` product is disabled in the catalog until it has a backend.
