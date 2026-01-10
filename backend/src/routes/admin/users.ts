import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/database.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { Role, UserStatus } from '@prisma/client';

const router = Router();

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as Role;
    }

    if (status) {
      where.status = status as UserStatus;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          _count: {
            select: {
              folders: true,
              groups: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
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
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        lastLoginAt: true,
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
      throw NotFoundError('User');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post(
  '/',
  [
    body('username').trim().notEmpty().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(Object.values(Role)).withMessage('Invalid role'),
    body('email').optional().isEmail().withMessage('Invalid email'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { username, password, email, firstName, lastName, department, role = Role.USER, folderIds, groupIds } = req.body;

      // Check if username exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw ConflictError('Username already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash,
          email,
          firstName,
          lastName,
          department,
          role,
          folders: folderIds?.length ? {
            create: folderIds.map((folderId: string) => ({ folderId })),
          } : undefined,
          groups: groupIds?.length ? {
            create: groupIds.map((groupId: string) => ({ groupId })),
          } : undefined,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      await logAudit(req.user!.id, AuditActions.USER_CREATE, 'USER', user.id, { username }, req);

      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, department, role, status, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw NotFoundError('User');
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (department !== undefined) updateData.department = department;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await logAudit(req.user!.id, AuditActions.USER_UPDATE, 'USER', id, { changes: Object.keys(updateData) }, req);

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.id) {
      throw BadRequestError('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw NotFoundError('User');
    }

    await prisma.user.delete({ where: { id } });

    await logAudit(req.user!.id, AuditActions.USER_DELETE, 'USER', id, { username: user.username }, req);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/folders
 * Update user folder assignments
 */
router.put('/:id/folders', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { folderIds } = req.body;

    if (!Array.isArray(folderIds)) {
      throw BadRequestError('folderIds must be an array');
    }

    // Delete existing assignments
    await prisma.userFolder.deleteMany({ where: { userId: id } });

    // Create new assignments
    if (folderIds.length > 0) {
      await prisma.userFolder.createMany({
        data: folderIds.map((folderId: string) => ({
          userId: id,
          folderId,
        })),
      });
    }

    await logAudit(req.user!.id, AuditActions.USER_FOLDER_ASSIGN, 'USER', id, { folderIds }, req);

    res.json({ message: 'Folder assignments updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/groups
 * Update user group assignments
 */
router.put('/:id/groups', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds)) {
      throw BadRequestError('groupIds must be an array');
    }

    // Delete existing assignments
    await prisma.userGroup.deleteMany({ where: { userId: id } });

    // Create new assignments
    if (groupIds.length > 0) {
      await prisma.userGroup.createMany({
        data: groupIds.map((groupId: string) => ({
          userId: id,
          groupId,
        })),
      });
    }

    await logAudit(req.user!.id, AuditActions.USER_GROUP_ASSIGN, 'USER', id, { groupIds }, req);

    res.json({ message: 'Group assignments updated' });
  } catch (error) {
    next(error);
  }
});

export default router;

