import fs from 'fs';
import path from 'path';
import { pool } from './client';
import { logger } from '../utils/logger';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Running database migrations...');

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('No migrations directory found');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 3. Check already applied migrations
    const { rows: appliedRows } = await client.query<{ name: string }>(
      'SELECT name FROM _migrations'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 4. Apply pending migrations inside a transaction
    for (const file of files) {
      if (!appliedSet.has(file)) {
        logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          logger.info(`Successfully applied migration: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          logger.error(`Failed to apply migration ${file}`, { error: (error as Error).message });
          throw error;
        }
      } else {
        logger.debug(`Migration already applied: ${file}`);
      }
    }

    logger.info('Database migrations completed successfully');
  } finally {
    client.release();
  }
}

// Allow direct execution via `pnpm --filter @devlens/api db:migrate`
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration process failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}
