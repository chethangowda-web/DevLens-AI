import request from 'supertest';
import { createApp } from '../src/app';
import path from 'path';
import fs from 'fs';

describe('Phase 14: Production Readiness & Container Health Checks', () => {
  const app = createApp();

  describe('Docker Build Artefact Validation', () => {
    it('should have Dockerfile.api in docker/ directory', () => {
      const dockerfilePath = path.resolve(__dirname, '../../../docker/Dockerfile.api');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('should have Dockerfile.web in docker/ directory', () => {
      const dockerfilePath = path.resolve(__dirname, '../../../docker/Dockerfile.web');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('should have nginx.conf in docker/ directory', () => {
      const nginxPath = path.resolve(__dirname, '../../../docker/nginx.conf');
      expect(fs.existsSync(nginxPath)).toBe(true);
    });

    it('should have production docker-compose file', () => {
      const composePath = path.resolve(__dirname, '../../../docker/docker-compose.prod.yml');
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('Dockerfile.api should use multi-stage build pattern', () => {
      const dockerfilePath = path.resolve(__dirname, '../../../docker/Dockerfile.api');
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS production');
      expect(content).toContain('USER devlens'); // Non-root user
      expect(content).toContain('HEALTHCHECK');
    });

    it('nginx.conf should disable proxy buffering for SSE streaming', () => {
      const nginxPath = path.resolve(__dirname, '../../../docker/nginx.conf');
      const content = fs.readFileSync(nginxPath, 'utf8');
      expect(content).toContain('proxy_buffering off');
      expect(content).toContain('X-Accel-Buffering no');
    });

    it('nginx.conf should include security headers', () => {
      const nginxPath = path.resolve(__dirname, '../../../docker/nginx.conf');
      const content = fs.readFileSync(nginxPath, 'utf8');
      expect(content).toContain('X-Frame-Options');
      expect(content).toContain('X-Content-Type-Options');
      expect(content).toContain('server_tokens off');
    });
  });

  describe('GitHub Actions CI/CD Workflows', () => {
    it('should have CI workflow file', () => {
      const ciPath = path.resolve(__dirname, '../../../.github/workflows/ci.yml');
      expect(fs.existsSync(ciPath)).toBe(true);
    });

    it('should have deploy workflow file', () => {
      const deployPath = path.resolve(__dirname, '../../../.github/workflows/deploy.yml');
      expect(fs.existsSync(deployPath)).toBe(true);
    });

    it('CI workflow should include typecheck and test jobs', () => {
      const ciPath = path.resolve(__dirname, '../../../.github/workflows/ci.yml');
      const content = fs.readFileSync(ciPath, 'utf8');
      expect(content).toContain('lint-and-typecheck');
      expect(content).toContain('test');
      expect(content).toContain('pnpm install --frozen-lockfile');
    });

    it('deploy workflow should use Docker build-push-action', () => {
      const deployPath = path.resolve(__dirname, '../../../.github/workflows/deploy.yml');
      const content = fs.readFileSync(deployPath, 'utf8');
      expect(content).toContain('docker/build-push-action');
      expect(content).toContain('build-and-push');
      expect(content).toContain('ghcr.io');
    });
  });

  describe('Health & Metrics Endpoints (Production Readiness)', () => {
    it('health router source should define GET / handler', () => {
      // Validate the health router exists and defines the required route
      const healthRouterPath = path.resolve(__dirname, '../src/routes/health.router.ts');
      expect(fs.existsSync(healthRouterPath)).toBe(true);
      const content = fs.readFileSync(healthRouterPath, 'utf8');
      expect(content).toContain('healthRouter');
      expect(content).toContain("healthRouter.get('/', ");
      expect(content).toContain('db.healthCheck()');
      expect(content).toContain('redisHealthCheck()');
    });

    it('metrics router source should expose Prometheus /metrics endpoint', () => {
      const metricsRouterPath = path.resolve(__dirname, '../src/routes/metrics.router.ts');
      expect(fs.existsSync(metricsRouterPath)).toBe(true);
      const content = fs.readFileSync(metricsRouterPath, 'utf8');
      expect(content).toContain('register');
      expect(content).toContain('metrics');
    });

    it('GET /metrics should return Prometheus text format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('devlens_');
    });

    it('should set Helmet security headers on all responses', async () => {
      // Use /metrics — it does not probe external services so it resolves immediately
      const res = await request(app).get('/metrics');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should handle unknown routes with 404 JSON response', async () => {
      const res = await request(app).get('/this-route-does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('.dockerignore Validation', () => {
    it('should have .dockerignore file at workspace root', () => {
      const dockerignorePath = path.resolve(__dirname, '../../../.dockerignore');
      expect(fs.existsSync(dockerignorePath)).toBe(true);
    });

    it('.dockerignore should exclude node_modules and .git', () => {
      const dockerignorePath = path.resolve(__dirname, '../../../.dockerignore');
      const content = fs.readFileSync(dockerignorePath, 'utf8');
      expect(content).toContain('node_modules');
      expect(content).toContain('.git');
      expect(content).toContain('.env');
    });
  });
});
