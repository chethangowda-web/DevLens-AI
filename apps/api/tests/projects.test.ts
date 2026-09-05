import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';

describe('Project Management API Suite', () => {
  const app = createApp();

  const userA = {
    email: `proju_a_${Date.now()}@devlens.ai`,
    password: 'Password123!',
    fullName: 'Project User A',
  };

  let userACookie: string;
  let createdProjectId: string;

  beforeAll(async () => {
    // Register user
    const res = await request(app).post('/api/v1/auth/register').send(userA);
    const cookies = res.headers['set-cookie'];
    userACookie = cookies[0];
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM users WHERE email = $1', [userA.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project successfully', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', userACookie)
        .send({
          name: 'Microservices Monorepo',
          description: 'Auth, payment, and inventory services',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.name).toBe('Microservices Monorepo');
      expect(res.body.data.project.description).toBe('Auth, payment, and inventory services');
      expect(res.body.data.project.id).toBeDefined();

      createdProjectId = res.body.data.project.id;
    });

    it('should reject creation without auth with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .send({ name: 'Unauthorized Project' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should list all projects for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data.projects.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.projects[0].name).toBe('Microservices Monorepo');
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should return project details with linked repositories', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${createdProjectId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.id).toBe(createdProjectId);
      expect(Array.isArray(res.body.data.project.repositories)).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userACookie);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should delete project successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${createdProjectId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it no longer exists
      const check = await request(app)
        .get(`/api/v1/projects/${createdProjectId}`)
        .set('Cookie', userACookie);

      expect(check.status).toBe(404);
    });
  });
});
