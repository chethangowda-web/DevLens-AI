import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../../config/env';
import { AuthJwtPayload } from './auth.types';

export const COOKIE_NAME = 'devlens_token';

export class JwtUtil {
  static signToken(payload: Omit<AuthJwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  static verifyToken(token: string): AuthJwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
  }

  static setAuthCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  static clearAuthCookie(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
  }
}
