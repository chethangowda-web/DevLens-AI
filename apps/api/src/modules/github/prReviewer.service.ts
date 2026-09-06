import { PRReviewSummary } from '@devlens/types';
import { env } from '../../config/env';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

export interface SummarizePROptions {
  diff: string;
  prTitle?: string;
  prDescription?: string;
  prNumber?: number;
  prUrl?: string;
}

export class PRReviewerService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async summarizeAndReviewPR(options: SummarizePROptions): Promise<PRReviewSummary> {
    const { diff, prTitle = 'Pull Request Review', prDescription = '', prNumber, prUrl } = options;

    if (!diff || !diff.trim()) {
      throw new Error('Git diff content is required to summarize Pull Request');
    }

    if (!this.client) {
      logger.info('OpenAI not configured; generating heuristic PR summary.');
      return this.generateFallbackPRSummary(options);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Architect reviewing a GitHub Pull Request.
Analyze the provided unified Git diff, PR Title, and PR Description to generate a structured review.

Return a valid JSON object matching this schema:
{
  "summary": "High-level summary of what this PR accomplishes and its architectural impact",
  "whatChanged": [
    "Key change 1: Updated authentication middleware",
    "Key change 2: Added Redis rate limiter"
  ],
  "potentialRisks": [
    "Potential risk 1: Requires DB migration before deployment",
    "Potential risk 2: Insecure regex in input validator"
  ],
  "score": 85, // Integer 0 to 100 representing code readiness and safety
  "recommendations": [
    "Add unit tests covering edge case with null tokens",
    "Ensure environment variables are configured in staging"
  ]
}
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `PR Title: ${prTitle}\nPR Description: ${prDescription || 'None'}\n\nGit Diff:\n\`\`\`diff\n${diff.slice(0, 10000)}\n\`\`\``,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');

      return {
        prNumber,
        prTitle,
        prUrl,
        summary: parsed.summary || `Automated review for ${prTitle}`,
        whatChanged: Array.isArray(parsed.whatChanged) ? parsed.whatChanged : ['Code changes analyzed.'],
        potentialRisks: Array.isArray(parsed.potentialRisks) ? parsed.potentialRisks : [],
        score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 85,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch (error: any) {
      logger.warn('Failed to summarize PR via OpenAI, using fallback heuristic:', {
        error: error.message,
      });
      return this.generateFallbackPRSummary(options);
    }
  }

  /**
   * Deterministic rule-based PR diff analyzer fallback
   */
  public generateFallbackPRSummary(options: SummarizePROptions): PRReviewSummary {
    const { diff, prTitle = 'Pull Request Review', prNumber, prUrl } = options;
    const fileMatches = Array.from(diff.matchAll(/diff --git a\/(.*?) b\/(.*?)/g)).map((m) => m[1]);
    const addedLines = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
    const deletedLines = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

    const whatChanged: string[] = [];
    const potentialRisks: string[] = [];
    const recommendations: string[] = [];

    // Identify changed components
    if (fileMatches.length > 0) {
      whatChanged.push(`Modified ${fileMatches.length} file(s) across the repository (+${addedLines} / -${deletedLines} lines).`);
      fileMatches.slice(0, 5).forEach((file) => {
        whatChanged.push(`Updated ${file}`);
      });
      if (fileMatches.length > 5) {
        whatChanged.push(`...and ${fileMatches.length - 5} additional files.`);
      }
    } else {
      whatChanged.push(`Processed code diff containing +${addedLines} additions and -${deletedLines} deletions.`);
    }

    // Risk heuristics
    let score = 90;

    if (fileMatches.some((f) => f.includes('schema') || f.includes('migration') || f.endsWith('.sql'))) {
      potentialRisks.push('Database schema / migration changes detected. Verify backward compatibility and run migrations prior to release.');
      recommendations.push('Test migration scripts idempotently against staging database.');
      score -= 10;
    }

    if (fileMatches.some((f) => f.includes('.env') || f.includes('config'))) {
      potentialRisks.push('Configuration or environment variable modifications. Ensure production deployment secrets are updated.');
      score -= 5;
    }

    if (fileMatches.some((f) => f.includes('auth') || f.includes('jwt') || f.includes('permission'))) {
      potentialRisks.push('Security-sensitive authentication / authorization code path altered.');
      recommendations.push('Perform thorough regression testing on authentication tokens and access controls.');
      score -= 5;
    }

    if (addedLines > 500) {
      potentialRisks.push('Large pull request (>500 added lines) increases review complexity and risk of regression.');
      recommendations.push('Consider breaking large pull requests into smaller, modular changes.');
      score -= 10;
    }

    if (!fileMatches.some((f) => f.includes('test') || f.endsWith('.test.ts'))) {
      recommendations.push('No test file changes detected. Add unit or integration tests to verify new behavior.');
      score -= 5;
    }

    if (potentialRisks.length === 0) {
      potentialRisks.push('Low architectural risk: Standard localized logic modifications without sensitive infrastructure changes.');
    }

    return {
      prNumber,
      prTitle,
      prUrl,
      summary: `Automated PR review for "${prTitle}". The changes touch ${fileMatches.length} file(s) with +${addedLines} additions and -${deletedLines} deletions.`,
      whatChanged,
      potentialRisks,
      score: Math.max(50, Math.min(100, score)),
      recommendations,
    };
  }
}

export const prReviewerService = new PRReviewerService();
