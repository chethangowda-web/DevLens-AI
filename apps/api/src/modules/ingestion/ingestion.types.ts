import { z } from 'zod';

export const importGitSchema = z.object({
  gitUrl: z
    .string()
    .url('Invalid URL')
    .refine((url) => url.startsWith('https://'), 'Only HTTPS Git URLs are allowed'),
  branch: z.string().min(1).default('main'),
  name: z.string().min(1).optional(),
});

export type ImportGitInput = z.infer<typeof importGitSchema>;

export interface IngestionJobPayload {
  jobId: string;
  repositoryId: string;
  projectId: string;
  type: 'zip' | 'git';
  zipFilePath?: string;
  gitUrl?: string;
  branch?: string;
}
