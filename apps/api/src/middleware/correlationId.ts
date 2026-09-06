import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to extract or generate unique Correlation ID (X-Correlation-ID)
 * for request tracing and log aggregation
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = (req.headers['x-correlation-id'] || req.headers['x-request-id']) as string | undefined;
  const correlationId = existingId && existingId.trim() !== ''
    ? existingId.trim()
    : `c_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
