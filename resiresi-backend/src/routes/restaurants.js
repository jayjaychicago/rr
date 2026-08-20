import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { Errors } from '../lib/errors.js';

const router = Router();

const CreateRestaurantSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab'),
  name: z.string().min(1).max(200),
  timezone: z.string().optional().default('America/Detroit'),
  open_hours: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional().default([]),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const UpdateRestaurantSchema = CreateRestaurantSchema.partial().omit({ slug: true });

// GET /restaurants
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM restaurants ORDER BY created_at DESC'
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /restaurants/:idOrSlug
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM restaurants WHERE id::text = $1 OR slug = $1',
      [idOrSlug]
    );
    if (rows.length === 0) return next(Errors.notFound('Restaurant'));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /restaurants
router.post('/',
  validate(CreateRestaurantSchema),
  async (req, res, next) => {
    try {
      const { slug, name, timezone, open_hours, address, phone } = req.validated;
      try {
        const { rows } = await pool.query(
          `INSERT INTO restaurants (slug, name, timezone, open_hours, address, phone)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [slug, name, timezone, JSON.stringify(open_hours), address, phone]
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        if (err.code === '23505') return next(Errors.conflict('slug_taken', `Slug "${slug}" is already in use.`));
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /restaurants/:restaurantId
router.patch('/:restaurantId',
  validate(UpdateRestaurantSchema),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const fields = req.validated;
      const keys = Object.keys(fields);
      if (keys.length === 0) {
        const { rows } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [restaurantId]);
        if (rows.length === 0) return next(Errors.notFound('Restaurant'));
        return res.json(rows[0]);
      }

      const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = keys.map(k => k === 'open_hours' ? JSON.stringify(fields[k]) : fields[k]);

      const { rows } = await pool.query(
        `UPDATE restaurants SET ${setClauses} WHERE id = $1 RETURNING *`,
        [restaurantId, ...values]
      );
      if (rows.length === 0) return next(Errors.notFound('Restaurant'));
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
