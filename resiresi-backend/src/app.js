import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { requestId } from './lib/requestId.js';
import logger from './lib/logger.js';
import { AppError } from './lib/errors.js';

import systemRouter from './routes/system.js';
import restaurantsRouter from './routes/restaurants.js';
import tablesRouter from './routes/tables.js';
import reservationsRouter from './routes/reservations.js';
import { restaurantRouter as apiKeysRouter, platformRouter as platformApiKeysRouter } from './routes/apiKeys.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

  // 1. helmet
  app.use(helmet());

  // 2. cors
  app.use(cors());

  // 3. json body parser
  app.use(express.json({ limit: '100kb' }));

  // 4. request ID
  app.use(requestId);

  // 5. pino-http
  app.use(pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));

  // 6. rate limit
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // 7. routes
  app.use(systemRouter);
  app.use('/v1/restaurants', restaurantsRouter);
  app.use('/v1/restaurants/:restaurantId/tables', tablesRouter);
  app.use('/v1/restaurants/:restaurantId/reservations', reservationsRouter);
  app.use('/v1/restaurants/:restaurantId/api-keys', apiKeysRouter);
  app.use('/v1/platform/api-keys', platformApiKeysRouter);

  // 8. 404
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: 'Route not found.',
        request_id: req.id,
      },
    });
  });

  // 9. error handler
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    if (status >= 500) {
      logger.error({ err, request_id: req.id }, err.message);
    }
    res.status(status).json({
      error: {
        code: err.code || 'internal_error',
        message: err.message || 'An unexpected error occurred.',
        request_id: req.id,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  });

  return app;
}
