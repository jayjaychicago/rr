import pool from '../db/pool.js';
import { Errors } from '../lib/errors.js';

/**
 * Nested routes are addressed as /restaurants/{restaurant}/... where {restaurant}
 * may be either the UUID or the human-friendly slug ("nino", "gino").
 * Resolve it once here and hand the handlers a canonical UUID on req.restaurantId.
 */
export async function resolveRestaurant(req, res, next) {
  try {
    const ref = req.params.restaurantId;
    if (!ref) return next(Errors.notFound('Restaurant'));

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);

    const { rows } = await pool.query(
      isUuid
        ? 'SELECT id FROM restaurants WHERE id = $1'
        : 'SELECT id FROM restaurants WHERE slug = $1',
      [ref]
    );

    if (rows.length === 0) return next(Errors.notFound('Restaurant'));

    req.restaurantId = rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}
