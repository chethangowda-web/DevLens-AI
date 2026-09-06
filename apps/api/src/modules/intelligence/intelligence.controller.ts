import { Request, Response, NextFunction } from 'express';
import { explainerService } from './explainer.service';
import { debuggerService } from './debugger.service';
import { codeReviewService } from './codeReview.service';
import { testGeneratorService } from './testGenerator.service';
import { AppError } from '../../middleware/errorHandler';

export class IntelligenceController {
  /**
   * Explain code snippet with structured complexity analysis
   */
  static async explainCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language, targetAudience } = req.body;

      if (!code || typeof code !== 'string' || !code.trim()) {
        throw AppError.badRequest('Code snippet is required for explanation');
      }

      const result = await explainerService.explainCode({
        code: code.trim(),
        language,
        targetAudience,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Diagnose runtime error / stack trace and generate Before/After diff
   */
  static async debugError(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stackTrace, code, repositoryId } = req.body;

      if (!stackTrace || typeof stackTrace !== 'string' || !stackTrace.trim()) {
        throw AppError.badRequest('Error log or stack trace is required for debugging');
      }

      const result = await debuggerService.diagnoseError({
        stackTrace: stackTrace.trim(),
        code,
        repositoryId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run automated security (OWASP) & quality code review
   */
  static async reviewCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language, filePath } = req.body;

      if (!code || typeof code !== 'string' || !code.trim()) {
        throw AppError.badRequest('Code snippet is required for code review');
      }

      const result = await codeReviewService.reviewCode({
        code: code.trim(),
        language,
        filePath,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate comprehensive automated unit test suite
   */
  static async generateTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, filePath, language, framework } = req.body;

      if (!code || typeof code !== 'string' || !code.trim()) {
        throw AppError.badRequest('Code snippet is required for test generation');
      }

      const result = await testGeneratorService.generateTests({
        code: code.trim(),
        filePath,
        language,
        framework,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
