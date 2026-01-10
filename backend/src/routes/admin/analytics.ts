import { Router } from 'express';
import { prisma } from '../../utils/database.js';

const router = Router();

/**
 * GET /api/admin/analytics/overview
 * Get overall system statistics
 */
router.get('/overview', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
    }

    const [
      totalUsers,
      activeUsers,
      totalChats,
      totalMessages,
      totalDocuments,
      indexedDocuments,
      feedbackStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.chat.count({
        where: dateFilter.gte ? { createdAt: dateFilter } : undefined,
      }),
      prisma.chatMessage.count({
        where: {
          role: 'USER',
          ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
        },
      }),
      prisma.document.count(),
      prisma.document.count({ where: { status: 'INDEXED' } }),
      prisma.chatMessage.groupBy({
        by: ['feedback'],
        where: { feedback: { not: null } },
        _count: true,
      }),
    ]);

    const feedbackBreakdown = {
      positive: feedbackStats.find(f => f.feedback === 'POSITIVE')?._count || 0,
      negative: feedbackStats.find(f => f.feedback === 'NEGATIVE')?._count || 0,
    };

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      chats: {
        total: totalChats,
        messages: totalMessages,
      },
      documents: {
        total: totalDocuments,
        indexed: indexedDocuments,
        pending: totalDocuments - indexedDocuments,
      },
      feedback: feedbackBreakdown,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/usage
 * Get usage statistics over time
 */
router.get('/usage', async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get daily message counts
    const messages = await prisma.chatMessage.findMany({
      where: {
        role: 'USER',
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    messages.forEach(msg => {
      const day = msg.createdAt.toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    // Fill in missing days
    const usage = [];
    const current = new Date(startDate);
    while (current <= now) {
      const day = current.toISOString().split('T')[0];
      usage.push({
        date: day,
        messages: dailyCounts[day] || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({ usage, period });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/top-users
 * Get most active users
 */
router.get('/top-users', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query;

    const topUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        _count: {
          select: { chats: true },
        },
      },
      orderBy: {
        chats: { _count: 'desc' },
      },
      take: parseInt(limit as string),
    });

    res.json({
      users: topUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
        chatCount: u._count.chats,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/top-folders
 * Get most accessed folders
 */
router.get('/top-folders', async (req, res, next) => {
  try {
    const topFolders = await prisma.folder.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        path: true,
        _count: {
          select: {
            documents: true,
            userFolders: true,
          },
        },
      },
      orderBy: {
        userFolders: { _count: 'desc' },
      },
      take: 10,
    });

    res.json({
      folders: topFolders.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        documentCount: f._count.documents,
        userCount: f._count.userFolders,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/unanswered
 * Get questions that couldn't be answered (no sources found)
 */
router.get('/unanswered', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query;

    // Find messages where mode was LLM_ONLY (no documents found)
    const unanswered = await prisma.chatMessage.findMany({
      where: {
        role: 'ASSISTANT',
        mode: 'LLM_ONLY',
        sources: { equals: null },
      },
      include: {
        chat: {
          include: {
            messages: {
              where: { role: 'USER' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      questions: unanswered.map(msg => ({
        id: msg.id,
        question: msg.chat.messages[0]?.content || 'Unknown',
        timestamp: msg.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

