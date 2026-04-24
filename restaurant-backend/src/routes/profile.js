import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireApiKey } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { Errors } from '../lib/errors.js';

const router = Router();

const GetQuerySchema = z.object({
  diner_external_id: z.string().min(1).max(200),
});

const PatchSchema = z.object({
  diner_external_id: z.string().min(1).max(200),
  name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  dietary_notes: z.string().max(2000).optional(),
  marketing_opt_in: z.boolean().optional(),
});

router.get('/',
  requireApiKey,
  validateQuery(GetQuerySchema),
  async (req, res, next) => {
    try {
      const { diner_external_id } = req.validatedQuery;
      const { rows } = await pool.query(
        'SELECT * FROM profiles WHERE diner_external_id = $1',
        [diner_external_id]
      );
      if (rows.length === 0) {
        return next(Errors.notFound('Profile'));
      }
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/',
  requireApiKey,
  validate(PatchSchema),
  async (req, res, next) => {
    try {
      const { diner_external_id, name, phone, dietary_notes, marketing_opt_in } = req.validated;
      const { rows } = await pool.query(
        `INSERT INTO profiles (diner_external_id, name, phone, dietary_notes, marketing_opt_in, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (diner_external_id) DO UPDATE SET
           name             = COALESCE($2, profiles.name),
           phone            = COALESCE($3, profiles.phone),
           dietary_notes    = COALESCE($4, profiles.dietary_notes),
           marketing_opt_in = COALESCE($5, profiles.marketing_opt_in),
           updated_at       = now()
         RETURNING *`,
        [
          diner_external_id,
          name ?? null,
          phone ?? null,
          dietary_notes ?? null,
          marketing_opt_in ?? null,
        ]
      );
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
