import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';

describe('Health Check API', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
    redis.disconnect();
  });

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.services.database).toBe('connected');
    expect(res.body.data.services.redis).toBe('connected');
  });

  it('GET /non-existent-route should return 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/invalid-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
