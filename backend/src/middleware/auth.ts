import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';
import { Role } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: Role;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user) {
      throw UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw ForbiddenError('Account is not active');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(UnauthorizedError('Not authenticated'));
  }

  const adminRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];
  
  if (!adminRoles.includes(req.user.role)) {
    return next(ForbiddenError('Admin access required'));
  }

  next();
};

/**
 * Require super admin role
 */
export const requireSuperAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(UnauthorizedError('Not authenticated'));
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    return next(ForbiddenError('Super Admin access required'));
  }

  next();
};

/**
 * Require user role (any authenticated user)
 */
export const requireUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(UnauthorizedError('Not authenticated'));
  }

  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (user: { id: string; username: string; role: Role }): string => {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h', // 8 hours
  });
};

