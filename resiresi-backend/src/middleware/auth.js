import pool from '../db/pool.js';
import { hashKey, timingSafeCompare, parsePrefix } from '../lib/apikey.js';
import { Errors } from '../lib/errors.js';

export async function requireApiKey(req, res, next) {
  try {
    const raw =
      (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim() ||
      (req.headers['x-api-key'] || '').trim();

    if (!raw) return next(Errors.unauthorized());

    const prefix = parsePrefix(raw);
    if (!prefix) return next(Errors.unauthorized());

    const { rows } = await pool.query(
      `SELECT id, restaurant_id, role, secret_hash, revoked_at, expires_at
       FROM api_keys WHERE prefix = $1 LIMIT 1`,
      [prefix]
    );

    if (rows.length === 0) return next(Errors.unauthorized());
    const key = rows[0];

    if (key.revoked_at) return next(Errors.unauthorized('API key has been revoked.'));
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return next(Errors.unauthorized('API key has expired.'));
    }

    const incoming = hashKey(raw);
    if (!timingSafeCompare(incoming, key.secret_hash)) {
      return next(Errors.unauthorized());
    }

    // Fire-and-forget last_used_at update
    pool.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [key.id]).catch(() => {});

    req.apiKey = {
      id: key.id,
      role: key.role,
      restaurantId: key.restaurant_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.apiKey) return next(Errors.unauthorized());
    if (req.apiKey.role === 'platform') return next(); // platform bypasses role check
    if (!roles.includes(req.apiKey.role)) return next(Errors.forbidden());
    next();
  };
}

export function requireRestaurantScope(paramName = 'restaurantId') {
  return (req, res, next) => {
    if (!req.apiKey) return next(Errors.unauthorized());
    if (req.apiKey.role === 'platform') return next(); // platform bypasses scope check
    const paramId = req.params[paramName];
    if (req.apiKey.restaurantId !== paramId) return next(Errors.forbidden());
    next();
  };
}
