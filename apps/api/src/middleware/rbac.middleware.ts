// ── DealFlow360 – RBAC Middleware ──
// Guards routes based on user roles from the JWT payload.

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js';

/**
 * Creates middleware that restricts access to users with one of the specified roles.
 * Must be placed AFTER authMiddleware in the middleware chain.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role '${req.user.role}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`,
      );
    }

    next();
  };
}
