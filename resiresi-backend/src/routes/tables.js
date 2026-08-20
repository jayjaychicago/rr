import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { resolveRestaurant } from '../middleware/restaurant.js';
import { validate } from '../middleware/validate.js';
import { Errors } from '../lib/errors.js';

const router = Router({ mergeParams: true });

// Accepts a slug or a UUID in the path; hands handlers a UUID.
router.use(resolveRestaurant);

const CreateTableSchema = z.object({
  label: z.string().min(1).max(50),
  capacity: z.number().int().min(1),
  active: z.boolean().optional().default(true),
});

const UpdateTableSchema = CreateTableSchema.partial();

// GET /restaurants/:restaurantId/tables
router.get('/',
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { rows } = await pool.query(
        'SELECT * FROM dining_tables WHERE restaurant_id = $1 ORDER BY label',
        [restaurantId]
      );
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

// POST /restaurants/:restaurantId/tables
router.post('/',
  validate(CreateTableSchema),
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { label, capacity, active } = req.validated;
      try {
        const { rows } = await pool.query(
          `INSERT INTO dining_tables (restaurant_id, label, capacity, active)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [restaurantId, label, capacity, active]
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        if (err.code === '23505') return next(Errors.conflict('table_label_taken', `Table label "${label}" already exists.`));
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /restaurants/:restaurantId/tables/:tableId
router.patch('/:tableId',
  validate(UpdateTableSchema),
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { tableId } = req.params;
      const fields = req.validated;
      const keys = Object.keys(fields);
      if (keys.length === 0) {
        const { rows } = await pool.query(
          'SELECT * FROM dining_tables WHERE id = $1 AND restaurant_id = $2',
          [tableId, restaurantId]
        );
        if (rows.length === 0) return next(Errors.notFound('Table'));
        return res.json(rows[0]);
      }

      const setClauses = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = keys.map(k => fields[k]);

      try {
        const { rows } = await pool.query(
          `UPDATE dining_tables SET ${setClauses} WHERE id = $1 AND restaurant_id = $2 RETURNING *`,
          [tableId, restaurantId, ...values]
        );
        if (rows.length === 0) return next(Errors.notFound('Table'));
        res.json(rows[0]);
      } catch (err) {
        if (err.code === '23505') return next(Errors.conflict('table_label_taken', 'Table label already exists.'));
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /restaurants/:restaurantId/tables/:tableId
router.delete('/:tableId',
  async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId;
      const { tableId } = req.params;
      const { rowCount } = await pool.query(
        'DELETE FROM dining_tables WHERE id = $1 AND restaurant_id = $2',
        [tableId, restaurantId]
      );
      if (rowCount === 0) return next(Errors.notFound('Table'));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
