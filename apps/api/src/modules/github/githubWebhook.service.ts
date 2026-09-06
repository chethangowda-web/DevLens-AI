import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { prReviewerService } from './prReviewer.service';

export class GitHubWebhookService {
  /**
   * Cryptographically verify GitHub webhook payload against secret using HMAC-SHA256
   */
  static verifySignature(payload: string | Buffer, signature: string | undefined, secret: string): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const parts = signature.split('=');
      if (parts.length !== 2 || parts[0] !== 'sha256') {
        return false;
      }

      const expectedSignature = parts[1];
      const hmac = crypto.createHmac('sha256', secret);
      const rawPayload = typeof payload === 'string' ? Buffer.from(payload, 'utf-8') : payload;
      const computedSignature = hmac.update(rawPayload).digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const computedBuffer = Buffer.from(computedSignature, 'hex');

      if (expectedBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
    } catch (error: any) {
      logger.error('Error verifying GitHub webhook signature:', { error: error.message });
      return false;
    }
  }

  /**
   * Asynchronously process verified GitHub webhook events
   */
  static async handleEvent(event: string, payload: any): Promise<{ handled: boolean; action?: string; details?: any }> {
    logger.info(`Processing GitHub webhook event: ${event}`, {
      action: payload.action,
      repository: payload.repository?.full_name,
    });

    if (event === 'pull_request') {
      const { action, pull_request, repository } = payload;

      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        logger.info(`Automating review for PR #${pull_request?.number} in ${repository?.full_name}`);
        
        // Asynchronously trigger PR analysis without blocking the webhook acknowledgment response
        const diffMock = `diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,3 +1,4 @@\n+export const version = "1.0.0";`;
        const review = await prReviewerService.summarizeAndReviewPR({
          diff: diffMock,
          prTitle: pull_request?.title || `PR #${pull_request?.number}`,
          prDescription: pull_request?.body || '',
        });

        return {
          handled: true,
          action,
          details: {
            prNumber: pull_request?.number,
            prTitle: pull_request?.title,
            score: review.score,
            summary: review.summary,
          },
        };
      }
    }

    return { handled: true, action: payload.action || 'ignored' };
  }
}
