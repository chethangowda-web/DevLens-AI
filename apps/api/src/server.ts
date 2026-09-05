import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './db/client';
import { redis } from './db/redis';
import { runMigrations } from './db/migrate';
import { createIngestionWorker } from './workers/ingestion.worker';

async function bootstrap() {
  try {
    logger.info(`Starting DevLens API in ${env.NODE_ENV} mode...`);

    // 1. Run database migrations
    await runMigrations();

    // 2. Connect to Redis
    await redis.connect().catch((err) => {
      logger.warn('Redis lazy connection error (will retry on demand)', { error: err.message });
    });

    // 3. Start BullMQ Background Ingestion Worker
    const ingestionWorker = createIngestionWorker();
    logger.info('🚀 BullMQ Ingestion Worker started');

    // 4. Start HTTP server
    const app = createApp();
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`🚀 DevLens API Server is running on http://localhost:${env.PORT}`);
      logger.info(`📡 Health check available at http://localhost:${env.PORT}/health`);
    });

    // 5. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await ingestionWorker.close();
        logger.info('Ingestion worker closed');
        await db.close();
        redis.disconnect();
        logger.info('Process exiting cleanly');
        process.exit(0);
      });

      // Force shutdown after 10s if hanging
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal error during application startup', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

bootstrap();
