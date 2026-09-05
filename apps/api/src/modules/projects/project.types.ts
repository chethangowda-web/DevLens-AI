import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100).trim(),
  description: z.string().max(500).trim().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  fileSizeBytes?: number;
  children?: FileTreeNode[];
}
