import request from 'supertest';
import { createApp } from '../src/app';
import { recordAITokens } from '../src/utils/metrics';

describe('Phase 13: Observability, Correlation ID & Security Suite', () => {
  const app = createApp();

  describe('Integration: Prometheus Metrics (/metrics)', () => {
    it('should expose Prometheus plain-text scrape metrics on GET /metrics', async () => {
      // Record sample metrics
      recordAITokens('openai', 'prompt', 150);
      recordAITokens('openai', 'completion', 75);

      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('devlens_http_requests_total');
      expect(res.text).toContain('devlens_http_request_duration_seconds');
      expect(res.text).toContain('devlens_ai_tokens_total');
    });

    it('should expose metrics on GET /api/v1/metrics alias', async () => {
      const res = await request(app).get('/api/v1/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Integration: X-Correlation-ID Tracing Middleware', () => {
    it('should auto-generate X-Correlation-ID header on incoming requests', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-correlation-id']).toMatch(/^c_/);
    });

    it('should preserve and echo custom incoming X-Correlation-ID header', async () => {
      const customId = 'trace-id-abc-123-xyz';

      const res = await request(app)
        .get('/metrics')
        .set('X-Correlation-ID', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('Integration: HTTP Security Hardening & Rate Limiting', () => {
    it('should include Helmet security headers (X-Frame-Options, X-Content-Type-Options)', async () => {
      const res = await request(app).get('/metrics');

      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should attach standard RateLimit headers to API requests', async () => {
      const res = await request(app).get('/api/v1/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
