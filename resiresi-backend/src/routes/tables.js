import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireApiKey, requireRole, requireRestaurantScope } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Errors } from '../lib/errors.js';

const router = Router({ mergeParams: true });

const CreateTableSchema = z.object({
  label: z.string().min(1).max(50),
  capacity: z.number().int().min(1),
  active: z.boolean().optional().default(true),
});

const UpdateTableSchema = CreateTableSchema.partial();

// GET /v1/restaurants/:restaurantId/tables
router.get('/',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
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

// POST /v1/restaurants/:restaurantId/tables
router.post('/',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('manager', 'owner'),
  validate(CreateTableSchema),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
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

// PATCH /v1/restaurants/:restaurantId/tables/:tableId
router.patch('/:tableId',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('manager', 'owner'),
  validate(UpdateTableSchema),
  async (req, res, next) => {
    try {
      const { restaurantId, tableId } = req.params;
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

// DELETE /v1/restaurants/:restaurantId/tables/:tableId
router.delete('/:tableId',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('manager', 'owner'),
  async (req, res, next) => {
    try {
      const { restaurantId, tableId } = req.params;
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
