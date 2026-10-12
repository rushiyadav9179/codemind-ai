import { createApp } from './app';
import { env } from './config/env';
import { logger } from './middleware/requestLogger';

const app = createApp();

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(
    {
      host: env.API_HOST,
      port: env.API_PORT,
      env: env.NODE_ENV,
    },
    `🚀 CodeMind AI API running at http://${env.API_HOST}:${env.API_PORT}`,
  );
  logger.info(`   Health check: http://${env.API_HOST}:${env.API_PORT}/api/v1/health`);
});

const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Closing HTTP server gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server close');
      process.exit(1);
    }
    logger.info('HTTP server closed. Goodbye.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.warn('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise rejection');
  process.exit(1);
});

export default server;
