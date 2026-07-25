import pino from 'pino';
import { createRequire } from 'module';

const canResolve = (pkg) => {
  try { createRequire(import.meta.url).resolve(pkg); return true; } catch { return false; }
};

const pinoOpts = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
      '*.secret',
      '*.secret_hash',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
};

function buildTransport() {
  if (process.env.NODE_ENV !== 'production') {
    // pino-pretty is a devDependency; inside the Docker image (production deps
    // only, NODE_ENV=development in compose) it's absent — fall back to plain
    // stdout instead of crashing at boot.
    return canResolve('pino-pretty')
      ? { target: 'pino-pretty', options: { colorize: true } }
      : { target: 'pino/file', options: { destination: 1 } };
  }

  const targets = [
    // Always keep stdout so Fly's log aggregation still works
    { target: 'pino/file', options: { destination: 1 }, level: pinoOpts.level },
  ];

  if (process.env.AXIOM_TOKEN) {
    targets.push({
      target: '@axiomhq/pino',
      options: {
        dataset: process.env.AXIOM_DATASET || 'resiresi',
        token: process.env.AXIOM_TOKEN,
      },
      level: pinoOpts.level,
    });
  }

  return { targets };
}

const logger = pino(pinoOpts, pino.transport(buildTransport()));

export default logger;
