import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';
import { ApiResponseUtil } from '../../utils/apiResponse';
import { createProjectSchema } from './project.types';

import { hybridSearch } from '../rag/retrieval.service';

export class ProjectController {
  static async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input = createProjectSchema.parse(req.body);
      const project = await ProjectService.createProject(userId, input);
      ApiResponseUtil.created(res, { project });
    } catch (error) {
      next(error);
    }
  }

  static async getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projects = await ProjectService.getUserProjects(userId);
      ApiResponseUtil.success(res, { projects });
    } catch (error) {
      next(error);
    }
  }

  static async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId as string;
      const project = await ProjectService.getProjectDetails(projectId, userId);
      ApiResponseUtil.success(res, { project });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId as string;
      await ProjectService.deleteProject(projectId, userId);
      ApiResponseUtil.success(res, { message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getRepositoryFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const repoId = req.params.repositoryId as string;
      const data = await ProjectService.getRepositoryFileTree(repoId, userId);
      ApiResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getFileContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const fileId = req.params.fileId as string;
      const data = await ProjectService.getFileContent(fileId, userId);
      ApiResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async searchRepository(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const repoId = req.params.repositoryId as string;
      const { query, limit } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid query string' });
        return;
      }
      
      // We will delegate to a new search function inside ProjectService or RagService.
      // Since hybridSearch is in rag module, we can call it here directly for now,
      // but ideally we should verify user has access to repoId first.
      await ProjectService.getRepositoryFileTree(repoId, userId); // verify access
      
      const results = await hybridSearch(repoId, query, limit || 8);
      
      ApiResponseUtil.success(res, { results });
    } catch (error) {
      next(error);
    }
  }
}
