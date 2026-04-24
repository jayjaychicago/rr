export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  notFound: (resource) => new AppError(404, 'not_found', `${resource} not found.`),
  unauthorized: (msg = 'Invalid or missing API key.') => new AppError(401, 'unauthorized', msg),
  forbidden: (msg = 'Insufficient permissions.') => new AppError(403, 'forbidden', msg),
  conflict: (code, msg) => new AppError(409, code, msg),
  badRequest: (code, msg, details) => new AppError(400, code, msg, details),
};
