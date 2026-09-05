import { Response } from 'express';
import { ApiResponse } from '@devlens/types';

export class ApiResponseUtil {
  static success<T>(res: Response, data?: T, statusCode = 200): Response {
    const payload: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data?: T): Response {
    return ApiResponseUtil.success(res, data, 201);
  }

  static error(
    res: Response,
    message: string,
    code = 'INTERNAL_SERVER_ERROR',
    statusCode = 500,
    details?: unknown
  ): Response {
    const payload: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
  }
}
