import { Router } from 'express';
import { IntelligenceController } from './intelligence.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const intelligenceRouter: Router = Router({ mergeParams: true });

intelligenceRouter.use(requireAuth);

intelligenceRouter.post('/:projectId/ai/explain', IntelligenceController.explainCode);
intelligenceRouter.post('/:projectId/ai/debug', IntelligenceController.debugError);
