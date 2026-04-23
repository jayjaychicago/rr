import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireApiKey, requireRole, requireRestaurantScope } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateApiKey } from '../lib/apikey.js';
import { Errors } from '../lib/errors.js';

const restaurantRouter = Router({ mergeParams: true });
const platformRouter = Router();

const CreateKeySchema = z.object({
  name: z.string().min(1).max(200),
  role: z.enum(['owner','manager','host','diner_app']),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

// GET /v1/restaurants/:restaurantId/api-keys
restaurantRouter.get('/',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('owner'),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { rows } = await pool.query(
        `SELECT id, restaurant_id, name, prefix, role, created_by, last_used_at, expires_at, revoked_at, created_at
         FROM api_keys WHERE restaurant_id = $1 ORDER BY created_at DESC`,
        [restaurantId]
      );
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

// POST /v1/restaurants/:restaurantId/api-keys
restaurantRouter.post('/',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('owner'),
  validate(CreateKeySchema),
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { name, role, expires_at } = req.validated;
      const { prefix, fullKey, secretHash } = generateApiKey('live');

      const { rows } = await pool.query(
        `INSERT INTO api_keys (restaurant_id, name, prefix, secret_hash, role, created_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, restaurant_id, name, prefix, role, created_by, expires_at, created_at`,
        [restaurantId, name, prefix, secretHash, role, req.apiKey.id, expires_at || null]
      );
      res.status(201).json({ ...rows[0], plaintext: fullKey });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /v1/restaurants/:restaurantId/api-keys/:keyId
restaurantRouter.delete('/:keyId',
  requireApiKey,
  requireRestaurantScope('restaurantId'),
  requireRole('owner'),
  async (req, res, next) => {
    try {
      const { restaurantId, keyId } = req.params;
      const { rowCount } = await pool.query(
        `UPDATE api_keys SET revoked_at = now()
         WHERE id = $1 AND restaurant_id = $2 AND revoked_at IS NULL`,
        [keyId, restaurantId]
      );
      if (rowCount === 0) return next(Errors.notFound('API key'));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

// Platform-wide: GET /v1/platform/api-keys
platformRouter.get('/',
  requireApiKey,
  requireRole('platform'),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, restaurant_id, name, prefix, role, created_by, last_used_at, expires_at, revoked_at, created_at
         FROM api_keys ORDER BY created_at DESC`
      );
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

// Platform-wide: POST /v1/platform/api-keys
const CreatePlatformKeySchema = z.object({
  name: z.string().min(1).max(200),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

platformRouter.post('/',
  requireApiKey,
  requireRole('platform'),
  validate(CreatePlatformKeySchema),
  async (req, res, next) => {
    try {
      const { name, expires_at } = req.validated;
      const { prefix, fullKey, secretHash } = generateApiKey('live');
      const { rows } = await pool.query(
        `INSERT INTO api_keys (name, prefix, secret_hash, role, created_by, expires_at)
         VALUES ($1,$2,$3,'platform',$4,$5) RETURNING id, name, prefix, role, created_by, expires_at, created_at`,
        [name, prefix, secretHash, req.apiKey.id, expires_at || null]
      );
      res.status(201).json({ ...rows[0], plaintext: fullKey });
    } catch (err) {
      next(err);
    }
  }
);

// Platform-wide: DELETE /v1/platform/api-keys/:keyId
platformRouter.delete('/:keyId',
  requireApiKey,
  requireRole('platform'),
  async (req, res, next) => {
    try {
      const { keyId } = req.params;
      const { rowCount } = await pool.query(
        `UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
        [keyId]
      );
      if (rowCount === 0) return next(Errors.notFound('API key'));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export { restaurantRouter, platformRouter };
