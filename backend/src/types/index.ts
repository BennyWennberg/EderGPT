// EderGPT Backend Type Definitions

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// AUTH TYPES
// ============================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessageRequest {
  message: string;
  chatId?: string;
}

export interface ChatMessageResponse {
  chatId: string;
  messageId: string;
  content: string;
  mode: 'LLM_ONLY' | 'HYBRID' | 'RAG_ONLY';
  sources: SourceInfo[];
  suggestedQuestions?: string[];
}

export interface SourceInfo {
  documentId: string;
  documentName: string;
  folderPath: string;
  pageNumber?: number;
  chunkId: string;
  relevanceScore: number;
  snippet?: string;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface SystemSettings {
  general: GeneralSettings;
  chat: ChatSettings;
  llm: LLMSettings;
  rag: RAGSettings;
  ingest: IngestSettings;
  logging: LoggingSettings;
  security: SecuritySettings;
  analytics: AnalyticsSettings;
}

export interface GeneralSettings {
  systemName: string;
  tenantMode: boolean;
  defaultLanguage: string;
  safeMode: boolean;
}

export interface ChatSettings {
  structuredAnswers: boolean;
  summaryWithDetails: boolean;
  highlightImportant: boolean;
  contextContinue: boolean;
  maxContextTurns: number;
  allowChatReset: boolean;
  forceRephrase: boolean;
  noHallucination: boolean;
  noKnowledgeMessage: string;
  suggestFollowUp: boolean;
  followUpCount: number;
}

export interface LLMSettings {
  provider: string;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  requestTimeout: number;
  retryAttempts: number;
  contentFilter: boolean;
}

export interface RAGSettings {
  defaultMode: 'LLM_ONLY' | 'HYBRID' | 'RAG_ONLY';
  topK: number;
  similarityThreshold: number;
  maxChunksPerDocument: number;
  deDuplicate: boolean;
  reRanking: boolean;
  reRankTopN: number;
  contextCompression: boolean;
  citationMode: 'document' | 'chunk';
  fallbackToLLM: boolean;
  forceRephraseOnWeakRetrieval: boolean;
}

export interface IngestSettings {
  autoIngest: boolean;
  autoReindex: boolean;
  reindexStrategy: 'incremental' | 'full';
  chunkTargetSize: number;
  chunkOverlap: number;
  enabledParsers: string[];
  imageProcessing: boolean;
}

export interface LoggingSettings {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  logChatRequests: boolean;
  logChatResponses: boolean;
  logSources: boolean;
  logAdminActions: boolean;
  logIngestEvents: boolean;
  logRetrievalEvents: boolean;
  piiMasking: boolean;
  retentionDays: number;
  allowExport: boolean;
}

export interface SecuritySettings {
  sessionLifetimeMinutes: number;
  idleTimeoutMinutes: number;
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
}

export interface AnalyticsSettings {
  feedbackEnabled: boolean;
  feedbackTypes: string[];
  dashboardMetrics: string[];
}

