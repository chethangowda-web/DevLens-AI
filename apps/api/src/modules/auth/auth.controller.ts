import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthService } from './auth.service';
import { JwtUtil } from './jwt.util';
import { OAuthService } from './oauth.service';
import { ApiResponseUtil } from '../../utils/apiResponse';
import { registerSchema, loginSchema } from './auth.types';
import { env } from '../../config/env';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const { user, token } = await AuthService.register(validatedInput);

      JwtUtil.setAuthCookie(res, token);
      ApiResponseUtil.created(res, { user, token });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(validatedInput);

      JwtUtil.setAuthCookie(res, token);
      ApiResponseUtil.success(res, { user, token });
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    JwtUtil.clearAuthCookie(res);
    ApiResponseUtil.success(res, { message: 'Logged out successfully' });
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        return;
      }
      const user = await AuthService.getProfile(req.user.userId);
      ApiResponseUtil.success(res, { user });
    } catch (error) {
      next(error);
    }
  }

  static async githubLogin(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!env.GITHUB_CLIENT_ID) {
        if (env.NODE_ENV !== 'production') {
          const devAuth = await AuthService.handleLocalDevGitHubLogin();
          JwtUtil.setAuthCookie(res, devAuth.token);
          return res.redirect(`${env.FRONTEND_URL}/dashboard`);
        }
        throw AppError.badRequest('GitHub OAuth is not configured on this server');
      }

      const state = crypto.randomBytes(16).toString('hex');
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000, // 10 mins
      });

      const url = OAuthService.getGitHubAuthUrl(state);
      res.redirect(url);
    } catch (error) {
      if (env.FRONTEND_URL) {
        return res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent((error as Error).message)}`);
      }
      next(error);
    }
  }

  static async githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const { token } = await AuthService.handleGitHubCallback(code);

      JwtUtil.setAuthCookie(res, token);
      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      next(error);
    }
  }
}
