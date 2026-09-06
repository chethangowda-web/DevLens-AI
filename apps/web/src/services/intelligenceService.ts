import { apiClient } from './apiClient';
import {
  ApiResponse,
  CodeExplanationResponse,
  DebugResponse,
  CodeReviewResponse,
  TestGenerationResponse,
  TestFramework,
} from '@devlens/types';

export interface ExplainCodeParams {
  projectId: string;
  code: string;
  language?: string;
  targetAudience?: 'beginner' | 'intermediate' | 'architect';
}

export interface DebugErrorParams {
  projectId: string;
  stackTrace: string;
  code?: string;
  repositoryId?: string;
}

export interface ReviewCodeParams {
  projectId: string;
  code: string;
  language?: string;
  filePath?: string;
}

export interface GenerateTestsParams {
  projectId: string;
  code: string;
  filePath?: string;
  language?: string;
  framework?: TestFramework;
}

export const intelligenceService = {
  async explainCode(params: ExplainCodeParams): Promise<CodeExplanationResponse> {
    const res = await apiClient.post<ApiResponse<CodeExplanationResponse>>(
      `/projects/${params.projectId}/ai/explain`,
      {
        code: params.code,
        language: params.language,
        targetAudience: params.targetAudience || 'intermediate',
      }
    );
    if (!res.data.data) throw new Error('Failed to explain code');
    return res.data.data;
  },

  async debugError(params: DebugErrorParams): Promise<DebugResponse> {
    const res = await apiClient.post<ApiResponse<DebugResponse>>(
      `/projects/${params.projectId}/ai/debug`,
      {
        stackTrace: params.stackTrace,
        code: params.code,
        repositoryId: params.repositoryId,
      }
    );
    if (!res.data.data) throw new Error('Failed to diagnose error');
    return res.data.data;
  },

  async reviewCode(params: ReviewCodeParams): Promise<CodeReviewResponse> {
    const res = await apiClient.post<ApiResponse<CodeReviewResponse>>(
      `/projects/${params.projectId}/ai/review`,
      {
        code: params.code,
        language: params.language,
        filePath: params.filePath,
      }
    );
    if (!res.data.data) throw new Error('Failed to run code review');
    return res.data.data;
  },

  async generateTests(params: GenerateTestsParams): Promise<TestGenerationResponse> {
    const res = await apiClient.post<ApiResponse<TestGenerationResponse>>(
      `/projects/${params.projectId}/ai/generate-tests`,
      {
        code: params.code,
        filePath: params.filePath,
        language: params.language,
        framework: params.framework,
      }
    );
    if (!res.data.data) throw new Error('Failed to generate test suite');
    return res.data.data;
  },
};

