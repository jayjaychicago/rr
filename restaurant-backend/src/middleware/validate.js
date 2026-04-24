import { Errors } from '../lib/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(Errors.badRequest('validation_error', 'Invalid request body.', result.error.flatten()));
    }
    req.validated = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(Errors.badRequest('validation_error', 'Invalid query parameters.', result.error.flatten()));
    }
    req.validatedQuery = result.data;
    next();
  };
}
