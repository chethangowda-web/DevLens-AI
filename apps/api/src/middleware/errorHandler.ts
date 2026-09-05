import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode = 500,
    public code = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    logger.warn('Validation error', { issues: err.issues });
    ApiResponseUtil.error(
      res,
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      err.flatten().fieldErrors
    );
    return;
  }

  // Handle Known Application Errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[AppError] ${err.message}`, { stack: err.stack, code: err.code });
    } else {
      logger.warn(`[AppError] ${err.message}`, { code: err.code, details: err.details });
    }

    ApiResponseUtil.error(res, err.message, err.code, err.statusCode, err.details);
    return;
  }

  // Handle Unexpected Server Errors
  logger.error(`[UnhandledError] ${err.message}`, { stack: err.stack });

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message;

  ApiResponseUtil.error(
    res,
    message,
    'INTERNAL_SERVER_ERROR',
    500,
    env.NODE_ENV === 'production' ? undefined : err.stack
  );
};
