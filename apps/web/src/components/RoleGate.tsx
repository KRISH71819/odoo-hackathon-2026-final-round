// ── DealFlow360 – Role Gate ──
// Wraps a route to enforce role-based access. Unauthorized roles get redirected to /.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';

export function RoleGate({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as UserRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
