// ── DealFlow360 – Navigation Bar ──
// Top navigation with role-based tab visibility, matching the mockup.

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[]; // Which roles can see this tab
}

const ALL_INTERNAL: UserRole[] = [UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS];

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', roles: ALL_INTERNAL },
  { label: 'Customers', path: '/customers', roles: ALL_INTERNAL },
  { label: 'Quotations', path: '/quotations', roles: ALL_INTERNAL },
  { label: 'Approvals', path: '/approvals', roles: [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS] },
  { label: 'Fulfillment', path: '/fulfillment', roles: ALL_INTERNAL },
  { label: 'Subscriptions', path: '/subscriptions', roles: ALL_INTERNAL },
  { label: 'Invoices', path: '/invoices', roles: ALL_INTERNAL },
  { label: 'Deal Health', path: '/deal-health', roles: [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS] },
  { label: 'Reports', path: '/reports', roles: ALL_INTERNAL },
  { label: 'Products', path: '/products', roles: [UserRole.ADMIN] },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role as UserRole));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-df-surface border-b border-df-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-df-nav font-bold text-base tracking-tight">DealFlow360</span>
        </div>

        {/* Navigation tabs - horizontally scrollable on mobile */}
        <nav className="flex-1 overflow-x-auto mx-4 scrollbar-hide">
          <div className="flex items-center gap-0.5 min-w-max">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 text-xs font-medium rounded transition-colors duration-100 whitespace-nowrap ${
                    isActive
                      ? 'bg-df-nav text-white'
                      : 'text-df-text-muted hover:text-df-text hover:bg-df-border'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User info + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-df-text">{user.name}</p>
            <p className="text-[10px] text-df-text-dim">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 text-xs font-medium text-df-text-muted hover:text-df-danger border border-df-border rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
