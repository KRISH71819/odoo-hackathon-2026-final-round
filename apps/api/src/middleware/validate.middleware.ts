// ── DealFlow360 – Zod Validation Middleware ──

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../shared/errors.js';

/**
 * Creates middleware that validates request body against a Zod schema.
 * Replaces req.body with the parsed (and potentially transformed) data.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || 'body';
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        throw new ValidationError('Validation failed', details);
      }
      throw err;
    }
  };
}

/**
 * Creates middleware that validates request query params against a Zod schema.
 * Replaces req.query with the parsed data.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || 'query';
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        throw new ValidationError('Invalid query parameters', details);
      }
      throw err;
    }
  };
}
