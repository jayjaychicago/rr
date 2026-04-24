CREATE TABLE IF NOT EXISTS profiles (
  diner_external_id TEXT PRIMARY KEY,
  name              TEXT,
  phone             TEXT,
  dietary_notes     TEXT,
  marketing_opt_in  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
