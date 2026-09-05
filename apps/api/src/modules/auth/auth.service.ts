// ── DealFlow360 – Auth Service ──
// Login, signup, me, and portal token management.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/prisma.js';
import { UnauthorizedError, ConflictError, NotFoundError, AppError } from '../../shared/errors.js';
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

export async function getCustomers() {
  return prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      createdAt: true,
      _count: {
        select: { quotationsAsCustomer: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getCustomerById(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      createdAt: true,
      quotationsAsCustomer: {
        select: {
          id: true,
          title: true,
          status: true,
          total: true,
          riskLevel: true,
          riskScore: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Customer', id);
  }

  return customer;
}

export async function updateCustomerTier(id: string, tier: string) {
  const customer = await prisma.user.findUnique({ where: { id } });
  if (!customer || customer.role !== 'CUSTOMER') {
    throw new NotFoundError('Customer', id);
  }

  return prisma.user.update({
    where: { id },
    data: { tier },
    select: { id: true, name: true, email: true, tier: true, updatedAt: true },
  });
}

export async function createCustomer(data: { name: string; email: string; tier?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError(`Email ${data.email} is already registered`);
  }

  const defaultPassword = await bcrypt.hash('password123', SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: 'CUSTOMER',
      tier: data.tier || 'BRONZE',
      passwordHash: defaultPassword,
    },
    select: { id: true, name: true, email: true, tier: true, createdAt: true },
  });
}

// ── Admin User Management ────────────────────────────────────

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      tier: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
}

export async function adminCreateUser(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<LoginResult> {
  const allowedRoles = ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPS', 'CUSTOMER'];
  if (!allowedRoles.includes(role)) {
    throw new AppError(400, 'INVALID_ROLE', `Invalid role: ${role}`);
  }
  return signup(email, password, name, role);
}

export async function adminUpdateUser(
  id: string,
  data: { isActive?: boolean; name?: string; role?: string; tier?: string },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User', id);

  const allowedRoles = ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPS', 'CUSTOMER'];
  if (data.role && !allowedRoles.includes(data.role)) {
    throw new AppError(400, 'INVALID_ROLE', `Invalid role: ${data.role}`);
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.tier !== undefined && { tier: data.tier }),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, tier: true, updatedAt: true },
  });
}
