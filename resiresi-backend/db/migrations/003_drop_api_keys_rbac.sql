-- 003_drop_api_keys_rbac.sql
-- Removes the origin's own API-key + RBAC layer. The reservation API is now open;
-- access control belongs to the gateway in front of it, not to this backend.
-- Paired rollback: db/rollback/003_drop_api_keys_rbac.down.sql

-- Columns referencing api_keys must go before the table itself.
ALTER TABLE reservations  DROP COLUMN IF EXISTS created_by_key_id;
ALTER TABLE audit_events  DROP COLUMN IF EXISTS actor_key_id;

DROP TABLE IF EXISTS api_keys;

-- restaurant_memberships was the user/role (RBAC) table; nothing reads it.
DROP TABLE IF EXISTS restaurant_memberships;
