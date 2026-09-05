import { CodeExplanationResponse } from '@devlens/types';
import { env } from '../../config/env';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

export interface ExplainCodeOptions {
  code: string;
  language?: string;
  targetAudience?: 'beginner' | 'intermediate' | 'architect';
}

export class ExplainerService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async explainCode(options: ExplainCodeOptions): Promise<CodeExplanationResponse> {
    const { code, language = 'typescript', targetAudience = 'intermediate' } = options;

    if (!code || !code.trim()) {
      throw new Error('Code snippet is required for explanation');
    }

    if (!this.client) {
      logger.info('OpenAI not configured; generating simulated code explanation.');
      return this.simulateExplanation(code, language, targetAudience);
    }

    try {
      const audiencePrompt = {
        beginner: 'Explain with clear, simple analogies and explain all foundational concepts.',
        intermediate: 'Explain standard idioms, design patterns, control flow, and practical applications.',
        architect: 'Focus on high-level system design, concurrency model, memory allocation, edge cases, and scalability trade-offs.',
      }[targetAudience];

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer. Provide a detailed code breakdown in JSON format matching the following schema:
{
  "summary": "High-level summary of what this code does",
  "lineByLine": [
    { "line": 1, "explanation": "Explanation of line 1..." }
  ],
  "complexity": {
    "time": "e.g. O(N) linear time",
    "space": "e.g. O(1) constant auxiliary space"
  },
  "keyConcepts": ["Concept 1", "Concept 2"]
}

Audience Level: ${targetAudience} (${audiencePrompt})
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        summary: parsed.summary || 'Code analysis generated.',
        lineByLine: parsed.lineByLine || [],
        complexity: parsed.complexity || { time: 'O(1)', space: 'O(1)' },
        keyConcepts: parsed.keyConcepts || [],
      };
    } catch (error: any) {
      logger.warn('Failed to get OpenAI explanation, using deterministic fallback:', {
        error: error.message,
      });
      return this.simulateExplanation(code, language, targetAudience);
    }
  }

  private simulateExplanation(
    code: string,
    language: string,
    targetAudience: string
  ): CodeExplanationResponse {
    const lines = code.split('\n');
    const hasLoops = /\b(for|while|forEach|map|filter|reduce)\b/.test(code);
    const hasNestedLoops = /(for|while)[\s\S]*(for|while)/.test(code);

    const timeComplexity = hasNestedLoops
      ? 'O(N²) quadratic time complexity due to nested iterations'
      : hasLoops
      ? 'O(N) linear time complexity proportional to collection size'
      : 'O(1) constant time complexity for direct operations';

    const spaceComplexity = /\b(new Array|push|concat|Map|Set|Object\.assign|\{\s*\.\.\.)\b/.test(code)
      ? 'O(N) linear auxiliary memory allocation'
      : 'O(1) constant memory space';

    const lineByLine = lines.slice(0, 10).map((line, idx) => ({
      line: idx + 1,
      explanation: line.trim().startsWith('//')
        ? 'Inline comment or documentation annotation.'
        : line.trim().startsWith('import')
        ? 'Module dependency import declaration.'
        : line.trim().startsWith('export')
        ? 'Public symbol export definition.'
        : line.trim().startsWith('return')
        ? 'Computes and returns the resulting output value.'
        : `Executes statement: ${line.trim().slice(0, 50)}...`,
    }));

    const keyConcepts = [
      `${language.toUpperCase()} Type Safety & Module Scoping`,
      'Asynchronous Control Flow & Exception Handling',
      targetAudience === 'architect'
        ? 'Scalable System Decoupling & Invariant Guarantees'
        : 'Predictable State Mutations & Error Boundaries',
    ];

    return {
      summary: `This ${language} snippet implements a structured execution routine with deterministic logic and encapsulated boundaries.`,
      lineByLine,
      complexity: {
        time: timeComplexity,
        space: spaceComplexity,
      },
      keyConcepts,
    };
  }
}

export const explainerService = new ExplainerService();
