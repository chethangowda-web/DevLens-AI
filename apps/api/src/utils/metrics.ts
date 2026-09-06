import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a custom Prometheus registry
export const register = new client.Registry();

// Add default process & OS metrics (CPU, Memory, Event Loop delay)
client.collectDefaultMetrics({ register, prefix: 'devlens_' });

// 1. HTTP Request Counter
export const httpRequestsTotal = new client.Counter({
  name: 'devlens_http_requests_total',
  help: 'Total number of HTTP requests processed by DevLens API',
  labelNames: ['method', 'route', 'status'],
});
register.registerMetric(httpRequestsTotal);

// 2. HTTP Request Duration Histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'devlens_http_request_duration_seconds',
  help: 'HTTP request execution latency histogram in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDurationSeconds);

// 3. AI Token Counter
export const aiTokensTotal = new client.Counter({
  name: 'devlens_ai_tokens_total',
  help: 'Total AI LLM prompt and completion tokens consumed',
  labelNames: ['provider', 'type'],
});
register.registerMetric(aiTokensTotal);

// 4. Database Query Latency Histogram
export const dbQueryDurationSeconds = new client.Histogram({
  name: 'devlens_db_query_duration_seconds',
  help: 'PostgreSQL database query execution duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});
register.registerMetric(dbQueryDurationSeconds);

/**
 * Express middleware to record HTTP latency and request count metrics
 */
export const trackHttpMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route?.path || req.path || 'unknown';
    const status = res.statusCode.toString();

    httpRequestsTotal.inc({ method: req.method, route, status });
    httpRequestDurationSeconds.observe({ method: req.method, route, status }, durationInSeconds);
  });

  next();
};

/**
 * Helper to record AI token usage
 */
export const recordAITokens = (provider: string, type: 'prompt' | 'completion', count: number): void => {
  if (count > 0) {
    aiTokensTotal.inc({ provider, type }, count);
  }
};
