import { prisma } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';

/**
 * Access Control Service
 * Centralized permission checking for folder/document access
 */
export const accessService = {
  /**
   * Get all folder IDs a user has access to
   * (direct assignments + group assignments)
   */
  async getUserFolderIds(userId: string): Promise<string[]> {
    try {
      // Get direct folder assignments
      const userFolders = await prisma.userFolder.findMany({
        where: { userId },
        select: { folderId: true },
      });

      // Get user's groups
      const userGroups = await prisma.userGroup.findMany({
        where: { userId },
        select: { groupId: true },
      });

      // Get folders from groups
      const groupFolders = await prisma.groupFolder.findMany({
        where: { groupId: { in: userGroups.map(ug => ug.groupId) } },
        select: { folderId: true },
      });

      // Combine and deduplicate
      const allFolderIds = new Set([
        ...userFolders.map(uf => uf.folderId),
        ...groupFolders.map(gf => gf.folderId),
      ]);

      // Also include child folders (inheritance)
      const childFolders = await prisma.folder.findMany({
        where: {
          parentId: { in: Array.from(allFolderIds) },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      childFolders.forEach(cf => allFolderIds.add(cf.id));

      return Array.from(allFolderIds);
    } catch (error) {
      logger.error('Error getting user folder IDs:', error);
      return [];
    }
  },

  /**
   * Check if a user can access a specific folder
   */
  async canAccessFolder(userId: string, folderId: string): Promise<boolean> {
    const allowedFolders = await this.getUserFolderIds(userId);
    return allowedFolders.includes(folderId);
  },

  /**
   * Check if a user can access a specific document
   */
  async canAccessDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { folderId: true },
    });

    if (!document) return false;

    return this.canAccessFolder(userId, document.folderId);
  },

  /**
   * Get folders with full details that a user has access to
   */
  async getUserFolders(userId: string) {
    const folderIds = await this.getUserFolderIds(userId);

    return prisma.folder.findMany({
      where: {
        id: { in: folderIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        path: true,
        knowledgeMode: true,
        description: true,
      },
      orderBy: { path: 'asc' },
    });
  },

  /**
   * Filter a list of chunk IDs to only those the user can access
   */
  async filterAccessibleChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    const allowedFolders = await this.getUserFolderIds(userId);

    const accessibleChunks = await prisma.chunk.findMany({
      where: {
        id: { in: chunkIds },
        document: {
          folderId: { in: allowedFolders },
          status: 'INDEXED',
        },
      },
      select: { id: true },
    });

    return accessibleChunks.map(c => c.id);
  },
};

