import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../../utils/database.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';

const router = Router();

/**
 * GET /api/admin/groups
 * List all groups
 */
router.get('/', async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: {
            users: true,
            folders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/groups/:id
 * Get group details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        folders: {
          include: {
            folder: {
              select: {
                id: true,
                name: true,
                path: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw NotFoundError('Group');
    }

    res.json({ group });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/groups
 * Create new group
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { name, description, userIds, folderIds } = req.body;

      // Check if name exists
      const existing = await prisma.group.findUnique({ where: { name } });
      if (existing) {
        throw ConflictError('Group name already exists');
      }

      const group = await prisma.group.create({
        data: {
          name,
          description,
          users: userIds?.length ? {
            create: userIds.map((userId: string) => ({ userId })),
          } : undefined,
          folders: folderIds?.length ? {
            create: folderIds.map((folderId: string) => ({ folderId })),
          } : undefined,
        },
        include: {
          _count: {
            select: { users: true, folders: true },
          },
        },
      });

      await logAudit(req.user!.id, AuditActions.GROUP_CREATE, 'GROUP', group.id, { name }, req);

      res.status(201).json({ group });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/groups/:id
 * Update group
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw NotFoundError('Group');
    }

    // Check for name conflict
    if (name && name !== existing.name) {
      const nameConflict = await prisma.group.findUnique({ where: { name } });
      if (nameConflict) {
        throw ConflictError('Group name already exists');
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    await logAudit(req.user!.id, AuditActions.GROUP_UPDATE, 'GROUP', id, { name }, req);

    res.json({ group });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/groups/:id
 * Delete group
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw NotFoundError('Group');
    }

    await prisma.group.delete({ where: { id } });

    await logAudit(req.user!.id, AuditActions.GROUP_DELETE, 'GROUP', id, { name: group.name }, req);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/groups/:id/folders
 * Update group folder assignments
 */
router.put('/:id/folders', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { folderIds } = req.body;

    if (!Array.isArray(folderIds)) {
      throw BadRequestError('folderIds must be an array');
    }

    // Delete existing
    await prisma.groupFolder.deleteMany({ where: { groupId: id } });

    // Create new
    if (folderIds.length > 0) {
      await prisma.groupFolder.createMany({
        data: folderIds.map((folderId: string) => ({
          groupId: id,
          folderId,
        })),
      });
    }

    res.json({ message: 'Folder assignments updated' });
  } catch (error) {
    next(error);
  }
});

export default router;

