// ── DealFlow360 Shared Zod Schemas ──
// Validation schemas reusable on both frontend forms and backend endpoints.

import { z } from 'zod';
import { UserRole } from './enums.js';

// ── Auth Schemas ──

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.nativeEnum(UserRole).optional().default(UserRole.SALES_REP),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.nativeEnum(UserRole),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ── User Schemas ──

export const UserDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type UserDTO = z.infer<typeof UserDTOSchema>;

// ── Pagination Schema ──

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ── Portal Token Schema ──

export const PortalTokenRequestSchema = z.object({
  customerId: z.string().min(1),
  quotationId: z.string().min(1),
  expiresInHours: z.number().positive().optional().default(72),
});

export type PortalTokenRequest = z.infer<typeof PortalTokenRequestSchema>;
