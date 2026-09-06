import { Request, Response, NextFunction } from 'express';
import { GitHubWebhookService } from './githubWebhook.service';
import { commitGenService } from './commitGen.service';
import { prReviewerService } from './prReviewer.service';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { db } from '../../db/client';
import { logger } from '../../utils/logger';

export class GitHubController {
  /**
   * GitHub Webhook Receiver with HMAC-SHA256 verification
   */
  static async handleWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = (req.headers['x-github-event'] as string) || 'ping';

    // Verify HMAC-SHA256 signature
    const payloadString = JSON.stringify(req.body);
    const isValid = GitHubWebhookService.verifySignature(payloadString, signature, env.GITHUB_WEBHOOK_SECRET);

    if (!isValid) {
      logger.warn('Unauthorized GitHub webhook request: HMAC signature verification failed');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid GitHub webhook HMAC-SHA256 signature' },
      });
      return;
    }

    // Acknowledge webhook immediately (under 10s timeout requirement)
    res.status(200).json({
      success: true,
      received: true,
      event,
      timestamp: new Date().toISOString(),
    });

    // Asynchronously dispatch event
    try {
      await GitHubWebhookService.handleEvent(event, req.body);
    } catch (err: any) {
      logger.error('Error in background GitHub webhook handling:', { error: err.message });
    }
  }

  /**
   * Generate Conventional Commit message from unified Git diff
   */
  static async generateCommit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { diff, context } = req.body;

      if (!diff || typeof diff !== 'string' || !diff.trim()) {
        throw AppError.badRequest('Git diff is required to synthesize a Conventional Commit message');
      }

      const result = await commitGenService.generateCommitMessage({
        diff: diff.trim(),
        context,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Summarize and review Pull Request diff
   */
  static async summarizePR(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { diff, prTitle, prDescription, prNumber, prUrl } = req.body;

      if (!diff || typeof diff !== 'string' || !diff.trim()) {
        throw AppError.badRequest('Git diff is required to generate Pull Request review summary');
      }

      const result = await prReviewerService.summarizeAndReviewPR({
        diff: diff.trim(),
        prTitle,
        prDescription,
        prNumber,
        prUrl,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List connected GitHub integrations for current user
   */
  static async getIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const query = `
        SELECT id, user_id AS "userId", installation_id AS "installationId", 
               repository_full_name AS "repositoryFullName", created_at AS "createdAt"
        FROM github_integrations
        WHERE user_id = $1
        ORDER BY created_at DESC;
      `;
      const result = await db.query(query, [user.userId]);

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register a new GitHub repository integration
   */
  static async addIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { installationId, repositoryFullName } = req.body;

      if (!installationId || !repositoryFullName) {
        throw AppError.badRequest('installationId and repositoryFullName are required');
      }

      const query = `
        INSERT INTO github_integrations (user_id, installation_id, repository_full_name)
        VALUES ($1, $2, $3)
        RETURNING id, user_id AS "userId", installation_id AS "installationId",
                  repository_full_name AS "repositoryFullName", created_at AS "createdAt";
      `;
      const result = await db.query(query, [user.userId, installationId, repositoryFullName]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
}
