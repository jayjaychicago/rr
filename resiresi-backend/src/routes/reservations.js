import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { resolveRestaurant } from '../middleware/restaurant.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { Errors } from '../lib/errors.js';

const router = Router({ mergeParams: true });

// Accepts a slug or a UUID in the path; hands handlers a UUID.
router.use(resolveRestaurant);

const CreateReservationSchema = z.object({
  table_id: z.string().uuid().optional(),
  diner_user_id: z.string().uuid().optional(),
  diner_external_id: z.string().max(200).optional(),
  diner_name: z.string().min(1).max(200),
  diner_email: z.string().email().optional(),
  diner_phone: z.string().optional(),
  party_size: z.number().int().min(1).max(50),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(1).optional(),
  status: z.enum(['pending','confirmed','seated','completed','cancelled','no_show']).optional().default('confirmed'),
  notes: z.string().optional(),
}).refine(d => d.ends_at || d.duration_minutes, {
  message: 'Either ends_at or duration_minutes is required',
  path: ['ends_at'],
});

const UpdateReservationSchema = z.object({
  table_id: z.string().uuid().nullable().optional(),
  diner_name: z.string().min(1).max(200).optional(),
  diner_email: z.string().email().optional(),
  diner_phone: z.string().optional(),
  party_size: z.number().int().min(1).max(50).optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['pending','confirmed','seated','completed','cancelled','no_show']).optional(),
  notes: z.string().optional(),
});

const ListQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  diner_email: z.string().optional(),
  diner_external_id: z.string().optional(),
  table_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  cursor: z.string().optional(),
});

