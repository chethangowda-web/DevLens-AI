import { apiClient } from './apiClient';
import { Conversation, Message, CodeCitation, ApiResponse } from '@devlens/types';

export interface StreamChatParams {
  projectId: string;
  repositoryId?: string;
  conversationId?: string;
  message: string;
  mode?: 'chat' | 'explain' | 'debug' | 'search';
  onCitation?: (citations: CodeCitation[]) => void;
  onDelta?: (delta: string) => void;
  onDone?: (data: {
    conversationId: string;
    userMessage: Message;
    assistantMessage: Message;
    promptTokens: number;
    completionTokens: number;
  }) => void;
  onError?: (error: Error) => void;
}

export const chatService = {
  async getConversations(projectId: string): Promise<Conversation[]> {
    const res = await apiClient.get<ApiResponse<Conversation[]>>(
      `/projects/${projectId}/conversations`
    );
    return res.data.data || [];
  },

  async getMessages(projectId: string, conversationId: string): Promise<Message[]> {
    const res = await apiClient.get<ApiResponse<Message[]>>(
      `/projects/${projectId}/conversations/${conversationId}/messages`
    );
    return res.data.data || [];
  },

  async createConversation(projectId: string, title?: string): Promise<Conversation> {
    const res = await apiClient.post<ApiResponse<Conversation>>(
      `/projects/${projectId}/conversations`,
      { title }
    );
    if (!res.data.data) throw new Error('Failed to create conversation');
    return res.data.data;
  },

  async deleteConversation(projectId: string, conversationId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/conversations/${conversationId}`);
  },

  async streamChat(params: StreamChatParams): Promise<() => void> {
    const {
      projectId,
      repositoryId,
      conversationId,
      message,
      mode = 'chat',
      onCitation,
      onDelta,
      onDone,
      onError,
    } = params;

    const controller = new AbortController();

    const runStream = async () => {
      try {
        const response = await fetch(`/api/v1/projects/${projectId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            message,
            conversationId,
            repositoryId,
            mode,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server returned status ${response.status}: ${errText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          // The last piece might be an incomplete chunk, keep it in buffer
          buffer = lines.pop() || '';

          for (const block of lines) {
            if (!block.trim()) continue;

            const blockLines = block.split('\n');
            let event = 'message';
            let dataStr = '';

            for (const line of blockLines) {
              if (line.startsWith('event:')) {
                event = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.replace('data:', '').trim();
              }
            }

            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (event === 'citation') {
                onCitation?.(parsed.citations || []);
              } else if (event === 'delta') {
                onDelta?.(parsed.text || '');
              } else if (event === 'done') {
                onDone?.(parsed);
              } else if (event === 'error') {
                onError?.(new Error(parsed.message || 'Stream error occurred'));
              }
            } catch (err) {
              console.error('Failed to parse SSE line:', dataStr, err);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onError?.(err);
        }
      }
    };

    runStream();

    // Return cancel function
    return () => {
      controller.abort();
    };
  },
};
