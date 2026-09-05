import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { ConversationRepository } from './conversation.repository';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

export class ChatController {
  /**
   * SSE Streaming Chat Handler
   */
  static async streamChat(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    const { projectId, repositoryId } = req.params;
    const { message, conversationId, mode, repositoryId: bodyRepoId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }

    const activeRepoId = repositoryId || bodyRepoId;

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if proxied
    res.flushHeaders?.();

    // Helper to send SSE events
    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await chatService.streamChat({
        projectId,
        userId: user.userId,
        repositoryId: activeRepoId,
        conversationId,
        message: message.trim(),
        mode,
        onCitation: async (citations) => {
          sendSSE('citation', { citations });
        },
        onDelta: async (delta) => {
          sendSSE('delta', { text: delta });
        },
      });

      sendSSE('done', {
        conversationId: result.conversationId,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });

      res.end();
    } catch (error: any) {
      logger.error('Error during chat streaming:', { error: error.message });
      sendSSE('error', { message: error.message || 'An error occurred during chat generation.' });
      res.end();
    }
  }

  /**
   * Get all conversations for a project
   */
  static async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { projectId } = req.params;

      const conversations = await ConversationRepository.getConversations(projectId, user.userId);
      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { projectId } = req.params;
      const { title } = req.body;

      const conversation = await ConversationRepository.createConversation(
        projectId,
        user.userId,
        title || 'New Conversation'
      );
      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for a specific conversation
   */
  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const messages = await ConversationRepository.getMessages(conversationId);
      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      await ConversationRepository.deleteConversation(conversationId);
      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
