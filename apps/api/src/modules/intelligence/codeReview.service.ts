import { CodeReviewResponse, CodeReviewIssue } from '@devlens/types';
import { env } from '../../config/env';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

export interface CodeReviewOptions {
  code: string;
  language?: string;
  filePath?: string;
}

export class CodeReviewService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async reviewCode(options: CodeReviewOptions): Promise<CodeReviewResponse> {
    const { code, language = 'typescript', filePath = 'snippet' } = options;

    if (!code || !code.trim()) {
      throw new Error('Code snippet is required for review');
    }

    if (!this.client) {
      logger.info('OpenAI not configured; running static heuristic code review.');
      return this.runHeuristicCodeReview(code, language, filePath);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Principal Security Architect and Senior Software Reviewer.
Analyze the provided source code for:
1. OWASP Top 10 security vulnerabilities (SQL Injection, XSS, SSRF, Auth bypass, Hardcoded secrets, Command injection, Path traversal, ReDoS, Insecure Cryptography).
2. Performance bottlenecks (N+1 queries, synchronous event-loop blocking, memory leaks, unindexed linear searches).
3. Code smells and maintainability anti-patterns.

Avoid subjective stylistic nitpicks (e.g. indentation, quote styles). Focus strictly on real bugs, security flaws, and architectural risks.

Return a valid JSON object matching this schema:
{
  "score": 85, // Integer 0 to 100 (100 = flawless, <60 = high risk)
  "summary": "Executive summary of the audit findings",
  "issues": [
    {
      "line": 14, // Approximate 1-based line number if identifiable, or omit
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "category": "SECURITY" | "PERFORMANCE" | "CODE_SMELL" | "MAINTAINABILITY",
      "issue": "Concise title of the issue",
      "recommendation": "Actionable explanation of how to fix this issue",
      "suggestedCode": "Optional corrected replacement snippet"
    }
  ]
}
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `File: ${filePath}\nLanguage: ${language}\n\nSource Code:\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 80;
      const issues: CodeReviewIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];

      return {
        score,
        summary: parsed.summary || `Code review completed with ${issues.length} findings.`,
        issues,
      };
    } catch (error: any) {
      logger.warn('Failed to get OpenAI review, using heuristic fallback:', {
        error: error.message,
      });
      return this.runHeuristicCodeReview(code, language, filePath);
    }
  }

  /**
   * Comprehensive rule-based static analysis fallback when OpenAI is offline
   */
  public runHeuristicCodeReview(code: string, _language: string, filePath: string): CodeReviewResponse {
    const lines = code.split('\n');
    const issues: CodeReviewIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();

      // Rule 1: SQL Injection (Unparameterized queries)
      if (
        /SELECT\s+.*\s+FROM\s+/i.test(trimmed) &&
        (/\+\s*[a-zA-Z0-9_]+/i.test(trimmed) || /\$\{.*?\}/i.test(trimmed)) &&
        !/\$1|\$2|\?|:\w+/.test(trimmed)
      ) {
        issues.push({
          line: lineNum,
          severity: 'CRITICAL',
          category: 'SECURITY',
          issue: 'Potential SQL Injection via string interpolation',
          recommendation: 'Use parameterized queries ($1, $2 or ORM query builder) instead of raw string concatenation.',
          suggestedCode: trimmed.replace(/\+.*|\$\{.*?\}/g, '$1'),
        });
      }

      // Rule 2: Hardcoded Secrets / API Keys
      if (
        /(api[_-]?key|secret|password|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9_\-\.]{8,}['"`]/i.test(trimmed) &&
        !/process\.env|config|getenv/i.test(trimmed)
      ) {
        issues.push({
          line: lineNum,
          severity: 'CRITICAL',
          category: 'SECURITY',
          issue: 'Hardcoded credentials or API secret detected',
          recommendation: 'Move sensitive credentials and API keys to environment variables (.env).',
          suggestedCode: 'const secret = process.env.API_SECRET;',
        });
      }

      // Rule 3: Remote Code Execution via eval / Function constructor
      if (/\beval\s*\(|\bnew\s+Function\s*\(|\bvm\.runIn/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'CRITICAL',
          category: 'SECURITY',
          issue: 'Dynamic Code Execution (eval / new Function)',
          recommendation: 'Avoid eval() and dynamic code evaluation as it enables arbitrary code execution.',
          suggestedCode: '// Refactor to static parser or JSON.parse',
        });
      }

      // Rule 4: Potential XSS via innerHTML / dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML|\.innerHTML\s*=/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'WARNING',
          category: 'SECURITY',
          issue: 'Direct DOM manipulation or unsanitized HTML injection (XSS risk)',
          recommendation: 'Use DOMPurify or safe text node assignment (textContent) to prevent Cross-Site Scripting.',
          suggestedCode: 'element.textContent = sanitize(userInput);',
        });
      }

      // Rule 5: Command Injection via child_process
      if (/\b(exec|execSync)\s*\(\s*`.*\$\{.*?\}/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'CRITICAL',
          category: 'SECURITY',
          issue: 'Potential Command Injection via unescaped shell execution',
          recommendation: 'Use execFile or spawn with an argument array instead of raw shell execution.',
          suggestedCode: 'execFile("cmd", [arg1, arg2]);',
        });
      }

      // Rule 6: Insecure Randomness for sensitive tokens
      if (/\bMath\.random\s*\(\)/i.test(trimmed) && /(token|auth|session|crypto|key|salt|id)/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'WARNING',
          category: 'SECURITY',
          issue: 'Math.random() is cryptographically insecure for sensitive tokens',
          recommendation: 'Use crypto.randomUUID() or crypto.randomBytes() for security-sensitive tokens.',
          suggestedCode: 'crypto.randomUUID()',
        });
      }

      // Rule 7: Synchronous blocking I/O
      if (/\b(readFileSync|writeFileSync|execSync)\b/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'INFO',
          category: 'PERFORMANCE',
          issue: 'Synchronous I/O blocks the Node.js event loop',
          recommendation: 'Switch to asynchronous non-blocking methods (fs.promises.readFile).',
          suggestedCode: 'await fs.promises.readFile(path, "utf-8");',
        });
      }

      // Rule 8: Silent empty catch block
      if (/catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*\}/i.test(trimmed)) {
        issues.push({
          line: lineNum,
          severity: 'INFO',
          category: 'CODE_SMELL',
          issue: 'Empty catch block silently swallows exceptions',
          recommendation: 'Log the caught error with context or rethrow to preserve observability.',
          suggestedCode: 'catch (error) { logger.error("Operation failed", { error }); throw error; }',
        });
      }
    });

    // Calculate score: start with 100, deduct based on severity
    let penalty = 0;
    issues.forEach((issue) => {
      if (issue.severity === 'CRITICAL') penalty += 30;
      else if (issue.severity === 'WARNING') penalty += 15;
      else if (issue.severity === 'INFO') penalty += 5;
    });

    const score = Math.max(10, Math.min(100, 100 - penalty));

    let summary = '';
    if (issues.length === 0) {
      summary = `Clean code audit for ${filePath}. No critical OWASP vulnerabilities or severe performance anti-patterns detected.`;
    } else {
      const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
      const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
      const infoCount = issues.filter((i) => i.severity === 'INFO').length;

      summary = `Audit identified ${issues.length} potential issue(s) in ${filePath} (${criticalCount} Critical, ${warningCount} Warning, ${infoCount} Info). Review recommended fixes to harden security and performance.`;
    }

    return {
      score,
      summary,
      issues,
    };
  }
}

export const codeReviewService = new CodeReviewService();
