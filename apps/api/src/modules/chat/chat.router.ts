import { Router } from 'express';
import { ChatController } from './chat.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const chatRouter: Router = Router({ mergeParams: true });

chatRouter.use(requireAuth);

// SSE Streaming chat endpoints
chatRouter.post('/:projectId/chat', ChatController.streamChat);
chatRouter.post('/:projectId/repositories/:repositoryId/chat', ChatController.streamChat);

// Conversation management
chatRouter.get('/:projectId/conversations', ChatController.getConversations);
chatRouter.post('/:projectId/conversations', ChatController.createConversation);
chatRouter.get('/:projectId/conversations/:conversationId/messages', ChatController.getMessages);
chatRouter.delete('/:projectId/conversations/:conversationId', ChatController.deleteConversation);
