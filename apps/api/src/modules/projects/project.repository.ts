import { db } from '../../db/client';
import { Project, Repository, CodeFile } from '@devlens/types';

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

interface RepositoryRow {
  id: string;
  project_id: string;
  name: string;
  git_url: string | null;
  default_branch: string;
  status: string;
  total_files: number;
  total_chunks: number;
  last_indexed_at: Date | null;
  created_at: Date;
}

interface CodeFileRow {
  id: string;
  repository_id: string;
  file_path: string;
  language: string;
  file_size_bytes: number;
  file_hash: string;
  created_at: Date;
}

const mapProjectRow = (row: ProjectRow): Project => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
});

const mapRepoRow = (row: RepositoryRow): Repository => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  gitUrl: row.git_url,
  defaultBranch: row.default_branch,
  status: row.status as Repository['status'],
  totalFiles: row.total_files,
  totalChunks: row.total_chunks,
  lastIndexedAt: row.last_indexed_at,
  createdAt: row.created_at,
});

const mapFileRow = (row: CodeFileRow): CodeFile => ({
  id: row.id,
  repositoryId: row.repository_id,
  filePath: row.file_path,
  language: row.language,
  fileSizeBytes: row.file_size_bytes,
  fileHash: row.file_hash,
  createdAt: row.created_at,
});

export const projectRepository = {
  // Projects
  async createProject(userId: string, name: string, description?: string): Promise<Project> {
    const res = await db.query<ProjectRow>(
      `INSERT INTO projects (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, description || null]
    );
    return mapProjectRow(res.rows[0]);
  },

  async getProjectsByUserId(userId: string): Promise<Array<Project & { repositories: Repository[] }>> {
    const projectsRes = await db.query<ProjectRow>(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    if (projectsRes.rows.length === 0) return [];

    const projectIds = projectsRes.rows.map((p) => p.id);
    const reposRes = await db.query<RepositoryRow>(
      'SELECT * FROM repositories WHERE project_id = ANY($1) ORDER BY created_at ASC',
      [projectIds]
    );

    const reposByProjectId = new Map<string, Repository[]>();
    for (const repoRow of reposRes.rows) {
      const repo = mapRepoRow(repoRow);
      const existing = reposByProjectId.get(repo.projectId) || [];
      existing.push(repo);
      reposByProjectId.set(repo.projectId, existing);
    }

    return projectsRes.rows.map((row) => ({
      ...mapProjectRow(row),
      repositories: reposByProjectId.get(row.id) || [],
    }));
  },

  async getProjectById(projectId: string, userId: string): Promise<(Project & { repositories: Repository[] }) | null> {
    const projectRes = await db.query<ProjectRow>(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2 LIMIT 1',
      [projectId, userId]
    );
    if (!projectRes.rows[0]) return null;

    const reposRes = await db.query<RepositoryRow>(
      'SELECT * FROM repositories WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    return {
      ...mapProjectRow(projectRes.rows[0]),
      repositories: reposRes.rows.map(mapRepoRow),
    };
  },

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const res = await db.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [projectId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  // Repositories
  async createRepository(projectId: string, name: string, gitUrl?: string, defaultBranch = 'main'): Promise<Repository> {
    const res = await db.query<RepositoryRow>(
      `INSERT INTO repositories (project_id, name, git_url, default_branch, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [projectId, name, gitUrl || null, defaultBranch]
    );
    return mapRepoRow(res.rows[0]);
  },

  async getRepositoryById(repositoryId: string): Promise<Repository | null> {
    const res = await db.query<RepositoryRow>('SELECT * FROM repositories WHERE id = $1 LIMIT 1', [repositoryId]);
    if (!res.rows[0]) return null;
    return mapRepoRow(res.rows[0]);
  },

  async getFilesByRepositoryId(repositoryId: string): Promise<CodeFile[]> {
    const res = await db.query<CodeFileRow>(
      'SELECT * FROM code_files WHERE repository_id = $1 ORDER BY file_path ASC',
      [repositoryId]
    );
    return res.rows.map(mapFileRow);
  },

  async getFileById(fileId: string): Promise<CodeFile | null> {
    const res = await db.query<CodeFileRow>('SELECT * FROM code_files WHERE id = $1 LIMIT 1', [fileId]);
    if (!res.rows[0]) return null;
    return mapFileRow(res.rows[0]);
  },

  async getFileContentFromChunks(fileId: string): Promise<string> {
    const res = await db.query<{ content: string }>(
      'SELECT content FROM code_chunks WHERE file_id = $1 ORDER BY start_line ASC',
      [fileId]
    );
    return res.rows.map((r) => r.content).join('\n');
  },
};
