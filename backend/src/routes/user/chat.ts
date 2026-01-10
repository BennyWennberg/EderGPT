import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../../utils/database.js';
import { BadRequestError, NotFoundError } from '../../middleware/errorHandler.js';
import { chatService } from '../../services/chat/chatService.js';
import { accessService } from '../../services/knowledge/accessService.js';

const router = Router();

/**
 * POST /api/user/chat/message
 * Send a message and get AI response
 */
router.post(
  '/message',
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { message, chatId } = req.body;
      const userId = req.user!.id;

      // Get user's allowed folders
      const allowedFolderIds = await accessService.getUserFolderIds(userId);

      // Process message through chat service
      const response = await chatService.processMessage({
        userId,
        message,
        chatId,
        allowedFolderIds,
        isAdmin: false,
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/user/chat/new
 * Create a new chat
 */
router.post('/new', async (req, res, next) => {
  try {
    const { title } = req.body;

    const chat = await prisma.chat.create({
      data: {
        userId: req.user!.id,
        title: title || 'Neuer Chat',
      },
    });

    res.status(201).json({ chat });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/chat/:chatId
 * Get chat with messages
 */
router.get('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: req.user!.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      throw NotFoundError('Chat');
    }

    res.json({ chat });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/chat/:chatId
 * Update chat (rename, archive)
 */
router.put('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { title, isArchived } = req.body;

    // Verify ownership
    const existing = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user!.id },
    });

    if (!existing) {
      throw NotFoundError('Chat');
    }

    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        title: title !== undefined ? title : undefined,
        isArchived: isArchived !== undefined ? isArchived : undefined,
      },
    });

    res.json({ chat });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/user/chat/:chatId
 * Delete chat
 */
router.delete('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    // Verify ownership
    const existing = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user!.id },
    });

    if (!existing) {
      throw NotFoundError('Chat');
    }

    await prisma.chat.delete({ where: { id: chatId } });

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user/chat/:chatId/feedback
 * Submit feedback for a message
 */
router.post('/:chatId/feedback', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { messageId, feedback, comment } = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user!.id },
    });

    if (!chat) {
      throw NotFoundError('Chat');
    }

    // Update message feedback
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        feedback: feedback === 'positive' ? 'POSITIVE' : 'NEGATIVE',
        feedbackComment: comment,
      },
    });

    res.json({ message: 'Feedback submitted', feedback: message.feedback });
  } catch (error) {
    next(error);
  }
});

export default router;

