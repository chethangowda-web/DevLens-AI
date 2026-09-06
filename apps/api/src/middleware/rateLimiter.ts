import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';

/**
 * Standard API Rate Limiter (100 requests / 15 minutes)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, _res: Response) => ({
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP address, please try again after 15 minutes.',
    },
    timestamp: new Date().toISOString(),
  }),
});

/**
 * AI Intelligence Rate Limiter (30 requests / 15 minutes)
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, _res: Response) => ({
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI request limit reached. Please wait a few minutes before submitting more AI analysis requests.',
    },
    timestamp: new Date().toISOString(),
  }),
});

/**
 * Auth Endpoints Rate Limiter (15 requests / 15 minutes)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, _res: Response) => ({
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
    timestamp: new Date().toISOString(),
  }),
});
