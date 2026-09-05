import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { redisHealthCheck } from '../db/redis';
import { ApiResponseUtil } from '../utils/apiResponse';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const [isDbHealthy, isRedisHealthy] = await Promise.all([
    db.healthCheck(),
    redisHealthCheck(),
  ]);

  const allHealthy = isDbHealthy && isRedisHealthy;
  const statusCode = allHealthy ? 200 : 503;

  return ApiResponseUtil.success(
    res,
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbHealthy ? 'connected' : 'disconnected',
        redis: isRedisHealthy ? 'connected' : 'disconnected',
      },
    },
    statusCode
  );
});
