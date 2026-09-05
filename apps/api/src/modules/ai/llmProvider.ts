export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamGenerationResult {
  promptTokens: number;
  completionTokens: number;
  fullContent: string;
}

export interface LLMProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  generateStream(
    messages: ChatMessagePayload[],
    onDelta: (delta: string) => void | Promise<void>,
    options?: LLMProviderOptions
  ): Promise<StreamGenerationResult>;
}
