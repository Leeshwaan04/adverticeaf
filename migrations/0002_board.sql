-- AdverticeAF Board Database Schema

CREATE TABLE IF NOT EXISTS board_listings (
  domain TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  tagline TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS board_bids (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS board_bids_domain_at ON board_bids(domain, created_at);
CREATE INDEX IF NOT EXISTS board_bids_at ON board_bids(created_at);

CREATE TABLE IF NOT EXISTS board_clicks (
  domain TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS board_alerts (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS board_alerts_domain ON board_alerts(domain);

CREATE TABLE IF NOT EXISTS board_verifications (
  domain TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
