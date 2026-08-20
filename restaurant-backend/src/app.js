import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { requestId } from './lib/requestId.js';
import logger from './lib/logger.js';

import systemRouter from './routes/system.js';
import profileRouter from './routes/profile.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestId);

  app.use(pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customProps: (req) => ({
      body: req.body,
      params: req.params,
      query: req.query,
    }),
    serializers: {
      req: (req) => {
        const cookieHeader = req.headers?.cookie ?? '';
        const cookies = cookieHeader
          ? Object.fromEntries(
              cookieHeader.split(';').map(c => {
                const eq = c.indexOf('=');
                return eq === -1
                  ? [c.trim(), '']
                  : [c.slice(0, eq).trim(), c.slice(eq + 1).trim()];
              })
            )
          : undefined;
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          headers: req.headers,
          cookies,
        };
      },
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));

  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(systemRouter);
  app.use('/profile', profileRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: 'Route not found.',
        request_id: req.id,
      },
    });
  });

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
