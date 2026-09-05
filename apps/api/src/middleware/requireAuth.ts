import { Request, Response, NextFunction } from 'express';
import { JwtUtil, COOKIE_NAME } from '../modules/auth/jwt.util';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // 1. Check HttpOnly cookie first, then fallback to Authorization header
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw AppError.unauthorized('Authentication required');
    }

    // 2. Verify token
    const payload = JwtUtil.verifyToken(token);
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.warn('JWT verification failed', { error: (error as Error).message });
    next(AppError.unauthorized('Invalid or expired session token'));
  }
};
