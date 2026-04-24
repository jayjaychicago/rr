ALTER TABLE reservations ADD COLUMN IF NOT EXISTS diner_external_id TEXT;
CREATE INDEX IF NOT EXISTS reservations_restaurant_diner_ext_idx
  ON reservations (restaurant_id, diner_external_id);
