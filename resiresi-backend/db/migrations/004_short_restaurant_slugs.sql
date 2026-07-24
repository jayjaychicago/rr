-- 004_short_restaurant_slugs.sql
-- Short, memorable slugs so the API can be addressed as /restaurants/nino/...
-- instead of by UUID. Paired rollback: db/rollback/004_short_restaurant_slugs.down.sql

UPDATE restaurants SET slug = 'nino'
 WHERE slug = 'ninos-pizza'
   AND NOT EXISTS (SELECT 1 FROM restaurants r2 WHERE r2.slug = 'nino');

UPDATE restaurants SET slug = 'gino'
 WHERE slug = 'ginos-pizza'
   AND NOT EXISTS (SELECT 1 FROM restaurants r2 WHERE r2.slug = 'gino');
