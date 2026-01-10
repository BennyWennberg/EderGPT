// EderGPT Frontend Type Definitions

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'POWER_USER' | 'USER' | 'READONLY';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

// ============================================
// FOLDER TYPES
// ============================================

export interface Folder {
  id: string;
  name: string;
  path: string;
  description?: string;
  parentId?: string;
  knowledgeMode: KnowledgeMode;
  status: FolderStatus;
  priority: number;
  children?: Folder[];
  _count?: {
    documents: number;
  };
}

export type KnowledgeMode = 'LLM_ONLY' | 'HYBRID' | 'RAG_ONLY';
export type FolderStatus = 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

// ============================================
// DOCUMENT TYPES
// ============================================

export interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  folderId: string;
  folder?: Folder;
  createdAt: string;
  processedAt?: string;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED' | 'ARCHIVED';

// ============================================
// CHAT TYPES
// ============================================

export interface Chat {
  id: string;
  title?: string;
  userId: string;
  isArchived: boolean;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  mode?: KnowledgeMode;
  sources?: Source[];
  feedback?: 'POSITIVE' | 'NEGATIVE';
  createdAt: string;
}

export interface Source {
  documentId: string;
  documentName: string;
  folderPath: string;
  pageNumber?: number;
  chunkId: string;
  relevanceScore: number;
  snippet?: string;
}

// ============================================
// GROUP TYPES
// ============================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  _count?: {
    users: number;
    folders: number;
  };
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userId?: string;
  user?: {
    username: string;
  };
  createdAt: string;
}

// ============================================
// API TYPES
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiError {
  error: string;
  message?: string;
}

