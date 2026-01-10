import { Router } from 'express';
import { prisma } from '../../utils/database.js';
import { chatService } from '../../services/chat/chatService.js';

const router = Router();

/**
 * POST /api/admin/chat/message
 * Admin test chat (full access to all folders)
 */
router.post('/message', async (req, res, next) => {
  try {
    const { message, chatId } = req.body;

    // For admin chat, get all active folders
    const allFolders = await prisma.folder.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const folderIds = allFolders.map(f => f.id);

    // Process message through chat service
    const response = await chatService.processMessage({
      userId: req.user!.id,
      message,
      chatId,
      allowedFolderIds: folderIds,
      isAdmin: true,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/chat/preview
 * Preview chat as a specific user
 */
router.post('/preview', async (req, res, next) => {
  try {
    const { userId, message, chatId } = req.body;

    // Get the target user's folders
    const userFolders = await prisma.userFolder.findMany({
      where: { userId },
      select: { folderId: true },
    });

    // Also get folders from user's groups
    const userGroups = await prisma.userGroup.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupFolders = await prisma.groupFolder.findMany({
      where: { groupId: { in: userGroups.map(ug => ug.groupId) } },
      select: { folderId: true },
    });

    // Combine and deduplicate folder IDs
    const folderIds = [...new Set([
      ...userFolders.map(uf => uf.folderId),
      ...groupFolders.map(gf => gf.folderId),
    ])];

    // Process message through chat service
    const response = await chatService.processMessage({
      userId: req.user!.id, // Still logged as admin
      message,
      chatId,
      allowedFolderIds: folderIds,
      isAdmin: true,
      previewUserId: userId, // For logging/tracking
    });

    res.json({
      ...response,
      previewMode: true,
      previewUserId: userId,
      accessibleFolders: folderIds.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/chat/history
 * Get all chat history (for monitoring)
 */
router.get('/history', async (req, res, next) => {
  try {
    const { userId, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.chat.count({ where }),
    ]);

    res.json({
      chats,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/chat/:chatId/messages
 * Get messages for a specific chat
 */
router.get('/:chatId/messages', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

export default router;

