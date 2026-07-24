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
  conflict: (code, msg) => new AppError(409, code, msg),
  badRequest: (code, msg, details) => new AppError(400, code, msg, details),
};
