import { Router } from 'express';
import { ProjectController } from './project.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const projectRouter: Router = Router();

// All project & repo routes require authentication
projectRouter.use(requireAuth);

projectRouter.post('/', ProjectController.createProject);
projectRouter.get('/', ProjectController.getProjects);
projectRouter.get('/:projectId', ProjectController.getProject);
projectRouter.delete('/:projectId', ProjectController.deleteProject);

// Repository file browsing
projectRouter.get('/repositories/:repositoryId/files', ProjectController.getRepositoryFiles);
projectRouter.get('/files/:fileId/content', ProjectController.getFileContent);

// Repository search
projectRouter.post('/:projectId/repositories/:repositoryId/search', ProjectController.searchRepository);
