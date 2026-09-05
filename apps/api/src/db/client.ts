import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // max connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
});

export const db = {
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 100) {
        logger.warn('Slow query detected', { text, duration, rows: res.rowCount });
      }

      return res;
    } catch (error) {
      logger.error('Database query error', { text, error: (error as Error).message });
      throw error;
    }
  },

  async getClient() {
    return pool.connect();
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await pool.query('SELECT 1 as healthy');
      return res.rows[0]?.healthy === 1;
    } catch (error) {
      logger.error('PostgreSQL health check failed', { error: (error as Error).message });
      return false;
    }
  },

  async close(): Promise<void> {
    await pool.end();
    logger.info('PostgreSQL pool closed');
  },
};
