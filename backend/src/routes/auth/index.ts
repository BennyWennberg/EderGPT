import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/database.js';
import { generateToken, authenticate } from '../../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { username, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          passwordHash: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!user) {
        await logAudit(undefined, AuditActions.LOGIN_FAILED, 'AUTH', undefined, { username }, req);
        throw UnauthorizedError('Invalid credentials');
      }

      // Check if account is active
      if (user.status !== 'ACTIVE') {
        await logAudit(user.id, AuditActions.LOGIN_FAILED, 'AUTH', undefined, { reason: 'Account not active' }, req);
        throw UnauthorizedError('Account is not active');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        await logAudit(user.id, AuditActions.LOGIN_FAILED, 'AUTH', undefined, { reason: 'Invalid password' }, req);
        throw UnauthorizedError('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate token
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      // Log successful login
      await logAudit(user.id, AuditActions.LOGIN, 'AUTH', undefined, {}, req);

      logger.info(`User ${user.username} logged in successfully`);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw UnauthorizedError('User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, server-side audit log)
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logAudit(req.user!.id, AuditActions.LOGOUT, 'AUTH', undefined, {}, req);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change own password
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw BadRequestError(errors.array()[0].msg);
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        throw UnauthorizedError('User not found');
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw BadRequestError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

