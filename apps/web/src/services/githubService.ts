import { apiClient } from './apiClient';
import {
  ApiResponse,
  CommitMessageResponse,
  PRReviewSummary,
  GitHubIntegration,
} from '@devlens/types';

export interface GenerateCommitParams {
  diff: string;
  context?: string;
}

export interface SummarizePRParams {
  diff: string;
  prTitle?: string;
  prDescription?: string;
  prNumber?: number;
  prUrl?: string;
}

export const githubService = {
  async generateCommit(params: GenerateCommitParams): Promise<CommitMessageResponse> {
    const res = await apiClient.post<ApiResponse<CommitMessageResponse>>(
      '/github/generate-commit',
      params
    );
    if (!res.data.data) throw new Error('Failed to generate commit message');
    return res.data.data;
  },

  async summarizePR(params: SummarizePRParams): Promise<PRReviewSummary> {
    const res = await apiClient.post<ApiResponse<PRReviewSummary>>(
      '/github/summarize-pr',
      params
    );
    if (!res.data.data) throw new Error('Failed to summarize Pull Request');
    return res.data.data;
  },

  async getIntegrations(): Promise<GitHubIntegration[]> {
    const res = await apiClient.get<ApiResponse<GitHubIntegration[]>>('/github/integrations');
    return res.data.data || [];
  },
};
