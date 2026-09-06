import { Router, Request, Response, NextFunction } from 'express';
import { register } from '../utils/metrics';

export const metricsRouter: Router = Router();

/**
 * GET /metrics
 * Returns Prometheus scrape format metrics
 */
metricsRouter.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metricsData = await register.metrics();
    res.status(200).send(metricsData);
  } catch (error) {
    next(error);
  }
});
