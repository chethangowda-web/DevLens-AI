import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { GitHubWebhookService } from '../src/modules/github/githubWebhook.service';
import { CommitGenService } from '../src/modules/github/commitGen.service';
import { PRReviewerService } from '../src/modules/github/prReviewer.service';
import { env } from '../src/config/env';

describe('Phase 12: GitHub Integration & PR Automation Suite', () => {
  const app = createApp();
  const webhookSecret = env.GITHUB_WEBHOOK_SECRET || 'devlens_test_secret';

  describe('Unit: GitHubWebhookService HMAC-SHA256 Verification', () => {
    it('should verify valid HMAC-SHA256 signature correctly', () => {
      const payload = JSON.stringify({ action: 'opened', repository: { full_name: 'test/repo' } });
      const hash = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
      const signature = `sha256=${hash}`;

      const isValid = GitHubWebhookService.verifySignature(payload, signature, webhookSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid or forged HMAC signature', () => {
      const payload = JSON.stringify({ action: 'opened' });
      const signature = `sha256=invalidhash99887766554433221100`;

      const isValid = GitHubWebhookService.verifySignature(payload, signature, webhookSecret);
      expect(isValid).toBe(false);
    });

    it('should reject missing signature or secret', () => {
      expect(GitHubWebhookService.verifySignature('{}', undefined, webhookSecret)).toBe(false);
      expect(GitHubWebhookService.verifySignature('{}', 'sha256=123', '')).toBe(false);
    });

    it('should detect tampered payload with original signature', () => {
      const payloadOriginal = JSON.stringify({ action: 'opened' });
      const payloadTampered = JSON.stringify({ action: 'deleted', evil: true });

      const hash = crypto.createHmac('sha256', webhookSecret).update(payloadOriginal).digest('hex');
      const signature = `sha256=${hash}`;

      const isValid = GitHubWebhookService.verifySignature(payloadTampered, signature, webhookSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('Unit: CommitGenService Conventional Commit Synthesizer', () => {
    const commitGen = new CommitGenService();

    it('should generate feat(auth) Conventional Commit for authentication diffs', async () => {
      const authDiff = `
diff --git a/src/auth/jwt.service.ts b/src/auth/jwt.service.ts
new file mode 100644
index 0000000..1122334
--- /dev/null
+++ b/src/auth/jwt.service.ts
@@ -0,0 +1,15 @@
+export class JwtService {
+  static signToken(payload: any) {
+    return jwt.sign(payload, SECRET);
+  }
+}
      `;

      const result = await commitGen.generateCommitMessage({ diff: authDiff });

      expect(result.commitMessage).toBeTruthy();
      expect(result.type).toBe('feat');
      expect(result.scope).toBe('auth');
      expect(result.commitMessage).toMatch(/^feat(\(auth\))?:/);
    });

    it('should generate test Conventional Commit for test file diffs', async () => {
      const testDiff = `
diff --git a/tests/auth.test.ts b/tests/auth.test.ts
--- a/tests/auth.test.ts
+++ b/tests/auth.test.ts
@@ -10,3 +10,6 @@
+it('should verify token correctly', () => {
+  expect(true).toBe(true);
+});
      `;

      const result = await commitGen.generateCommitMessage({ diff: testDiff });

      expect(result.type).toBe('test');
      expect(result.commitMessage).toMatch(/^test(\(tests\))?:/);
    });

    it('should generate fix Conventional Commit when bug fixes are indicated', async () => {
      const fixDiff = `
diff --git a/src/core/parser.ts b/src/core/parser.ts
--- a/src/core/parser.ts
+++ b/src/core/parser.ts
@@ -5,3 +5,3 @@
-const value = obj.child.name;
+const value = obj?.child?.name ?? 'default'; // fix null reference bug
      `;

      const result = await commitGen.generateCommitMessage({
        diff: fixDiff,
        context: 'fix null reference exception in parser',
      });

      expect(result.type).toBe('fix');
      expect(result.commitMessage).toMatch(/^fix/);
    });
  });

  describe('Unit: PRReviewerService Pull Request Summarizer', () => {
    const prReviewer = new PRReviewerService();

    it('should analyze multi-file PR diff and flag database migration risks', async () => {
      const migrationDiff = `
diff --git a/src/db/migrations/003_add_roles.sql b/src/db/migrations/003_add_roles.sql
new file mode 100644
--- /dev/null
+++ b/src/db/migrations/003_add_roles.sql
@@ -0,0 +1,4 @@
+ALTER TABLE users ADD COLUMN permissions TEXT[];
diff --git a/src/auth/roles.ts b/src/auth/roles.ts
--- a/src/auth/roles.ts
+++ b/src/auth/roles.ts
@@ -1,2 +1,6 @@
+export const checkPermission = (user: any) => user.permissions.includes('admin');
      `;

      const summary = await prReviewer.summarizeAndReviewPR({
        diff: migrationDiff,
        prTitle: 'feat: Add Role-based permissions',
        prNumber: 42,
      });

      expect(summary.prNumber).toBe(42);
      expect(summary.prTitle).toBe('feat: Add Role-based permissions');
      expect(summary.whatChanged.length).toBeGreaterThanOrEqual(1);
      expect(summary.potentialRisks.length).toBeGreaterThanOrEqual(1);
      expect(summary.score).toBeDefined();

      const migrationRisk = summary.potentialRisks.find((r) => r.toLowerCase().includes('database') || r.toLowerCase().includes('migration'));
      expect(migrationRisk).toBeDefined();
    });
  });

  describe('Integration: GitHub Webhooks Endpoint', () => {
    it('should reject webhook request with invalid HMAC signature with 401', async () => {
      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('x-hub-signature-256', 'sha256=invalidhexsignature000000000000000000000000000000000000000000000000')
        .send({ action: 'opened' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should accept webhook request with valid HMAC signature with 200 OK', async () => {
      const payload = { action: 'opened', pull_request: { number: 10, title: 'Sample PR' } };
      const payloadString = JSON.stringify(payload);
      const hash = crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');

      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('x-hub-signature-256', `sha256=${hash}`)
        .set('x-github-event', 'pull_request')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.received).toBe(true);
    });
  });
});
