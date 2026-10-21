CREATE TABLE promotion_orders (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('test_mode', 'live_mode')),
  plan TEXT NOT NULL CHECK (plan IN ('24h', '7d')),
  product_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  campaign_json TEXT NOT NULL,
  session_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE promotion_placements (
  order_id TEXT PRIMARY KEY REFERENCES promotion_orders(id),
  payment_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  CHECK (ends_at > starts_at)
);
CREATE INDEX promotion_schedule ON promotion_placements(mode, starts_at, ends_at);

-- A tombstone also prevents late success events from reactivating refunded payments.
CREATE TABLE revoked_payments (
  payment_id TEXT PRIMARY KEY,
  revoked_at INTEGER NOT NULL
);

CREATE TABLE payment_webhooks (
  id TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

CREATE TABLE checkout_limits (
  key TEXT PRIMARY KEY,
  bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
