import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import simpleGit from 'simple-git';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { db } from '../db/client';
import { sanitizeCodeContent } from '../utils/secretSanitizer';
import { isIngestableFile } from '../utils/fileFilters';
import { chunkCodeFile } from '@devlens/code-parser';
import { generateEmbeddings } from '../modules/rag/embedding.service';
import { INGESTION_QUEUE_NAME } from '../modules/ingestion/ingestion.queue';
import { IngestionJobPayload } from '../modules/ingestion/ingestion.types';

// Helper to recursively collect all files in a directory
function getAllFilePaths(dirPath: string, arrayOfFiles: string[] = [], baseDir = dirPath): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFilePaths(fullPath, arrayOfFiles, baseDir);
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      arrayOfFiles.push(relativePath);
    }
  }

  return arrayOfFiles;
}

export function createIngestionWorker(): Worker<IngestionJobPayload> {
  const worker = new Worker<IngestionJobPayload>(
    INGESTION_QUEUE_NAME,
    async (job: Job<IngestionJobPayload>) => {
      const { jobId, repositoryId, type, zipFilePath, gitUrl, branch } = job.data;
      const workspaceDir = path.join(env.TEMP_WORKSPACE_DIR, jobId);

      logger.info(`Starting ingestion job ${jobId} for repository ${repositoryId} (type: ${type})`);

      try {
        // 1. Update job & repo status in DB
        await db.query(
          `UPDATE ingestion_jobs 
           SET status = 'PROCESSING', progress_percent = 10, started_at = NOW() 
           WHERE id = $1`,
          [jobId]
        );
        await db.query(`UPDATE repositories SET status = 'INDEXING' WHERE id = $1`, [repositoryId]);

        // 2. Prepare isolated workspace directory
        if (!fs.existsSync(env.TEMP_WORKSPACE_DIR)) {
          fs.mkdirSync(env.TEMP_WORKSPACE_DIR, { recursive: true });
        }
        if (fs.existsSync(workspaceDir)) {
          fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
        fs.mkdirSync(workspaceDir, { recursive: true });

        // 3. Extract ZIP or Clone Git Repository
        if (type === 'zip' && zipFilePath) {
          logger.info(`Extracting ZIP archive: ${zipFilePath}`);
          const zip = new AdmZip(zipFilePath);
          const zipEntries = zip.getEntries();

          let totalUncompressedSize = 0;
          const MAX_UNCOMPRESSED_BYTES = env.MAX_UNCOMPRESSED_MB * 1024 * 1024;

          for (const entry of zipEntries) {
            // Path traversal defense
            const normalizedName = entry.entryName.replace(/\\/g, '/');
            if (normalizedName.includes('..') || path.isAbsolute(normalizedName)) {
              throw new Error(`Security Exception: Detected directory traversal sequence in ZIP entry: ${normalizedName}`);
            }

            // Zip bomb defense
            totalUncompressedSize += entry.header.size;
            if (totalUncompressedSize > MAX_UNCOMPRESSED_BYTES) {
              throw new Error(`Security Exception: Extracted size exceeds maximum limit of ${env.MAX_UNCOMPRESSED_MB}MB`);
            }
          }

          zip.extractAllTo(workspaceDir, true);
        } else if (type === 'git' && gitUrl) {
          logger.info(`Cloning Git repository: ${gitUrl} (branch: ${branch || 'main'})`);
          const git = simpleGit();
          await git.clone(gitUrl, workspaceDir, [
            '--depth',
            '1',
            '--branch',
            branch || 'main',
            '--single-branch',
          ]);
        } else {
          throw new Error('Invalid ingestion parameters: missing zipFilePath or gitUrl');
        }

        await db.query(`UPDATE ingestion_jobs SET progress_percent = 40 WHERE id = $1`, [jobId]);

        // 4. Discover, filter, and sanitize repository files
        const allRelativeFiles = getAllFilePaths(workspaceDir);
        logger.info(`Found ${allRelativeFiles.length} total files in workspace`);

        let validFilesCount = 0;
        let totalChunksCount = 0;
        const maxFileSizeBytes = env.MAX_FILE_SIZE_KB * 1024;

        // Clear existing files if re-indexing (cascade deletes chunks)
        await db.query(`DELETE FROM code_files WHERE repository_id = $1`, [repositoryId]);

        for (let i = 0; i < allRelativeFiles.length; i++) {
          const relPath = allRelativeFiles[i];
          const fullPath = path.join(workspaceDir, relPath);
          const stat = fs.statSync(fullPath);

          const check = isIngestableFile(relPath, stat.size, maxFileSizeBytes);
          if (!check.valid || !check.language) {
            continue;
          }

          const rawContent = fs.readFileSync(fullPath, 'utf-8');
          const sanitizedContent = sanitizeCodeContent(rawContent);
          const fileHash = crypto.createHash('sha256').update(sanitizedContent).digest('hex');

          // Insert into code_files table
          const fileRes = await db.query(
            `INSERT INTO code_files (repository_id, file_path, language, file_size_bytes, file_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [repositoryId, relPath, check.language, stat.size, fileHash]
          );
          const fileId = fileRes.rows[0].id;
          validFilesCount++;

          // Parse code into AST structural chunks
          const chunks = chunkCodeFile(relPath, sanitizedContent, check.language);

          if (chunks.length > 0) {
            const chunkTexts = chunks.map((c) => c.content);
            const embeddings = await generateEmbeddings(chunkTexts);

            for (let j = 0; j < chunks.length; j++) {
              const chunk = chunks[j];
              const vectorString = `[${embeddings[j].join(',')}]`;

              await db.query(
                `INSERT INTO code_chunks (file_id, content, embedding, start_line, end_line, symbol_name, symbol_type, chunk_hash)
                 VALUES ($1, $2, $3::vector, $4, $5, $6, $7, $8)`,
                [
                  fileId,
                  chunk.content,
                  vectorString,
                  chunk.startLine,
                  chunk.endLine,
                  chunk.symbolName,
                  chunk.symbolType,
                  chunk.chunkHash,
                ]
              );
              totalChunksCount++;
            }
          }
        }

        // 5. Update progress to 100% and finalize statuses
        await db.query(
          `UPDATE repositories 
           SET status = 'INDEXED', total_files = $2, total_chunks = $3, last_indexed_at = NOW() 
           WHERE id = $1`,
          [repositoryId, validFilesCount, totalChunksCount]
        );

        await db.query(
          `UPDATE ingestion_jobs 
           SET status = 'COMPLETED', progress_percent = 100, completed_at = NOW() 
           WHERE id = $1`,
          [jobId]
        );

        logger.info(
          `Ingestion completed successfully for repository ${repositoryId} (${validFilesCount} files, ${totalChunksCount} chunks indexed)`
        );
      } catch (error) {
        const errorMsg = (error as Error).message;
        logger.error(`Ingestion job ${jobId} failed: ${errorMsg}`, { stack: (error as Error).stack });

        await db.query(
          `UPDATE ingestion_jobs 
           SET status = 'FAILED', error_message = $2, completed_at = NOW() 
           WHERE id = $1`,
          [jobId, errorMsg]
        );
        await db.query(`UPDATE repositories SET status = 'FAILED' WHERE id = $1`, [repositoryId]);
        throw error;
      } finally {
        // 6. Purge temporary files from disk
        if (fs.existsSync(workspaceDir)) {
          fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
        if (zipFilePath && fs.existsSync(zipFilePath)) {
          fs.rmSync(zipFilePath, { force: true });
        }
      }
    },
    {
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
}
