import { Errors } from '../lib/errors.js';

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return next(Errors.unauthorized());
  }
  next();
}
