import { userRepository } from './user.repository';
import { PasswordUtil } from './password.util';
import { JwtUtil } from './jwt.util';
import { OAuthService } from './oauth.service';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput, LoginInput } from './auth.types';
import { UserProfileResponse } from '@devlens/types';

export class AuthService {
  static async register(input: RegisterInput): Promise<{ user: UserProfileResponse; token: string }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await PasswordUtil.hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    });

    const token = JwtUtil.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      token,
    };
  }

  static async login(input: LoginInput): Promise<{ user: UserProfileResponse; token: string }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await PasswordUtil.verifyPassword(user.passwordHash, input.password);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = JwtUtil.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      token,
    };
  }

  static async handleGitHubCallback(code: string): Promise<{ user: UserProfileResponse; token: string }> {
    const accessToken = await OAuthService.exchangeCodeForToken(code);
    const ghUser = await OAuthService.getGitHubUser(accessToken);

    if (!ghUser.email) {
      throw AppError.badRequest('GitHub account must have a verified public email');
    }

    const githubId = ghUser.id.toString();
    let user = await userRepository.findByGithubId(githubId);

    if (!user) {
      // Check if user with same email exists
      user = await userRepository.findByEmail(ghUser.email);
      if (user) {
        user = await userRepository.updateGithubInfo(user.id, githubId, ghUser.avatar_url);
      } else {
        user = await userRepository.create({
          email: ghUser.email,
          fullName: ghUser.name || ghUser.login,
          avatarUrl: ghUser.avatar_url,
          githubId,
        });
      }
    }

    const token = JwtUtil.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      token,
    };
  }

  static async handleLocalDevGitHubLogin(): Promise<{ user: UserProfileResponse; token: string }> {
    const mockEmail = 'dev-github@devlens.ai';
    const mockGithubId = 'dev-github-local-99999';
    let user = await userRepository.findByGithubId(mockGithubId);

    if (!user) {
      user = await userRepository.findByEmail(mockEmail);
      if (user) {
        user = await userRepository.updateGithubInfo(user.id, mockGithubId, 'https://avatars.githubusercontent.com/u/583231');
      } else {
        user = await userRepository.create({
          email: mockEmail,
          fullName: 'GitHub Local Developer',
          avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
          githubId: mockGithubId,
        });
      }
    }

    const token = JwtUtil.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      token,
    };
  }

  static async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
