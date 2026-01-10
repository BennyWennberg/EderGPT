import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Send response
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : message,
    message: process.env.NODE_ENV === 'development' ? message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// Custom error class
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common errors
export const NotFoundError = (resource: string) => 
  new ApiError(`${resource} not found`, 404);

export const UnauthorizedError = (message: string = 'Unauthorized') => 
  new ApiError(message, 401);

export const ForbiddenError = (message: string = 'Forbidden') => 
  new ApiError(message, 403);

export const BadRequestError = (message: string) => 
  new ApiError(message, 400);

export const ConflictError = (message: string) => 
  new ApiError(message, 409);

