-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

-- restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9-]+$'),
  name         TEXT NOT NULL,
  timezone     TEXT NOT NULL DEFAULT 'America/Detroit',
  open_hours   JSONB NOT NULL DEFAULT '[]',
  address      TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        CITEXT UNIQUE,
  phone        TEXT,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- restaurant_memberships
CREATE TABLE IF NOT EXISTS restaurant_memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('host','manager','owner')),
  UNIQUE (restaurant_id, user_id)
);

-- dining_tables
CREATE TABLE IF NOT EXISTS dining_tables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  capacity      INTEGER NOT NULL CHECK (capacity > 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (restaurant_id, label)
);

-- api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  prefix        TEXT NOT NULL UNIQUE,
  secret_hash   TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('platform','owner','manager','host','diner_app')),
  created_by    UUID,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_key_has_no_restaurant CHECK (
    (role = 'platform' AND restaurant_id IS NULL)
    OR (role != 'platform' AND restaurant_id IS NOT NULL)
  )
);

-- reservations
CREATE TABLE IF NOT EXISTS reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id         UUID REFERENCES dining_tables(id),
  diner_user_id    UUID REFERENCES users(id),
  diner_name       TEXT NOT NULL,
  diner_email      TEXT,
  diner_phone      TEXT,
  party_size       INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 50),
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show')),
  notes            TEXT,
  idempotency_key  TEXT,
  created_by_key_id UUID REFERENCES api_keys(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- No double-booking: GIST exclusion on table_id + time range
ALTER TABLE reservations
  ADD CONSTRAINT no_table_overlap
  EXCLUDE USING GIST (
    table_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (table_id IS NOT NULL AND status IN ('pending','confirmed','seated'));

-- Idempotency unique index
CREATE UNIQUE INDEX IF NOT EXISTS reservations_idempotency_key_idx
  ON reservations (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- audit_events
CREATE TABLE IF NOT EXISTS audit_events (
  id            BIGSERIAL PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  actor_key_id  UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'restaurants_updated_at') THEN
    CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON restaurants
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reservations_updated_at') THEN
    CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS reservations_restaurant_id_idx ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS reservations_starts_at_idx ON reservations(starts_at);
CREATE INDEX IF NOT EXISTS reservations_diner_email_idx ON reservations(diner_email);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(prefix);
