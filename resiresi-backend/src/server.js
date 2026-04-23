import { createApp } from './app.js';
import pool from './db/pool.js';
import logger from './lib/logger.js';

const PORT = Number(process.env.PORT || 8080);
const app = createApp();

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    try {
      await pool.end();
      logger.info('DB pool closed');
    } catch (err) {
      logger.error({ err }, 'Error closing pool');
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
