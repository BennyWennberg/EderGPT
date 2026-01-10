import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';

// Import admin sub-routes
import usersRoutes from './users.js';
import groupsRoutes from './groups.js';
import knowledgeRoutes from './knowledge.js';
import settingsRoutes from './settings.js';
import promptsRoutes from './prompts.js';
import auditRoutes from './audit.js';
import analyticsRoutes from './analytics.js';
import chatRoutes from './chat.js';

const router = Router();

// Apply authentication and admin check to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Mount sub-routes
router.use('/users', usersRoutes);
router.use('/groups', groupsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/settings', settingsRoutes);
router.use('/prompts', promptsRoutes);
router.use('/audit', auditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/chat', chatRoutes);

// Dashboard endpoint
router.get('/dashboard', async (req, res, next) => {
  try {
    const { prisma } = await import('../../utils/database.js');

    // Get counts
    const [
      userCount,
      folderCount,
      documentCount,
      chatCount,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.folder.count({ where: { status: 'ACTIVE' } }),
      prisma.document.count({ where: { status: 'INDEXED' } }),
      prisma.chat.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true } },
        },
      }),
    ]);

    res.json({
      stats: {
        users: userCount,
        folders: folderCount,
        documents: documentCount,
        chats: chatCount,
      },
      recentActivity: recentAuditLogs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

