import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export interface AuditAction {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log audit event to database
 */
export const logAudit = async (
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>,
  req?: Request
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      },
    });
  } catch (error) {
    logger.error('Failed to log audit event:', error);
  }
};

/**
 * Middleware to automatically log certain actions
 */
export const auditMiddleware = (action: string, entityType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = (body: unknown) => {
      // Only log on success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || (body as Record<string, unknown>)?.id as string;
        
        logAudit(
          req.user?.id,
          action,
          entityType,
          entityId,
          { method: req.method, path: req.path },
          req
        );
      }

      return originalJson(body);
    };

    next();
  };
};

// Predefined audit actions
export const AuditActions = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',

  // Users
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_FOLDER_ASSIGN: 'USER_FOLDER_ASSIGN',
  USER_GROUP_ASSIGN: 'USER_GROUP_ASSIGN',

  // Groups
  GROUP_CREATE: 'GROUP_CREATE',
  GROUP_UPDATE: 'GROUP_UPDATE',
  GROUP_DELETE: 'GROUP_DELETE',

  // Knowledge
  FOLDER_CREATE: 'FOLDER_CREATE',
  FOLDER_UPDATE: 'FOLDER_UPDATE',
  FOLDER_DELETE: 'FOLDER_DELETE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  DOCUMENT_REINDEX: 'DOCUMENT_REINDEX',

  // Chat
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_FEEDBACK: 'CHAT_FEEDBACK',

  // Settings
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  PROMPT_UPDATE: 'PROMPT_UPDATE',
} as const;

