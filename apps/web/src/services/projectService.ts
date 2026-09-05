import { apiClient } from './apiClient';
import { Project, Repository, ApiResponse } from '@devlens/types';

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  fileSizeBytes?: number;
  children?: FileTreeNode[];
}

export const projectService = {
  async getProjects(): Promise<Array<Project & { repositories: Repository[] }>> {
    const res = await apiClient.get<ApiResponse<{ projects: Array<Project & { repositories: Repository[] }> }>>(
      '/projects'
    );
    return res.data.data?.projects || [];
  },

  async getProject(projectId: string): Promise<Project & { repositories: Repository[] }> {
    const res = await apiClient.get<ApiResponse<{ project: Project & { repositories: Repository[] } }>>(
      `/projects/${projectId}`
    );
    if (!res.data.data?.project) throw new Error('Project not found');
    return res.data.data.project;
  },

  async createProject(name: string, description?: string): Promise<Project> {
    const res = await apiClient.post<ApiResponse<{ project: Project }>>('/projects', {
      name,
      description,
    });
    if (!res.data.data?.project) throw new Error('Failed to create project');
    return res.data.data.project;
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`);
  },

  async getRepositoryFileTree(
    repositoryId: string
  ): Promise<{ repository: Repository; fileTree: FileTreeNode[] }> {
    const res = await apiClient.get<
      ApiResponse<{ repository: Repository; fileTree: FileTreeNode[] }>
    >(`/projects/repositories/${repositoryId}/files`);
    if (!res.data.data) throw new Error('Failed to load file tree');
    return res.data.data;
  },

  async getFileContent(fileId: string): Promise<string> {
    const res = await apiClient.get<ApiResponse<{ content: string }>>(
      `/projects/files/${fileId}/content`
    );
    return res.data.data?.content || '';
  },
};
