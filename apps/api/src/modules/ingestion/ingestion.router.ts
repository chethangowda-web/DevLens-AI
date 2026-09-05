import { Router } from 'express';
import { IngestionController, zipUpload } from './ingestion.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const ingestionRouter: Router = Router();

// Ingestion triggers for a specific project
ingestionRouter.post(
  '/projects/:projectId/repositories/upload-zip',
  requireAuth,
  zipUpload.single('file'),
  IngestionController.uploadZip
);

ingestionRouter.post(
  '/projects/:projectId/repositories/import-git',
  requireAuth,
  IngestionController.importGit
);

// Job polling endpoint
ingestionRouter.get(
  '/repositories/jobs/:jobId/status',
  requireAuth,
  IngestionController.getJobStatus
);
