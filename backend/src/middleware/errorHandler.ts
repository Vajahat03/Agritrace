import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected error occurred';

  // Structured logging
  console.error(`[Error] [${req.method} ${req.originalUrl}] [${errorCode}]`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { details: err.details || err.stack }),
    },
  });
}
