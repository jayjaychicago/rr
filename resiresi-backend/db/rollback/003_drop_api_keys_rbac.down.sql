-- Rollback for 003_drop_api_keys_rbac.sql
-- NOT auto-applied: the migrate runner only reads db/migrations/.
-- Run manually, then delete the row from _migrations to allow re-migrating:
--   DELETE FROM _migrations WHERE filename = '003_drop_api_keys_rbac.sql';
--
-- Restores structure only. Key secrets and membership rows are NOT recoverable;
-- re-run the seed after this to regenerate.

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
  CONSTRAINT api_keys_scope_chk CHECK (
    (role = 'platform' AND restaurant_id IS NULL)
    OR (role != 'platform' AND restaurant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(prefix);

CREATE TABLE IF NOT EXISTS restaurant_memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('host','manager','owner')),
  UNIQUE (restaurant_id, user_id)
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by_key_id UUID REFERENCES api_keys(id);
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;
