import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { IngestionJobPayload } from './ingestion.types';

export const INGESTION_QUEUE_NAME = 'repo-ingestion';

export const ingestionQueue = new Queue<IngestionJobPayload>(INGESTION_QUEUE_NAME, {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

ingestionQueue.on('error', (err) => {
  logger.error('Ingestion queue error', { error: err.message });
});
