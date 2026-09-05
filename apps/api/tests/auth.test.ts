import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';
import { COOKIE_NAME } from '../src/modules/auth/jwt.util';

describe('Authentication API Suite', () => {
  const app = createApp();

  const testUser = {
    email: `test_${Date.now()}@devlens.ai`,
    password: 'SuperSecretPassword123!',
    fullName: 'Test Developer',
  };

  let authCookie: string;
  let authToken: string;

  afterAll(async () => {
    // Clean up test user
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.fullName).toBe(testUser.fullName);
      expect(res.body.data.token).toBeDefined();

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain(COOKIE_NAME);
    });

    it('should reject registration with duplicate email with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject invalid password format (< 8 chars) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid@devlens.ai',
          password: '123',
          fullName: 'Short Pass',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user and return 200 with JWT cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      authCookie = cookies[0];
      authToken = res.body.data.token;
    });

    it('should reject incorrect password with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated with cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should return user profile when authenticated with Bearer header', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should reject request without authentication with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear authentication cookie and return 200', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toContain(`${COOKIE_NAME}=;`);
    });
  });
});
