import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  API_BASE_URL: z.string().default('http://localhost:5000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('devlens_db'),
  POSTGRES_PORT: z.string().transform((val) => parseInt(val, 10)).default('5433'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform((val) => parseInt(val, 10)).default('6379'),

  // Auth & JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('devlens_local_jwt_secret_key_development_32_chars!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters').default('devlens_local_cookie_secret_key_development!'),

  // OAuth & GitHub Webhooks (Optional in dev)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/auth/github/callback'),
  GITHUB_WEBHOOK_SECRET: z.string().default('devlens_local_github_webhook_secret_key!'),

  // AI Providers (Optional in dev)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Ingestion Constraints
  MAX_FILE_SIZE_KB: z.string().transform((val) => parseInt(val, 10)).default('500'),
  MAX_REPO_SIZE_MB: z.string().transform((val) => parseInt(val, 10)).default('50'),
  MAX_UNCOMPRESSED_MB: z.string().transform((val) => parseInt(val, 10)).default('200'),
  TEMP_WORKSPACE_DIR: z.string().default('/tmp/devlens-workspaces'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:\n', result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
