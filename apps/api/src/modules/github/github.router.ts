import { Router } from 'express';
import { GitHubController } from './github.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const githubRouter: Router = Router();

// Public Webhook receiver (signature verified internally)
githubRouter.post('/webhooks', GitHubController.handleWebhook);

// Protected endpoints (require user session)
githubRouter.post('/generate-commit', requireAuth, GitHubController.generateCommit);
githubRouter.post('/summarize-pr', requireAuth, GitHubController.summarizePR);
githubRouter.get('/integrations', requireAuth, GitHubController.getIntegrations);
githubRouter.post('/integrations', requireAuth, GitHubController.addIntegration);
