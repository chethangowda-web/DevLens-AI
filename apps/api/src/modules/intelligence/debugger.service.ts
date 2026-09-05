import { DebugResponse } from '@devlens/types';
import { env } from '../../config/env';
import OpenAI from 'openai';
import { db } from '../../db/client';
import { logger } from '../../utils/logger';

export interface ParsedStackFrame {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
  rawLine: string;
}

export interface ParsedStackTrace {
  errorType: string;
  errorMessage: string;
  frames: ParsedStackFrame[];
}

export interface DebugOptions {
  stackTrace: string;
  code?: string;
  repositoryId?: string;
}

export class DebuggerService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock' && env.OPENAI_API_KEY.trim() !== '') {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  /**
   * Parse runtime stack traces from Node.js, Python, Java, Go, etc.
   */
  static parseStackTrace(stackTrace: string): ParsedStackTrace {
    const lines = stackTrace.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return { errorType: 'Error', errorMessage: 'Unknown error', frames: [] };
    }

    const firstLine = lines[0];
    let errorType = 'Error';
    let errorMessage = firstLine;

    const errorMatch = firstLine.match(/^([A-Za-z0-9_]+Error|Exception|Panic):\s*(.*)$/i);
    if (errorMatch) {
      errorType = errorMatch[1];
      errorMessage = errorMatch[2] || firstLine;
    }

    const frames: ParsedStackFrame[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Match Node.js V8 stack trace: "at func (src/auth/file.ts:12:34)" or "at src/auth/file.ts:12:34"
      const nodeMatch = line.match(/^at (?:(.+?)\s+\()?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?\)?$/);
      if (nodeMatch) {
        frames.push({
          functionName: nodeMatch[1] || 'anonymous',
          filePath: nodeMatch[2].replace(/\\/g, '/'),
          lineNumber: parseInt(nodeMatch[3], 10),
          columnNumber: nodeMatch[4] ? parseInt(nodeMatch[4], 10) : undefined,
          rawLine: line,
        });
        continue;
      }

      // Match Python trace: 'File "src/math/calculator.py", line 42, in my_func'
      const pythonMatch = line.match(/File "([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)", line (\d+)(?:, in (.+))?/);
      if (pythonMatch) {
        frames.push({
          filePath: pythonMatch[1].replace(/\\/g, '/'),
          lineNumber: parseInt(pythonMatch[2], 10),
          functionName: pythonMatch[3] || undefined,
          rawLine: line,
        });
        continue;
      }
    }

    return { errorType, errorMessage, frames };
  }

  async diagnoseError(options: DebugOptions): Promise<DebugResponse> {
    const { stackTrace, repositoryId } = options;
    let code = options.code || '';

    const parsedTrace = DebuggerService.parseStackTrace(stackTrace);

    // If code is not provided but repositoryId is, look up the top stack frame file
    if (!code && repositoryId && parsedTrace.frames.length > 0) {
      const topFrame = parsedTrace.frames[0];
      try {
        const query = `
          SELECT content, file_path 
          FROM code_files f
          JOIN code_chunks c ON c.file_id = f.id
          WHERE f.repository_id = $1 
            AND (f.file_path LIKE $2 OR f.file_path = $3)
          ORDER BY f.created_at DESC
          LIMIT 1;
        `;
        const searchPattern = `%${topFrame.filePath}%`;
        const res = await db.query(query, [repositoryId, searchPattern, topFrame.filePath]);
        if (res.rows.length > 0) {
          code = res.rows[0].content;
        }
      } catch (err) {
        logger.warn('Failed to query source file for stack frame:', { error: err });
      }
    }

    if (!this.client) {
      logger.info('OpenAI not configured; generating simulated bug diagnosis.');
      return this.simulateDiagnosis(parsedTrace, code);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert runtime debugger and root cause analyzer.
Analyze the provided stack trace and code context.
Return a structured JSON object matching this schema:
{
  "rootCause": "Clear explanation of why this error happens",
  "suggestedFix": "Concrete actionable recommendations to resolve the issue",
  "originalCode": "Target original code snippet around the error",
  "modifiedCode": "The fixed version of that code snippet",
  "unifiedDiff": "--- original\\n+++ modified\\n@@ -1,3 +1,3 @@\\n-oldLine\\n+newLine"
}
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Stack Trace:\n${stackTrace}\n\nCode Context:\n${code || 'No code provided'}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        rootCause: parsed.rootCause || 'Root cause determined from stack trace analysis.',
        suggestedFix: parsed.suggestedFix || 'Apply defensive checks or null-coalescing guards.',
        originalCode: parsed.originalCode || code || '// Original code',
        modifiedCode: parsed.modifiedCode || code || '// Fixed code',
        unifiedDiff: parsed.unifiedDiff || '--- original\n+++ modified\n',
      };
    } catch (error: any) {
      logger.warn('OpenAI diagnosis failed, falling back to simulated output:', {
        error: error.message,
      });
      return this.simulateDiagnosis(parsedTrace, code);
    }
  }

  private simulateDiagnosis(parsedTrace: ParsedStackTrace, code: string): DebugResponse {
    const topFrame = parsedTrace.frames[0];
    const targetFile = topFrame?.filePath || 'src/index.ts';
    const targetLine = topFrame?.lineNumber || 12;

    const originalCode = code || `function processItem(item) {\n  const name = item.profile.name;\n  return name.toUpperCase();\n}`;
    const modifiedCode = `function processItem(item) {\n  // Defensive null-safe check\n  const name = item?.profile?.name ?? 'Unknown';\n  return name.toUpperCase();\n}`;

    const unifiedDiff = `--- ${targetFile}:${targetLine}\n+++ ${targetFile}:${targetLine}\n@@ -1,3 +1,4 @@\n function processItem(item) {\n-  const name = item.profile.name;\n+  // Defensive null-safe check\n+  const name = item?.profile?.name ?? 'Unknown';\n   return name.toUpperCase();\n }`;

    return {
      rootCause: `${parsedTrace.errorType}: "${parsedTrace.errorMessage}" triggered at ${targetFile}:${targetLine}. Attempted property access or invocation on an undefined reference.`,
      suggestedFix: `Add optional chaining (?.) and default fallback nullish coalescing (??) or validate payload invariants before processing.`,
      originalCode,
      modifiedCode,
      unifiedDiff,
    };
  }
}

export const debuggerService = new DebuggerService();
