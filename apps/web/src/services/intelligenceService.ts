import { apiClient } from './apiClient';
import { ApiResponse, CodeExplanationResponse, DebugResponse } from '@devlens/types';

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
};
