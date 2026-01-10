import { Router } from 'express';
import { prisma } from '../../utils/database.js';

const router = Router();

/**
 * GET /api/user/profile
 * Get current user profile
 */
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        folders: {
          include: {
            folder: {
              select: {
                id: true,
                name: true,
                path: true,
                knowledgeMode: true,
              },
            },
          },
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also get folders via groups
    const groupFolders = await prisma.groupFolder.findMany({
      where: {
        groupId: { in: user.groups.map(g => g.groupId) },
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
            knowledgeMode: true,
          },
        },
      },
    });

    // Combine and deduplicate folders
    const allFolders = [
      ...user.folders.map(uf => uf.folder),
      ...groupFolders.map(gf => gf.folder),
    ];
    
    const uniqueFolders = Array.from(
      new Map(allFolders.map(f => [f.id, f])).values()
    );

    res.json({
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      accessibleFolders: uniqueFolders,
      groups: user.groups.map(g => g.group),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/profile/stats
 * Get user's usage statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const [chatCount, messageCount, feedbackCount] = await Promise.all([
      prisma.chat.count({ where: { userId } }),
      prisma.chatMessage.count({
        where: {
          chat: { userId },
          role: 'USER',
        },
      }),
      prisma.chatMessage.count({
        where: {
          chat: { userId },
          feedback: { not: null },
        },
      }),
    ]);

    res.json({
      stats: {
        totalChats: chatCount,
        totalMessages: messageCount,
        feedbackGiven: feedbackCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

