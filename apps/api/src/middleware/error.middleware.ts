// ── DealFlow360 – Global Error Middleware ──

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import type { ApiErrorResponse } from '@dealflow360/contracts';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}
