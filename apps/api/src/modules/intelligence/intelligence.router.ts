import { Router } from 'express';
import { IntelligenceController } from './intelligence.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const intelligenceRouter: Router = Router({ mergeParams: true });

intelligenceRouter.use(requireAuth);

intelligenceRouter.post('/:projectId/ai/explain', IntelligenceController.explainCode);
intelligenceRouter.post('/:projectId/ai/debug', IntelligenceController.debugError);
intelligenceRouter.post('/:projectId/ai/review', IntelligenceController.reviewCode);
intelligenceRouter.post('/:projectId/ai/generate-tests', IntelligenceController.generateTests);

// Direct top-level AI aliases
intelligenceRouter.post('/explain', IntelligenceController.explainCode);
intelligenceRouter.post('/debug', IntelligenceController.debugError);
intelligenceRouter.post('/review', IntelligenceController.reviewCode);
intelligenceRouter.post('/generate-tests', IntelligenceController.generateTests);
