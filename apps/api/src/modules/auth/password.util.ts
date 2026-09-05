import { hash, verify } from '@node-rs/argon2';
import { logger } from '../../utils/logger';

export class PasswordUtil {
  /**
   * Hashes a plain password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await hash(password, {
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
    } catch (error) {
      logger.error('Failed to hash password', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Verifies a plain password against an Argon2id hash
   */
  static async verifyPassword(hashString: string, plainText: string): Promise<boolean> {
    try {
      return await verify(hashString, plainText);
    } catch (error) {
      logger.error('Failed to verify password', { error: (error as Error).message });
      return false;
    }
  }
}
