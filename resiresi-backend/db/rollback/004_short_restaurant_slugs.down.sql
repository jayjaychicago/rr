-- Rollback for 004_short_restaurant_slugs.sql
-- NOT auto-applied: the migrate runner only reads db/migrations/.
-- Run manually, then allow re-migrating with:
--   DELETE FROM _migrations WHERE filename = '004_short_restaurant_slugs.sql';

UPDATE restaurants SET slug = 'ninos-pizza' WHERE slug = 'nino';
UPDATE restaurants SET slug = 'ginos-pizza' WHERE slug = 'gino';
