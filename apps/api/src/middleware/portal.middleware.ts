// ── DealFlow360 – Portal Access Middleware ──
// Verifies CustomerAccessToken for restricted portal endpoints.

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../shared/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors.js';

export interface PortalPayload {
  customerId: string;
  quotationId: string;
  tokenId: string;
}

// Extend Express Request for portal context
declare global {
  namespace Express {
    interface Request {
      portal?: PortalPayload;
    }
  }
}

/**
 * Middleware for customer portal endpoints.
 * Expects a portal token in the X-Portal-Token header.
 * Validates token, checks expiry, and scopes access to specific customer+quote.
 */
export async function portalMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['x-portal-token'] as string | undefined;

  if (!token) {
    throw new UnauthorizedError('Missing portal access token');
  }

  const accessToken = await prisma.customerAccessToken.findUnique({
    where: { token },
  });

  if (!accessToken) {
    throw new UnauthorizedError('Invalid portal access token');
  }

  if (new Date() > accessToken.expiresAt) {
    throw new UnauthorizedError('Portal access token has expired');
  }

  req.portal = {
    customerId: accessToken.customerId,
    quotationId: accessToken.quotationId,
    tokenId: accessToken.id,
  };

  next();
}

/**
 * Ensures portal request only accesses its scoped quotation.
 * Use after portalMiddleware.
 */
export function enforcePortalScope(req: Request, _res: Response, next: NextFunction): void {
  const quotationId = req.params.quotationId ?? req.params.id;

  if (!req.portal) {
    throw new UnauthorizedError('Portal context not found');
  }

  if (quotationId && quotationId !== req.portal.quotationId) {
    throw new ForbiddenError('Access denied: this token does not grant access to the requested quotation');
  }

  next();
}