// POST /restaurants/:restaurantId/reservations
router.post('/',
  validate(CreateReservationSchema),
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const idempotencyKey = req.headers['idempotency-key'] || null;

      // Handle idempotency replay
      if (idempotencyKey) {
        const { rows: existing } = await pool.query(
          'SELECT * FROM reservations WHERE restaurant_id = $1 AND idempotency_key = $2',
          [restaurantId, idempotencyKey]
        );
        if (existing.length > 0) {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(200).json(existing[0]);
        }
      }

      const d = req.validated;
      let endsAt = d.ends_at
        ? new Date(d.ends_at)
        : new Date(new Date(d.starts_at).getTime() + (d.duration_minutes || 90) * 60 * 1000);

      if (endsAt <= new Date(d.starts_at)) {
        return next(Errors.badRequest('invalid_times', 'ends_at must be after starts_at.'));
      }

      // Validate table belongs to restaurant and capacity
      if (d.table_id) {
        const { rows: tableRows } = await pool.query(
          'SELECT * FROM dining_tables WHERE id = $1 AND restaurant_id = $2',
          [d.table_id, restaurantId]
        );
        if (tableRows.length === 0) {
          return next(Errors.badRequest('table_not_found', 'Table does not belong to this restaurant.'));
        }
        if (tableRows[0].capacity < d.party_size) {
          return next(Errors.badRequest('table_too_small', `Table capacity ${tableRows[0].capacity} is less than party size ${d.party_size}.`));
        }
      }

      try {
        const { rows } = await pool.query(
          `INSERT INTO reservations
             (restaurant_id, table_id, diner_user_id, diner_external_id, diner_name, diner_email, diner_phone,
              party_size, starts_at, ends_at, status, notes, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [
            restaurantId, d.table_id || null, d.diner_user_id || null,
            d.diner_external_id || null,
            d.diner_name, d.diner_email || null, d.diner_phone || null,
            d.party_size, d.starts_at, endsAt.toISOString(),
            d.status || 'confirmed', d.notes || null, idempotencyKey,
          ]
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        if (err.code === '23P01') return next(Errors.conflict('table_conflict', 'Table is already booked for this time.'));
        if (err.code === '23505') {
          // Idempotency key race — refetch
          const { rows: existing } = await pool.query(
            'SELECT * FROM reservations WHERE restaurant_id = $1 AND idempotency_key = $2',
            [restaurantId, idempotencyKey]
          );
          if (existing.length > 0) {
            res.setHeader('Idempotent-Replay', 'true');
            return res.status(200).json(existing[0]);
          }
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /restaurants/:restaurantId/reservations
router.get('/',
  validateQuery(ListQuerySchema),
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const q = req.validatedQuery;

      const conditions = ['r.restaurant_id = $1'];
      const params = [restaurantId];
      let p = 2;

      if (q.from) { conditions.push(`r.starts_at >= $${p++}`); params.push(q.from); }
      if (q.to)   { conditions.push(`r.starts_at <= $${p++}`); params.push(q.to); }
      if (q.diner_external_id) { conditions.push(`r.diner_external_id = $${p++}`); params.push(q.diner_external_id); }
      if (q.diner_email) { conditions.push(`r.diner_email = $${p++}`); params.push(q.diner_email); }
      if (q.table_id) { conditions.push(`r.table_id = $${p++}`); params.push(q.table_id); }

      const statuses = q.status
        ? (Array.isArray(q.status) ? q.status : [q.status])
        : [];
      if (statuses.length > 0) {
        conditions.push(`r.status = ANY($${p++})`);
        params.push(statuses);
      }

      // Cursor: base64url of "starts_at|id"
      if (q.cursor) {
        try {
          const decoded = Buffer.from(q.cursor, 'base64url').toString('utf8');
          const [cursorStartsAt, cursorId] = decoded.split('|');
          conditions.push(`(r.starts_at, r.id) > ($${p++}, $${p++})`);
          params.push(cursorStartsAt, cursorId);
        } catch (_) {}
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = q.limit + 1; // fetch one extra to detect next page
      params.push(limit);

      const { rows } = await pool.query(
        `SELECT r.* FROM reservations r ${where} ORDER BY r.starts_at ASC, r.id ASC LIMIT $${p}`,
        params
      );

      let nextCursor = null;
      let data = rows;
      if (rows.length > q.limit) {
        data = rows.slice(0, q.limit);
        const last = data[data.length - 1];
        nextCursor = Buffer.from(`${last.starts_at.toISOString()}|${last.id}`).toString('base64url');
      }

      res.json({ data, page: { next_cursor: nextCursor, limit: q.limit } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /restaurants/:restaurantId/reservations/:reservationId
router.get('/:reservationId',
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { reservationId } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2',
        [reservationId, restaurantId]
      );
      if (rows.length === 0) return next(Errors.notFound('Reservation'));
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /restaurants/:restaurantId/reservations/:reservationId
router.patch('/:reservationId',
  validate(UpdateReservationSchema),
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { reservationId } = req.params;
      const fields = req.validated;
      const keys = Object.keys(fields);
      if (keys.length === 0) {
        const { rows } = await pool.query(
          'SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2',
          [reservationId, restaurantId]
        );
        if (rows.length === 0) return next(Errors.notFound('Reservation'));
        return res.json(rows[0]);
      }

      // Validate table if provided
      if (fields.table_id) {
        const { rows: tableRows } = await pool.query(
          'SELECT * FROM dining_tables WHERE id = $1 AND restaurant_id = $2',
          [fields.table_id, restaurantId]
        );
        if (tableRows.length === 0) {
          return next(Errors.badRequest('table_not_found', 'Table does not belong to this restaurant.'));
        }
        if (fields.party_size && tableRows[0].capacity < fields.party_size) {
          return next(Errors.badRequest('table_too_small', `Table capacity ${tableRows[0].capacity} is less than party size ${fields.party_size}.`));
        }
      }

      const setClauses = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = keys.map(k => fields[k]);

      try {
        const { rows } = await pool.query(
          `UPDATE reservations SET ${setClauses} WHERE id = $1 AND restaurant_id = $2 RETURNING *`,
          [reservationId, restaurantId, ...values]
        );
        if (rows.length === 0) return next(Errors.notFound('Reservation'));
        res.json(rows[0]);
      } catch (err) {
        if (err.code === '23P01') return next(Errors.conflict('table_conflict', 'Table is already booked for this time.'));
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /restaurants/:restaurantId/reservations/:reservationId (soft cancel)
router.delete('/:reservationId',
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { reservationId } = req.params;

      const { rows } = await pool.query(
        'SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2',
        [reservationId, restaurantId]
      );
      if (rows.length === 0) return next(Errors.notFound('Reservation'));

      await pool.query(
        "UPDATE reservations SET status = 'cancelled' WHERE id = $1 AND restaurant_id = $2",
        [reservationId, restaurantId]
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
