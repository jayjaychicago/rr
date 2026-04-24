import pino from 'pino';

const pinoOpts = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // No redact — log everything for full observability
};

function buildTransport() {
  if (process.env.NODE_ENV !== 'production') {
    return { target: 'pino-pretty', options: { colorize: true } };
  }

  const targets = [
    { target: 'pino/file', options: { destination: 1 }, level: pinoOpts.level },
  ];

  if (process.env.AXIOM_TOKEN) {
    targets.push({
      target: '@axiomhq/pino',
      options: {
        dataset: process.env.AXIOM_DATASET || 'restaurant-api',
        token: process.env.AXIOM_TOKEN,
      },
      level: pinoOpts.level,
    });
  }

  return { targets };
}

const logger = pino(pinoOpts, pino.transport(buildTransport()));

export default logger;
