import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import { IngestionService } from './ingestion.service';
import { ApiResponseUtil } from '../../utils/apiResponse';
import { importGitSchema } from './ingestion.types';
import { AppError } from '../../middleware/errorHandler';

// Multer Storage Configuration (saves to /tmp/devlens-workspaces/uploads)
const uploadDir = path.join(env.TEMP_WORKSPACE_DIR, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

export const zipUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_REPO_SIZE_MB * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.zip') {
      return cb(new Error('Only .zip archive uploads are permitted'));
    }
    cb(null, true);
  },
});

export class IngestionController {
  static async uploadZip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw AppError.badRequest('Please upload a .zip file');
      }

      const userId = req.user!.userId;
      const projectId = req.params.projectId as string;
      const repoName = (req.body.name as string) || req.file.originalname.replace(/\.zip$/i, '');

      const result = await IngestionService.enqueueZipIngestion(
        projectId,
        userId,
        req.file.path,
        repoName
      );

      ApiResponseUtil.success(
        res,
        {
          ...result,
          status: 'QUEUED',
          message: 'Repository ZIP uploaded and enqueued for background indexing.',
        },
        202
      );
    } catch (error) {
      next(error);
    }
  }

  static async importGit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId as string;
      const input = importGitSchema.parse(req.body);

      const result = await IngestionService.enqueueGitIngestion(projectId, userId, input);

      ApiResponseUtil.success(
        res,
        {
          ...result,
          status: 'QUEUED',
          message: 'Git clone request enqueued for background indexing.',
        },
        202
      );
    } catch (error) {
      next(error);
    }
  }

  static async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = req.params.jobId as string;
      const status = await IngestionService.getJobStatus(jobId, userId);
      ApiResponseUtil.success(res, status);
    } catch (error) {
      next(error);
    }
  }
}
