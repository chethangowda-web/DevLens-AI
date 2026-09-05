import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';
import { DebuggerService } from '../src/modules/intelligence/debugger.service';
import { ExplainerService } from '../src/modules/intelligence/explainer.service';

describe('Specialized Code Intelligence Suite (Phase 10)', () => {
  const app = createApp();

  const user = {
    email: `intelligence_${Date.now()}@devlens.ai`,
    password: 'Password123!',
    fullName: 'Intelligence Tester',
  };

  let authCookie: string;
  let projectId: string;

  beforeAll(async () => {
    // 1. Register user
    const authRes = await request(app).post('/api/v1/auth/register').send(user);
    authCookie = authRes.headers['set-cookie'][0];

    // 2. Create Project
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Intelligence Test Project' });
    projectId = projRes.body.data.project.id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [user.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('Unit: DebuggerService Stack Trace Parser', () => {
    it('should parse Node.js V8 stack traces correctly', () => {
      const trace = `TypeError: Cannot read properties of undefined (reading 'split')
    at parseUserToken (src/auth/token.service.ts:24:18)
    at Object.authenticate (src/middleware/auth.ts:45:10)
    at /app/node_modules/express/lib/router/layer.js:95:5`;

      const parsed = DebuggerService.parseStackTrace(trace);

      expect(parsed.errorType).toBe('TypeError');
      expect(parsed.errorMessage).toContain("reading 'split'");
      expect(parsed.frames.length).toBeGreaterThanOrEqual(2);
      expect(parsed.frames[0].filePath).toBe('src/auth/token.service.ts');
      expect(parsed.frames[0].lineNumber).toBe(24);
      expect(parsed.frames[0].columnNumber).toBe(18);
      expect(parsed.frames[0].functionName).toBe('parseUserToken');
    });

    it('should parse Python traceback format correctly', () => {
      const trace = `ZeroDivisionError: division by zero
  File "src/math/calculator.py", line 18, in calculate_average
  File "src/server.py", line 55, in handle_request`;

      const parsed = DebuggerService.parseStackTrace(trace);

      expect(parsed.errorType).toBe('ZeroDivisionError');
      expect(parsed.errorMessage).toBe('division by zero');
      expect(parsed.frames.length).toBe(2);
      expect(parsed.frames[0].filePath).toBe('src/math/calculator.py');
      expect(parsed.frames[0].lineNumber).toBe(18);
      expect(parsed.frames[0].functionName).toBe('calculate_average');
    });
  });

  describe('Unit: ExplainerService', () => {
    it('should return structured complexity analysis and line explanations', async () => {
      const explainer = new ExplainerService();
      const code = `function findDuplicates(items: string[]) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) return true;
    seen.add(item);
  }
  return false;
}`;

      const res = await explainer.explainCode({
        code,
        language: 'typescript',
        targetAudience: 'architect',
      });

      expect(res.summary).toBeTruthy();
      expect(res.complexity.time).toContain('O(N)');
      expect(res.complexity.space).toContain('O(N)');
      expect(res.lineByLine.length).toBeGreaterThan(0);
      expect(res.keyConcepts.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Intelligence Endpoints', () => {
    describe('POST /api/v1/projects/:projectId/ai/explain', () => {
      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/explain`)
          .send({ code: 'const x = 1;' });

        expect(res.status).toBe(401);
      });

      it('should reject request missing code', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/explain`)
          .set('Cookie', authCookie)
          .send({ code: '' });

        expect(res.status).toBe(400);
      });

      it('should explain code and return 200 OK', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/explain`)
          .set('Cookie', authCookie)
          .send({
            code: 'export const add = (a: number, b: number) => a + b;',
            language: 'typescript',
            targetAudience: 'beginner',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.summary).toBeTruthy();
        expect(res.body.data.complexity.time).toBeTruthy();
      });
    });

    describe('POST /api/v1/projects/:projectId/ai/debug', () => {
      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/debug`)
          .send({ stackTrace: 'Error: crash' });

        expect(res.status).toBe(401);
      });

      it('should reject request missing stack trace', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/debug`)
          .set('Cookie', authCookie)
          .send({});

        expect(res.status).toBe(400);
      });

      it('should diagnose stack trace and return structured diff', async () => {
        const res = await request(app)
          .post(`/api/v1/projects/${projectId}/ai/debug`)
          .set('Cookie', authCookie)
          .send({
            stackTrace: `ReferenceError: token is not defined\n    at verify (src/auth/jwt.ts:12:5)`,
            code: `export const verify = () => { return token.isValid; };`,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.rootCause).toBeTruthy();
        expect(res.body.data.suggestedFix).toBeTruthy();
        expect(res.body.data.originalCode).toBeTruthy();
        expect(res.body.data.modifiedCode).toBeTruthy();
        expect(res.body.data.unifiedDiff).toBeTruthy();
      });
    });
  });
});
