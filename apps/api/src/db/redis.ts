import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

export const redisHealthCheck = async (): Promise<boolean> => {
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error: (error as Error).message });
    return false;
  }
};
