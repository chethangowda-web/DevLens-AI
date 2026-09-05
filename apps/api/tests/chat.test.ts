import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';
import { PromptBuilder } from '../src/modules/ai/promptBuilder';
import { OpenAIAdapter } from '../src/modules/ai/openai.adapter';

jest.mock('../src/modules/rag/embedding.service', () => ({
  generateEmbeddings: jest.fn().mockImplementation(async (texts: string[]) => {
    return texts.map(() => new Array(1536).fill(0.1));
  }),
}));

describe('Chat & RAG Assistant Suite (Phase 9)', () => {
  const app = createApp();

  const user = {
    email: `chat_test_${Date.now()}@devlens.ai`,
    password: 'Password123!',
    fullName: 'Chat Tester',
  };

  let authCookie: string;
  let projectId: string;
  let repoId: string;

  beforeAll(async () => {
    // 1. Register user
    const authRes = await request(app).post('/api/v1/auth/register').send(user);
    authCookie = authRes.headers['set-cookie'][0];

    // 2. Create Project
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Chat AI Test Project' });
    projectId = projRes.body.data.project.id;

    // 3. Create a Repo
    const repoRes = await db.query(
      `INSERT INTO repositories (project_id, name, git_url, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [projectId, 'Chat Test Repo', 'https://github.com/test/chat', 'INDEXED']
    );
    repoId = repoRes.rows[0].id;

    // 4. Create dummy file and chunk
    const fileRes = await db.query(
      `INSERT INTO code_files (repository_id, file_path, language, file_size_bytes, file_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [repoId, 'src/auth/jwt.service.ts', 'typescript', 120, 'hashJWT']
    );
    const fileId = fileRes.rows[0].id;

    const dummyVector = `[${new Array(1536).fill(0.1).join(',')}]`;
    await db.query(
      `INSERT INTO code_chunks (file_id, content, embedding, start_line, end_line, symbol_name, symbol_type, chunk_hash)
       VALUES ($1, $2, $3::vector, $4, $5, $6, $7, $8)`,
      [
        fileId,
        'export const verifyToken = (token: string) => { return jwt.verify(token, secret); };',
        dummyVector,
        10,
        25,
        'verifyToken',
        'function',
        'hashJWTChunk',
      ]
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [user.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('Unit: PromptBuilder', () => {
    it('should format system prompt and user message with XML context chunks', () => {
      const messages = PromptBuilder.buildMessages({
        query: 'How is token verification handled?',
        contextChunks: [
          {
            id: 'chunk-1',
            file_path: 'src/auth/jwt.service.ts',
            content: 'export const verifyToken = () => {}',
            start_line: 10,
            end_line: 25,
            symbol_name: 'verifyToken',
            symbol_type: 'function',
            score: 0.95,
          },
        ],
        mode: 'explain',
      });

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Deep Code Explanation Mode');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('<context_chunk');
      expect(messages[1].content).toContain('src/auth/jwt.service.ts');
      expect(messages[1].content).toContain('How is token verification handled?');
    });
  });

  describe('Unit: OpenAIAdapter Streaming Fallback', () => {
    it('should simulate stream deltas when API key is not present', async () => {
      const adapter = new OpenAIAdapter();
      const deltas: string[] = [];

      const result = await adapter.generateStream(
        [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'Explain code <context_chunk>test</context_chunk>' },
        ],
        (delta) => {
          deltas.push(delta);
        }
      );

      expect(deltas.length).toBeGreaterThan(0);
      expect(result.fullContent).toBeTruthy();
      expect(result.promptTokens).toBeGreaterThan(0);
      expect(result.completionTokens).toBeGreaterThan(0);
    });
  });

  describe('Integration: Conversation Management Endpoints', () => {
    let createdConvId: string;

    it('should create a new conversation for project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/conversations`)
        .set('Cookie', authCookie)
        .send({ title: 'My Custom Conversation' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('My Custom Conversation');
      createdConvId = res.body.data.id;
    });

    it('should list conversations for project', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/conversations`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: any) => c.id === createdConvId)).toBe(true);
    });

    it('should get messages for conversation (initially empty)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/conversations/${createdConvId}/messages`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should delete a conversation', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/conversations/${createdConvId}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Integration: SSE Streaming RAG Chat', () => {
    it('should reject unauthenticated chat requests', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/chat`)
        .send({ message: 'Hello' });

      expect(res.status).toBe(401);
    });

    it('should stream citations, deltas, and done event for RAG query', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/repositories/${repoId}/chat`)
        .set('Cookie', authCookie)
        .send({
          message: 'Where is verifyToken defined?',
          mode: 'chat',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');

      const bodyText = res.text;
      expect(bodyText).toContain('event: citation');
      expect(bodyText).toContain('src/auth/jwt.service.ts');
      expect(bodyText).toContain('event: delta');
      expect(bodyText).toContain('event: done');
    });
  });
});
