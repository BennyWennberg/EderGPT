import { Router } from 'express';
import { prisma } from '../../utils/database.js';

const router = Router();

/**
 * GET /api/user/history
 * Get user's chat history
 */
router.get('/', async (req, res, next) => {
  try {
    const { archived, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
    };

    if (archived !== undefined) {
      where.isArchived = archived === 'true';
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        select: {
          id: true,
          title: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            select: { content: true, role: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.chat.count({ where }),
    ]);

    // Add preview (first message)
    const chatsWithPreview = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      isArchived: chat.isArchived,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat._count.messages,
      preview: chat.messages[0]?.content?.slice(0, 100) || '',
    }));

    res.json({
      chats: chatsWithPreview,
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
 * GET /api/user/history/search
 * Search through chat history
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ chats: [] });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        chat: { userId: req.user!.id },
        content: { contains: q as string, mode: 'insensitive' },
      },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
        chat: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      results: messages.map(m => ({
        messageId: m.id,
        chatId: m.chat.id,
        chatTitle: m.chat.title,
        content: m.content.slice(0, 200),
        role: m.role,
        timestamp: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user/history/export
 * Export chat history
 */
router.post('/export', async (req, res, next) => {
  try {
    const { chatIds, format = 'json' } = req.body;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
    };

    if (chatIds && Array.isArray(chatIds)) {
      where.id = { in: chatIds };
    }

    const chats = await prisma.chat.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (format === 'markdown') {
      let markdown = '# Chat Export\n\n';
      
      for (const chat of chats) {
        markdown += `## ${chat.title || 'Untitled Chat'}\n`;
        markdown += `*Created: ${chat.createdAt.toISOString()}*\n\n`;
        
        for (const msg of chat.messages) {
          const role = msg.role === 'USER' ? '**You:**' : '**EderGPT:**';
          markdown += `${role}\n${msg.content}\n\n`;
        }
        
        markdown += '---\n\n';
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=chat-export.md');
      return res.send(markdown);
    }

    // Default to JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=chat-export.json');
    res.json({ chats });
  } catch (error) {
    next(error);
  }
});

export default router;

