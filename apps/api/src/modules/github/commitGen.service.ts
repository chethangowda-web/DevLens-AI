import { CommitMessageResponse, CommitType } from '@devlens/types';
import { env } from '../../config/env';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

export interface GenerateCommitOptions {
  diff: string;
  context?: string;
}

export class CommitGenService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async generateCommitMessage(options: GenerateCommitOptions): Promise<CommitMessageResponse> {
    const { diff, context = '' } = options;

    if (!diff || !diff.trim()) {
      throw new Error('Git diff content is required to generate a commit message');
    }

    if (!this.client) {
      logger.info('OpenAI not configured; generating heuristic Conventional Commit message.');
      return this.generateFallbackCommit(diff, context);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Git and Release Engineer strictly following the Conventional Commits 1.0.0 specification.
Analyze the provided Git diff and synthesize a concise, high-quality commit message.

Commit Type allowed:
- "feat": A new feature
- "fix": A bug fix
- "docs": Documentation only changes
- "style": Formatting, missing semicolons, etc.
- "refactor": Code change that neither fixes a bug nor adds a feature
- "perf": Code change that improves performance
- "test": Adding missing tests or correcting existing tests
- "chore": Maintenance, dependencies, build configs

Return a valid JSON object matching this schema:
{
  "commitMessage": "feat(auth): add JWT session refresh token rotation",
  "type": "feat" | "fix" | "docs" | "style" | "refactor" | "perf" | "test" | "chore" | "ci",
  "scope": "auth",
  "description": "add JWT session refresh token rotation",
  "breakingChanges": "" // Description of any breaking changes, or omit
}
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Context / Hint: ${context || 'None'}\n\nGit Diff:\n\`\`\`diff\n${diff.slice(0, 8000)}\n\`\`\``,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      const type: CommitType = parsed.type || 'chore';
      const scope = parsed.scope ? `(${parsed.scope})` : '';
      const description = parsed.description || 'update codebase';
      const commitMessage = parsed.commitMessage || `${type}${scope}: ${description}`;

      return {
        commitMessage,
        type,
        scope: parsed.scope,
        description,
        breakingChanges: parsed.breakingChanges,
      };
    } catch (error: any) {
      logger.warn('Failed to generate commit message via OpenAI, using heuristic fallback:', {
        error: error.message,
      });
      return this.generateFallbackCommit(diff, context);
    }
  }

  /**
   * Deterministic rule-based Conventional Commit generator fallback
   */
  public generateFallbackCommit(diff: string, context: string): CommitMessageResponse {
    const fileMatches = Array.from(diff.matchAll(/diff --git a\/(.*?) b\//g)).map((m) => m[1]);
    const addedLines = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    const removedLines = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));

    let type: CommitType = 'feat';
    let scope = '';
    let description = 'update codebase';

    // Check files for scope & type
    const firstFile = fileMatches[0] || '';

    if (fileMatches.some((f) => f.includes('test') || f.endsWith('.test.ts') || f.endsWith('.spec.ts'))) {
      type = 'test';
      scope = 'tests';
      description = 'add automated test coverage';
    } else if (fileMatches.some((f) => f.endsWith('.md') || f.includes('docs/'))) {
      type = 'docs';
      scope = 'docs';
      description = 'update documentation specifications';
    } else if (fileMatches.some((f) => f.includes('auth') || f.includes('jwt') || f.includes('oauth'))) {
      type = 'feat';
      scope = 'auth';
      description = 'implement authentication and session security';
    } else if (fileMatches.some((f) => f.includes('github') || f.includes('webhook'))) {
      type = 'feat';
      scope = 'github';
      description = 'integrate GitHub webhooks and PR automation';
    } else if (fileMatches.some((f) => f.includes('api') || f.includes('routes') || f.includes('controller'))) {
      type = 'feat';
      scope = 'api';
      description = 'add API endpoints and request handlers';
    } else if (firstFile.includes('/')) {
      const parts = firstFile.split('/');
      scope = parts[parts.length - 2] || parts[0];
    }

    // Check for bug fixes in content or context
    if (/fix|bug|patch|error|crash|resolve|repair/i.test(diff) || /fix|bug/i.test(context)) {
      type = 'fix';
      description = `resolve issue in ${scope || 'core'}`;
    } else if (context && context.trim().length > 0) {
      description = context.trim().toLowerCase();
    } else if (addedLines.length > 0 && removedLines.length === 0) {
      description = `implement new ${scope || 'component'} capabilities`;
    }

    const scopeStr = scope ? `(${scope.replace(/[^a-zA-Z0-9_-]/g, '')})` : '';
    const commitMessage = `${type}${scopeStr}: ${description}`;

    return {
      commitMessage,
      type,
      scope: scope || undefined,
      description,
    };
  }
}

export const commitGenService = new CommitGenService();
