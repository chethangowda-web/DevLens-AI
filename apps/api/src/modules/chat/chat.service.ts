import { ConversationRepository } from './conversation.repository';
import { PromptBuilder } from '../ai/promptBuilder';
import { defaultLLMProvider, OpenAIAdapter } from '../ai/openai.adapter';
import { LLMProvider } from '../ai/llmProvider';
import { hybridSearch, RetrievalResult } from '../rag/retrieval.service';
import { CodeCitation, Message } from '@devlens/types';
import { logger } from '../../utils/logger';

export interface StreamChatOptions {
  projectId: string;
  userId: string;
  repositoryId?: string;
  conversationId?: string;
  message: string;
  mode?: 'chat' | 'explain' | 'debug' | 'search';
  onCitation?: (citations: CodeCitation[]) => void | Promise<void>;
  onDelta: (delta: string) => void | Promise<void>;
}

export interface StreamChatResult {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  citations: CodeCitation[];
  promptTokens: number;
  completionTokens: number;
}

export class ChatService {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider = defaultLLMProvider) {
    this.llmProvider = llmProvider;
  }

  async streamChat(options: StreamChatOptions): Promise<StreamChatResult> {
    const {
      projectId,
      userId,
      repositoryId,
      message,
      mode = 'chat',
      onCitation,
      onDelta,
    } = options;

    // 1. Ensure conversation exists
    let conversationId = options.conversationId;
    if (!conversationId) {
      const title = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
      const conv = await ConversationRepository.createConversation(projectId, userId, title);
      conversationId = conv.id;
    }

    // 2. Fetch recent conversation history
    const historyMessages = await ConversationRepository.getMessages(conversationId);

    // 3. Perform Hybrid Search if repositoryId is provided
    let contextChunks: RetrievalResult[] = [];
    let citations: CodeCitation[] = [];

    if (repositoryId) {
      try {
        contextChunks = await hybridSearch(repositoryId, message, 5);
        citations = contextChunks.map((chunk) => ({
          filePath: chunk.file_path,
          startLine: chunk.start_line,
          endLine: chunk.end_line,
          symbolName: chunk.symbol_name,
          snippet: chunk.content.slice(0, 200),
        }));

        if (citations.length > 0 && onCitation) {
          await onCitation(citations);
        }
      } catch (error: any) {
        logger.warn('Hybrid search failed during chat streaming:', { error: error.message });
      }
    }

    // 4. Build prompt with XML delimited context
    const messages = PromptBuilder.buildMessages({
      query: message,
      contextChunks,
      history: historyMessages.map((m) => ({
        senderType: m.senderType,
        content: m.content,
      })),
      mode,
    });

    // 5. Save user message to database
    const userMessage = await ConversationRepository.saveMessage(
      conversationId,
      'user',
      message
    );

    // 6. Stream LLM completion
    const generationResult = await this.llmProvider.generateStream(messages, onDelta);

    // 7. Save assistant message to database
    const assistantMessage = await ConversationRepository.saveMessage(
      conversationId,
      'assistant',
      generationResult.fullContent,
      citations,
      generationResult.promptTokens,
      generationResult.completionTokens
    );

    return {
      conversationId,
      userMessage,
      assistantMessage,
      citations,
      promptTokens: generationResult.promptTokens,
      completionTokens: generationResult.completionTokens,
    };
  }
}

export const chatService = new ChatService();
