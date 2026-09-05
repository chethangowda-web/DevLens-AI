import { db } from '../../db/client';
import { ingestionQueue } from './ingestion.queue';
import { projectRepository } from '../projects/project.repository';
import { AppError } from '../../middleware/errorHandler';
import { ImportGitInput, IngestionJobPayload } from './ingestion.types';

export class IngestionService {
  static async enqueueZipIngestion(
    projectId: string,
    userId: string,
    zipFilePath: string,
    repositoryName = 'uploaded-repo'
  ): Promise<{ jobId: string; repositoryId: string }> {
    // 1. Verify project ownership
    const project = await projectRepository.getProjectById(projectId, userId);
    if (!project) {
      throw AppError.notFound('Project not found');
    }

    // 2. Create repository entry if not exists
    let repo = project.repositories.find((r) => r.name === repositoryName);
    if (!repo) {
      repo = await projectRepository.createRepository(projectId, repositoryName);
    }

    // 3. Create ingestion job entry in DB
    const jobRes = await db.query<{ id: string }>(
      `INSERT INTO ingestion_jobs (repository_id, status, progress_percent)
       VALUES ($1, 'QUEUED', 0)
       RETURNING id`,
      [repo.id]
    );
    const jobId = jobRes.rows[0].id;

    // 4. Push job to BullMQ queue
    const payload: IngestionJobPayload = {
      jobId,
      repositoryId: repo.id,
      projectId,
      type: 'zip',
      zipFilePath,
    };
    await ingestionQueue.add('process-zip', payload);

    return { jobId, repositoryId: repo.id };
  }

  static async enqueueGitIngestion(
    projectId: string,
    userId: string,
    input: ImportGitInput
  ): Promise<{ jobId: string; repositoryId: string }> {
    // 1. Verify project ownership
    const project = await projectRepository.getProjectById(projectId, userId);
    if (!project) {
      throw AppError.notFound('Project not found');
    }

    // Derive repository name from Git URL (e.g. "https://github.com/expressjs/express.git" -> "express")
    const urlParts = input.gitUrl.split('/');
    const repoNameFromUrl = urlParts[urlParts.length - 1].replace(/\.git$/, '');
    const repoName = input.name || repoNameFromUrl || 'git-repo';

    // 2. Create or find repository entry
    let repo = project.repositories.find((r) => r.name === repoName);
    if (!repo) {
      repo = await projectRepository.createRepository(projectId, repoName, input.gitUrl, input.branch);
    }

    // 3. Create ingestion job entry in DB
    const jobRes = await db.query<{ id: string }>(
      `INSERT INTO ingestion_jobs (repository_id, status, progress_percent)
       VALUES ($1, 'QUEUED', 0)
       RETURNING id`,
      [repo.id]
    );
    const jobId = jobRes.rows[0].id;

    // 4. Push job to BullMQ queue
    const payload: IngestionJobPayload = {
      jobId,
      repositoryId: repo.id,
      projectId,
      type: 'git',
      gitUrl: input.gitUrl,
      branch: input.branch,
    };
    await ingestionQueue.add('process-git', payload);

    return { jobId, repositoryId: repo.id };
  }

  static async getJobStatus(jobId: string, userId: string) {
    const res = await db.query<{
      id: string;
      repository_id: string;
      status: string;
      progress_percent: number;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      total_files: number;
    }>(
      `SELECT j.*, r.total_files, r.project_id
       FROM ingestion_jobs j
       JOIN repositories r ON j.repository_id = r.id
       JOIN projects p ON r.project_id = p.id
       WHERE j.id = $1 AND p.user_id = $2`,
      [jobId, userId]
    );

    if (!res.rows[0]) {
      throw AppError.notFound('Ingestion job not found');
    }

    const row = res.rows[0];
    return {
      jobId: row.id,
      repositoryId: row.repository_id,
      status: row.status,
      progressPercent: row.progress_percent,
      errorMessage: row.error_message,
      totalFiles: row.total_files,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
}
