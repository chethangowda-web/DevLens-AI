import { CodeReviewService } from '../src/modules/intelligence/codeReview.service';
import { TestGeneratorService } from '../src/modules/intelligence/testGenerator.service';

describe('Phase 11: Automated Code Review & Test Generation Suite', () => {
  describe('Unit: CodeReviewService Static Heuristic & Vulnerability Scanner', () => {
    const service = new CodeReviewService();

    it('should detect SQL Injection and flag as CRITICAL severity', async () => {
      const vulnerableCode = `
        export async function getUserById(userId: string) {
          const query = "SELECT * FROM users WHERE id = '" + userId + "'";
          return db.query(query);
        }
      `;

      const review = await service.reviewCode({
        code: vulnerableCode,
        language: 'typescript',
        filePath: 'src/user.repository.ts',
      });

      expect(review.score).toBeLessThan(80);
      expect(review.issues.length).toBeGreaterThanOrEqual(1);

      const sqlIssue = review.issues.find((i) => i.issue.includes('SQL Injection'));
      expect(sqlIssue).toBeDefined();
      expect(sqlIssue?.severity).toBe('CRITICAL');
      expect(sqlIssue?.category).toBe('SECURITY');
      expect(sqlIssue?.recommendation).toContain('parameterized queries');
    });

    it('should detect Hardcoded API Secrets and flag as CRITICAL severity', async () => {
      const codeWithSecret = `
        const apiKey = 'sk-proj-998877665544332211';
        export const client = new ServiceClient({ apiKey });
      `;

      const review = await service.reviewCode({
        code: codeWithSecret,
        language: 'typescript',
        filePath: 'src/config/client.ts',
      });

      const secretIssue = review.issues.find((i) => i.issue.includes('Hardcoded credentials'));
      expect(secretIssue).toBeDefined();
      expect(secretIssue?.severity).toBe('CRITICAL');
      expect(secretIssue?.category).toBe('SECURITY');
    });

    it('should detect dynamic code evaluation (eval / new Function)', async () => {
      const codeWithEval = `
        export function runDynamic(expression: string) {
          return eval(expression);
        }
      `;

      const review = await service.reviewCode({
        code: codeWithEval,
        language: 'javascript',
      });

      const evalIssue = review.issues.find((i) => i.issue.includes('Dynamic Code Execution'));
      expect(evalIssue).toBeDefined();
      expect(evalIssue?.severity).toBe('CRITICAL');
    });

    it('should detect silent empty catch blocks and assign score penalty', async () => {
      const codeWithSilentCatch = `
        export function riskyOperation() {
          try {
            doSomething();
          } catch (err) {}
        }
      `;

      const review = await service.reviewCode({
        code: codeWithSilentCatch,
        language: 'typescript',
      });

      const catchIssue = review.issues.find((i) => i.issue.includes('Empty catch block'));
      expect(catchIssue).toBeDefined();
      expect(catchIssue?.category).toBe('CODE_SMELL');
    });

    it('should award a high quality score (>=90) for clean secure code', async () => {
      const cleanCode = `
        import { db } from './db';
        
        export async function findUser(id: string) {
          return db.query('SELECT * FROM users WHERE id = $1', [id]);
        }
      `;

      const review = await service.reviewCode({
        code: cleanCode,
        language: 'typescript',
        filePath: 'src/clean.ts',
      });

      expect(review.score).toBeGreaterThanOrEqual(90);
      expect(review.issues.length).toBe(0);
      expect(review.summary).toContain('Clean code audit');
    });
  });

  describe('Unit: TestGeneratorService Automated Test Synthesizer', () => {
    const testGen = new TestGeneratorService();

    it('should detect Jest framework for TypeScript source files and synthesize test cases', async () => {
      const tsCode = `
        export class MathService {
          static multiply(a: number, b: number): number {
            return a * b;
          }
          static divide(a: number, b: number): number {
            if (b === 0) throw new Error('Division by zero');
            return a / b;
          }
        }
      `;

      const result = await testGen.generateTests({
        code: tsCode,
        filePath: 'src/math/math.service.ts',
        language: 'typescript',
      });

      expect(result.framework).toBe('jest');
      expect(result.targetFilePath).toBe('src/math/math.service.ts');
      expect(result.testFilePath).toBe('src/math/math.service.test.ts');
      expect(result.testCode).toContain('describe(');
      expect(result.testCode).toContain('MathService');
      expect(result.testCases.length).toBeGreaterThanOrEqual(3);

      const happyPath = result.testCases.find((tc) => tc.type === 'happy_path');
      const edgeCase = result.testCases.find((tc) => tc.type === 'edge_case');
      const errorHandling = result.testCases.find((tc) => tc.type === 'error_handling');

      expect(happyPath).toBeDefined();
      expect(edgeCase).toBeDefined();
      expect(errorHandling).toBeDefined();
    });

    it('should detect PyTest framework for Python source files', async () => {
      const pyCode = `
class Calculator:
    def add(self, a, b):
        return a + b
      `;

      const result = await testGen.generateTests({
        code: pyCode,
        filePath: 'services/calculator.py',
        language: 'python',
      });

      expect(result.framework).toBe('pytest');
      expect(result.testFilePath).toBe('services/test_calculator.py');
      expect(result.testCode).toContain('import pytest');
      expect(result.testCode).toContain('def test_happy_path');
    });

    it('should detect Go test framework for Go source files', async () => {
      const goCode = `
package auth

func ValidateToken(token string) bool {
    return len(token) > 0
}
      `;

      const result = await testGen.generateTests({
        code: goCode,
        filePath: 'auth/token.go',
        language: 'go',
      });

      expect(result.framework).toBe('go_test');
      expect(result.testFilePath).toBe('auth/token_test.go');
      expect(result.testCode).toContain('"testing"');
    });
  });
});
