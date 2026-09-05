import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';

jest.mock('../src/modules/rag/embedding.service', () => ({
  generateEmbeddings: jest.fn().mockImplementation(async (texts: string[]) => {
    return texts.map(() => new Array(1536).fill(0.1));
  }),
}));

describe('RAG Retrieval Suite (Phase 8)', () => {
  const app = createApp();

  const user = {
    email: `retrieval_${Date.now()}@devlens.ai`,
    password: 'Password123!',
    fullName: 'Retrieval Tester',
  };

  let authCookie: string;
  let projectId: string;
  let repoId: string;

  beforeAll(async () => {
    // 1. Register and get token
    const authRes = await request(app).post('/api/v1/auth/register').send(user);
    authCookie = authRes.headers['set-cookie'][0];

    // 2. Create Project
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Retrieval Test Project' });
    projectId = projRes.body.data.project.id;

    // 3. Create a Repo manually in DB to skip background worker
    const repoRes = await db.query(
      `INSERT INTO repositories (project_id, name, git_url, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [projectId, 'Test Repo', 'https://github.com/test/test', 'INDEXED']
    );
    repoId = repoRes.rows[0].id;

    // 4. Create dummy file and chunks
    const fileRes = await db.query(
      `INSERT INTO code_files (repository_id, file_path, language, file_size_bytes, file_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [repoId, 'src/test.ts', 'typescript', 100, 'hash123']
    );
    const fileId = fileRes.rows[0].id;

    const dummyVector = `[${new Array(1536).fill(0.1).join(',')}]`;
    
    // Chunk 1: target for "Authentication mechanism"
    await db.query(
      `INSERT INTO code_chunks (file_id, content, embedding, start_line, end_line, symbol_name, symbol_type, chunk_hash)
       VALUES ($1, $2, $3::vector, $4, $5, $6, $7, $8)`,
      [fileId, 'function authenticateUser() { return true; }', dummyVector, 1, 3, 'authenticateUser', 'function', 'hashA']
    );

    // Chunk 2: random noise
    await db.query(
      `INSERT INTO code_chunks (file_id, content, embedding, start_line, end_line, symbol_name, symbol_type, chunk_hash)
       VALUES ($1, $2, $3::vector, $4, $5, $6, $7, $8)`,
      [fileId, 'function doMath() { return 1 + 1; }', dummyVector, 5, 7, 'doMath', 'function', 'hashB']
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [user.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('Integration: Hybrid Search Endpoint', () => {
    it('should return 400 for missing query', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/repositories/${repoId}/search`)
        .set('Cookie', authCookie)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return matching chunks for valid query', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/repositories/${repoId}/search`)
        .set('Cookie', authCookie)
        .send({ query: 'authenticate user', limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeInstanceOf(Array);
      
      const results = res.body.data.results;
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('authenticateUser');
    });
  });
});
