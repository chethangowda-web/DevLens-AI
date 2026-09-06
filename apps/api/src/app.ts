import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { correlationIdMiddleware } from './middleware/correlationId';
import { trackHttpMetrics } from './utils/metrics';
import { generalLimiter, aiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler, AppError } from './middleware/errorHandler';
import { healthRouter } from './routes/health.router';
import { metricsRouter } from './routes/metrics.router';
import { authRouter } from './modules/auth/auth.router';
import { projectRouter } from './modules/projects/project.router';
import { ingestionRouter } from './modules/ingestion/ingestion.router';
import { chatRouter } from './modules/chat/chat.router';
import { intelligenceRouter } from './modules/intelligence/intelligence.router';
import { githubRouter } from './modules/github/github.router';

export const createApp = (): Express => {
  const app = express();

  // 1. Correlation ID & Prometheus Tracing Middleware (First in chain)
  app.use(correlationIdMiddleware);
  app.use(trackHttpMetrics);

  // 2. HTTP Security Hardening (Helmet & CORS)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for local dev flexibility
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
    })
  );
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    })
  );

  // 3. Body & Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 4. Structured Request Logging
  app.use(requestLogger);

  // 5. Rate Limiting Rules
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/projects/:projectId/ai', aiLimiter);
  app.use('/api/v1/ai', aiLimiter);
  app.use('/api/v1', generalLimiter);

  // 6. Application Routes
  app.use('/metrics', metricsRouter);
  app.use('/api/v1/metrics', metricsRouter);
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/projects', chatRouter);
  app.use('/api/v1/projects', intelligenceRouter);
  app.use('/api/v1/ai', intelligenceRouter);
  app.use('/api/v1/github', githubRouter);
  app.use('/api/v1', ingestionRouter);

  // 7. 404 Catch-All Route
  app.use((req, _res, next) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // 8. Global Error Handler Middleware
  app.use(errorHandler);

  return app;
};
