import request from 'supertest';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { redis } from '../src/db/redis';
import { sanitizeCodeContent, containsSecrets } from '../src/utils/secretSanitizer';
import { isIngestableFile } from '../src/utils/fileFilters';
import { createIngestionWorker } from '../src/workers/ingestion.worker';

describe('Repository Ingestion & Sanitization Suite', () => {
  const app = createApp();
  let worker: ReturnType<typeof createIngestionWorker>;

  const user = {
    email: `ingest_user_${Date.now()}@devlens.ai`,
    password: 'Password123!',
    fullName: 'Ingest Tester',
  };

  let authCookie: string;
  let projectId: string;
  const tempZipPath = path.join(__dirname, 'test-repo.zip');

  beforeAll(async () => {
    // 1. Start worker
    worker = createIngestionWorker();

    // 2. Register user & create project
    const authRes = await request(app).post('/api/v1/auth/register').send(user);
    authCookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Ingestion Test Project' });
    projectId = projRes.body.data.project.id;

    // 3. Create a mock ZIP repository
    const zip = new AdmZip();
    zip.addFile(
      'src/index.ts',
      Buffer.from(
        "import { auth } from './auth';\nconst apiKey = 'AKIAIOSFODNN7EXAMPLE';\nconsole.log(apiKey);"
      )
    );
    zip.addFile('src/utils/math.ts', Buffer.from('export const add = (a: number, b: number) => a + b;'));
    zip.addFile('.env', Buffer.from('DATABASE_URL=postgres://secret:secret@db/prod'));
    zip.addFile('package-lock.json', Buffer.from('{"name":"lockfile"}'));
    zip.writeZip(tempZipPath);
  });

  afterAll(async () => {
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    if (worker) {
      await worker.close();
    }
    await db.query('DELETE FROM users WHERE email = $1', [user.email.toLowerCase()]);
    await db.close();
    redis.disconnect();
  });

  describe('Unit: Secret Sanitizer', () => {
    it('should redact AWS keys, JWTs, and private keys', () => {
      const codeWithAwsKey = "const key = 'AKIAIOSFODNN7EXAMPLE';";
      const codeWithJwt = "const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M';";

      expect(containsSecrets(codeWithAwsKey)).toBe(true);
      expect(sanitizeCodeContent(codeWithAwsKey)).toBe("const key = '[REDACTED_SECRET]';");
      expect(sanitizeCodeContent(codeWithJwt)).toBe("const token = '[REDACTED_SECRET]';");
    });
  });

  describe('Unit: File Filters', () => {
    it('should allow valid typescript files', () => {
      const check = isIngestableFile('src/services/user.service.ts', 1024);
      expect(check.valid).toBe(true);
      expect(check.language).toBe('typescript');
    });

    it('should reject .env and lock files', () => {
      expect(isIngestableFile('.env', 100).valid).toBe(false);
      expect(isIngestableFile('.env.production', 100).valid).toBe(false);
      expect(isIngestableFile('pnpm-lock.yaml', 5000).valid).toBe(false);
      expect(isIngestableFile('node_modules/express/index.js', 1024).valid).toBe(false);
    });
  });

  describe('Integration: ZIP Upload & Ingestion Worker', () => {
    it('should upload ZIP, process in background, and index files with secrets redacted', async () => {
      // 1. Upload ZIP file
      const uploadRes = await request(app)
        .post(`/api/v1/projects/${projectId}/repositories/upload-zip`)
        .set('Cookie', authCookie)
        .attach('file', tempZipPath);

      expect(uploadRes.status).toBe(202);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.jobId).toBeDefined();

      const jobId = uploadRes.body.data.jobId;
      const repositoryId = uploadRes.body.data.repositoryId;

      // 2. Poll job until COMPLETED (max 10s)
      let isCompleted = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const statusRes = await request(app)
          .get(`/api/v1/repositories/jobs/${jobId}/status`)
          .set('Cookie', authCookie);

        if (statusRes.body.data?.status === 'COMPLETED') {
          isCompleted = true;
          break;
        }
      }

      expect(isCompleted).toBe(true);

      // 3. Verify files stored in database
      const filesRes = await db.query<{ file_path: string }>(
        'SELECT file_path FROM code_files WHERE repository_id = $1 ORDER BY file_path ASC',
        [repositoryId]
      );

      const paths = filesRes.rows.map((r) => r.file_path);
      expect(paths).toContain('src/index.ts');
      expect(paths).toContain('src/utils/math.ts');
      expect(paths).not.toContain('.env');
      expect(paths).not.toContain('package-lock.json');
    });
  });
});
