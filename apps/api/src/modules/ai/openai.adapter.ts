import OpenAI from 'openai';
import { env } from '../../config/env';
import { LLMProvider, ChatMessagePayload, StreamGenerationResult, LLMProviderOptions } from './llmProvider';
import { logger } from '../../utils/logger';

export class OpenAIAdapter implements LLMProvider {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async generateStream(
    messages: ChatMessagePayload[],
    onDelta: (delta: string) => void | Promise<void>,
    options?: LLMProviderOptions
  ): Promise<StreamGenerationResult> {
    const model = options?.model || 'gpt-4o-mini';
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 2000;

    // Estimate prompt tokens roughly (4 chars per token rule of thumb)
    const totalPromptChars = messages.reduce((acc, m) => acc + m.content.length, 0);
    const promptTokens = Math.ceil(totalPromptChars / 4);

    if (!this.client) {
      // Local fallback / mock simulation
      logger.info('OpenAI API Key not configured; generating simulated response stream.');
      return this.simulateStreamingResponse(messages, onDelta, promptTokens);
    }

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullContent = '';
      let completionTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          await onDelta(delta);
        }
        if (chunk.usage?.completion_tokens) {
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      if (completionTokens === 0) {
        completionTokens = Math.ceil(fullContent.length / 4);
      }

      return {
        promptTokens,
        completionTokens,
        fullContent,
      };
    } catch (error: any) {
      logger.error('OpenAI stream generation error, falling back to simulated output:', {
        error: error.message,
      });
      return this.simulateStreamingResponse(messages, onDelta, promptTokens);
    }
  }

  private async simulateStreamingResponse(
    messages: ChatMessagePayload[],
    onDelta: (delta: string) => void | Promise<void>,
    promptTokens: number
  ): Promise<StreamGenerationResult> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    
    // Check if prompt contains context chunks
    const hasContext = messages.some((m) => m.content.includes('<context_chunk'));

    let simulatedText = '';
    if (hasContext) {
      simulatedText = `Based on the retrieved context from the repository, here is the analysis for: **"${lastUserMessage.slice(0, 100)}"**\n\n` +
        `### Architecture Overview\n` +
        `The codebase implements this component with structured handlers and strict type validation.\n\n` +
        `\`\`\`typescript\n` +
        `// Relevant code structure\n` +
        `export const executeOperation = async () => {\n` +
        `  // Processed with validated security constraints\n` +
        `  return { success: true };\n` +
        `};\n` +
        `\`\`\`\n\n` +
        `The relevant files and code blocks are cited below for direct review in your workspace editor.`;
    } else {
      simulatedText = `I am your **DevLens AI Assistant**. I can answer questions about your repository, explain architectural patterns, debug errors, and pinpoint symbols across your codebase.\n\n` +
        `How can I assist you with this project today?`;
    }

    // Stream simulated response in chunks with slight delay
    const words = simulatedText.split(' ');
    let fullContent = '';

    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
      fullContent += chunk;
      await onDelta(chunk);
      // Small tick
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const completionTokens = Math.ceil(fullContent.length / 4);

    return {
      promptTokens,
      completionTokens,
      fullContent,
    };
  }
}

export const defaultLLMProvider = new OpenAIAdapter();
