import { db } from '../../db/client';
import { Conversation, Message, CodeCitation } from '@devlens/types';

export class ConversationRepository {
  static async createConversation(
    projectId: string,
    userId: string,
    title = 'New Conversation'
  ): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (project_id, user_id, title)
      VALUES ($1, $2, $3)
      RETURNING id, project_id AS "projectId", user_id AS "userId", title, created_at AS "createdAt";
    `;
    const result = await db.query(query, [projectId, userId, title]);
    return result.rows[0] as unknown as Conversation;
  }

  static async getConversations(projectId: string, userId: string): Promise<Conversation[]> {
    const query = `
      SELECT 
        id, project_id AS "projectId", user_id AS "userId", title, created_at AS "createdAt"
      FROM conversations
      WHERE project_id = $1 AND user_id = $2
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [projectId, userId]);
    return result.rows as unknown as Conversation[];
  }

  static async getConversation(conversationId: string): Promise<Conversation | null> {
    const query = `
      SELECT 
        id, project_id AS "projectId", user_id AS "userId", title, created_at AS "createdAt"
      FROM conversations
      WHERE id = $1;
    `;
    const result = await db.query(query, [conversationId]);
    return (result.rows[0] as unknown as Conversation) || null;
  }

  static async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET title = $1
      WHERE id = $2;
    `;
    await db.query(query, [title, conversationId]);
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const query = `
      DELETE FROM conversations
      WHERE id = $1;
    `;
    await db.query(query, [conversationId]);
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const query = `
      SELECT 
        id,
        conversation_id AS "conversationId",
        sender_type AS "senderType",
        content,
        citations,
        prompt_tokens AS "promptTokens",
        completion_tokens AS "completionTokens",
        created_at AS "createdAt"
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows as unknown as Message[];
  }

  static async saveMessage(
    conversationId: string,
    senderType: 'user' | 'assistant' | 'system',
    content: string,
    citations: CodeCitation[] = [],
    promptTokens = 0,
    completionTokens = 0
  ): Promise<Message> {
    const query = `
      INSERT INTO messages (
        conversation_id, sender_type, content, citations, prompt_tokens, completion_tokens
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        conversation_id AS "conversationId",
        sender_type AS "senderType",
        content,
        citations,
        prompt_tokens AS "promptTokens",
        completion_tokens AS "completionTokens",
        created_at AS "createdAt";
    `;
    const result = await db.query(query, [
      conversationId,
      senderType,
      content,
      JSON.stringify(citations),
      promptTokens,
      completionTokens,
    ]);
    return result.rows[0] as unknown as Message;
  }
}
