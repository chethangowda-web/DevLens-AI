import { projectRepository } from './project.repository';
import { buildFileTree } from '../../utils/fileTree.util';
import { AppError } from '../../middleware/errorHandler';
import { CreateProjectInput, FileTreeNode } from './project.types';
import { Project, Repository, CodeFile } from '@devlens/types';

export class ProjectService {
  static async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    const project = await projectRepository.createProject(userId, input.name, input.description);
    return project;
  }

  static async getUserProjects(userId: string): Promise<Array<Project & { repositories: Repository[] }>> {
    return projectRepository.getProjectsByUserId(userId);
  }

  static async getProjectDetails(
    projectId: string,
    userId: string
  ): Promise<Project & { repositories: Repository[] }> {
    const project = await projectRepository.getProjectById(projectId, userId);
    if (!project) {
      throw AppError.notFound('Project not found');
    }
    return project;
  }

  static async deleteProject(projectId: string, userId: string): Promise<void> {
    const deleted = await projectRepository.deleteProject(projectId, userId);
    if (!deleted) {
      throw AppError.notFound('Project not found or unauthorized');
    }
  }

  static async getRepositoryFileTree(
    repositoryId: string,
    userId: string
  ): Promise<{ repository: Repository; fileTree: FileTreeNode[] }> {
    const repo = await projectRepository.getRepositoryById(repositoryId);
    if (!repo) {
      throw AppError.notFound('Repository not found');
    }

    // Verify project belongs to user
    const project = await projectRepository.getProjectById(repo.projectId, userId);
    if (!project) {
      throw AppError.forbidden('Unauthorized access to repository');
    }

    const files = await projectRepository.getFilesByRepositoryId(repositoryId);
    const fileTree = buildFileTree(files);

    return { repository: repo, fileTree };
  }

  static async getFileContent(fileId: string, userId: string): Promise<{ file: CodeFile; content: string }> {
    const file = await projectRepository.getFileById(fileId);
    if (!file) {
      throw AppError.notFound('File not found');
    }

    const repo = await projectRepository.getRepositoryById(file.repositoryId);
    if (!repo) {
      throw AppError.notFound('Repository not found');
    }

    const project = await projectRepository.getProjectById(repo.projectId, userId);
    if (!project) {
      throw AppError.forbidden('Unauthorized access to file');
    }

    const content = await projectRepository.getFileContentFromChunks(fileId);
    return { file, content };
  }
}
