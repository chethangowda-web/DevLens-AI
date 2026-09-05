import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export class OAuthService {
  static getGitHubAuthUrl(state: string): string {
    if (!env.GITHUB_CLIENT_ID) {
      throw AppError.badRequest('GitHub OAuth is not configured on this server');
    }

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'user:email read:user',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post<{ access_token: string; error?: string }>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error || !response.data.access_token) {
        logger.warn('GitHub token exchange failed', { error: response.data.error });
        throw AppError.badRequest('Failed to obtain GitHub access token');
      }

      return response.data.access_token;
    } catch (error) {
      logger.error('Error during GitHub token exchange', { error: (error as Error).message });
      throw AppError.badRequest('GitHub authentication failed');
    }
  }

  static async getGitHubUser(accessToken: string): Promise<GitHubUserProfile> {
    try {
      const [userRes, emailRes] = await Promise.all([
        axios.get<GitHubUserProfile>('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get<Array<{ email: string; primary: boolean; verified: boolean }>>(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        ).catch(() => ({ data: [] })),
      ]);

      const primaryEmail =
        emailRes.data.find((e) => e.primary && e.verified)?.email ||
        emailRes.data[0]?.email ||
        userRes.data.email;

      return {
        ...userRes.data,
        email: primaryEmail || null,
      };
    } catch (error) {
      logger.error('Failed to fetch GitHub user profile', { error: (error as Error).message });
      throw AppError.badRequest('Failed to fetch GitHub profile');
    }
  }
}
