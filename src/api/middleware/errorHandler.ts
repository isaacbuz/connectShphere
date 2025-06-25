import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error details
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // MongoDB/Mongoose errors
  if (error instanceof mongoose.Error) {
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    } else if (error.name === 'MongoServerError') {
      if ((error as any).code === 11000) {
        statusCode = 409;
        message = 'Duplicate field value';
      } else {
        statusCode = 500;
        message = 'Database error';
      }
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Network/Connection errors
  if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (error.message.includes('ETIMEDOUT')) {
    statusCode = 504;
    message = 'Request timeout';
  }

  // Rate limiting errors
  if (error.message.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too many requests, please try again later';
  }

  // File upload errors
  if (error.message.includes('File too large')) {
    statusCode = 413;
    message = 'File size too large';
  }

  // Validation errors from express-validator
  if (error.message.includes('validation failed')) {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Default error response
  const errorResponse = {
    error: true,
    message: process.env.NODE_ENV === 'production' && statusCode >= 500 
      ? 'Internal server error' 
      : message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message
    })
  };

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  res.status(404).json({
    error: true,
    message: 'Route not found',
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

// Global unhandled rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service
    console.error('Unhandled Rejection logged for investigation');
  }
});

// Global uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service
    console.error('Uncaught Exception logged for investigation');
  }
  
  // Gracefully shutdown the server
  process.exit(1);
}); 