import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../../utils/database.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { PromptType } from '@prisma/client';

const router = Router();

/**
 * GET /api/admin/prompts
 * List all prompts
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, active } = req.query;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (active !== undefined) where.isActive = active === 'true';

    const prompts = await prisma.prompt.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    res.json({ prompts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/prompts/:id
 * Get prompt details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });

    if (!prompt) {
      throw NotFoundError('Prompt');
    }

    res.json({ prompt });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/prompts
 * Create new prompt
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(Object.values(PromptType)).withMessage('Invalid prompt type'),
    body('content').trim().notEmpty().withMessage('Content is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { name, type, content, folderId, isActive } = req.body;

      // Check if name exists
      const existing = await prisma.prompt.findUnique({ where: { name } });
      if (existing) {
        throw ConflictError('Prompt name already exists');
      }

      const prompt = await prisma.prompt.create({
        data: {
          name,
          type,
          content,
          folderId,
          isActive: isActive !== false,
          version: 1,
        },
      });

      await logAudit(req.user!.id, AuditActions.PROMPT_UPDATE, 'PROMPT', prompt.id, { name, type }, req);

      res.status(201).json({ prompt });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/prompts/:id
 * Update prompt (creates new version)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isActive } = req.body;

    const existing = await prisma.prompt.findUnique({ where: { id } });
    if (!existing) {
      throw NotFoundError('Prompt');
    }

    // Update prompt (increment version if content changed)
    const shouldIncrementVersion = content && content !== existing.content;

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        content: content || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        version: shouldIncrementVersion ? existing.version + 1 : undefined,
      },
    });

    await logAudit(req.user!.id, AuditActions.PROMPT_UPDATE, 'PROMPT', id, {
      name: prompt.name,
      newVersion: prompt.version,
    }, req);

    res.json({ prompt });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/prompts/:id
 * Delete prompt
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt) {
      throw NotFoundError('Prompt');
    }

    // Don't delete the default system prompt
    if (prompt.name === 'default_system') {
      throw BadRequestError('Cannot delete the default system prompt');
    }

    await prisma.prompt.delete({ where: { id } });

    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/prompts/active/system
 * Get the active system prompt
 */
router.get('/active/system', async (req, res, next) => {
  try {
    const prompt = await prisma.prompt.findFirst({
      where: {
        type: PromptType.SYSTEM,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!prompt) {
      // Return default prompt if none exists
      return res.json({
        prompt: {
          content: 'Du bist EderGPT, ein hilfreicher KI-Assistent für Unternehmenswissen.',
          version: 0,
        },
      });
    }

    res.json({ prompt });
  } catch (error) {
    next(error);
  }
});

export default router;

