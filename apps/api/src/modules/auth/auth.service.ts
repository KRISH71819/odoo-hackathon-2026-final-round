// ── DealFlow360 – Auth Service ──
// Login, signup, me, and portal token management.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/prisma.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../shared/errors.js';
import type { AuthPayload } from '../../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dealflow360-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';
const SALT_ROUNDS = 10;

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function signup(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<LoginResult> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return user;
}

export async function generatePortalToken(
  customerId: string,
  quotationId: string,
  expiresInHours: number,
) {
  // Verify the customer exists and has the CUSTOMER role
  const customer = await prisma.user.findUnique({ where: { id: customerId } });
  if (!customer || customer.role !== 'CUSTOMER') {
    throw new NotFoundError('Customer', customerId);
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const accessToken = await prisma.customerAccessToken.create({
    data: {
      customerId,
      quotationId,
      expiresAt,
    },
  });

  return {
    token: accessToken.token,
    expiresAt: accessToken.expiresAt.toISOString(),
  };
}
