// ==============================================================================
// DevLens AI - Shared Domain Types & API DTOs
// ==============================================================================

// User Domain
export type UserRole = 'developer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  githubId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
}

// Project & Repository Domain
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
}

export type IngestionStatus = 'PENDING' | 'QUEUED' | 'INDEXING' | 'INDEXED' | 'FAILED';

export interface Repository {
  id: string;
  projectId: string;
  name: string;
  gitUrl?: string | null;
  defaultBranch: string;
  status: IngestionStatus;
  totalFiles: number;
  totalChunks: number;
  lastIndexedAt?: Date | null;
  createdAt: Date;
}

export interface CodeFile {
  id: string;
  repositoryId: string;
  filePath: string;
  language: string;
  fileSizeBytes: number;
  fileHash: string;
  createdAt: Date;
}

export type SymbolType = 'function' | 'class' | 'method' | 'interface' | 'type' | 'module';

export interface CodeChunk {
  id: string;
  fileId: string;
  content: string;
  embedding?: number[];
  startLine: number;
  endLine: number;
  symbolName?: string | null;
  symbolType?: SymbolType | null;
  chunkHash: string;
}

// Search & Retrieval DTOs
export interface SearchResultItem {
  chunkId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string | null;
  symbolType?: SymbolType | null;
  score: number;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  totalResults: number;
  latencyMs: number;
}

// AI & Chat Domain
export type MessageSender = 'user' | 'assistant' | 'system';

export interface CodeCitation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string | null;
  snippet?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: MessageSender;
  content: string;
  citations: CodeCitation[];
  promptTokens: number;
  completionTokens: number;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: Date;
}

// Code Intelligence DTOs
export interface CodeExplanationResponse {
  summary: string;
  lineByLine: Array<{ line: number; explanation: string }>;
  complexity: {
    time: string;
    space: string;
  };
  keyConcepts: string[];
}

export interface DebugResponse {
  rootCause: string;
  suggestedFix: string;
  originalCode: string;
  modifiedCode: string;
  unifiedDiff: string;
}

export interface CodeReviewIssue {
  line?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SECURITY' | 'PERFORMANCE' | 'CODE_SMELL' | 'MAINTAINABILITY';
  issue: string;
  recommendation: string;
  suggestedCode?: string;
}

export interface CodeReviewResponse {
  score: number; // 0-100
  summary: string;
  issues: CodeReviewIssue[];
}

// API Generic Response Envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
