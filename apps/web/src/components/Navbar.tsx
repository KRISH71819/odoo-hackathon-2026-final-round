// ── DealFlow360 – Premium Navigation Bar ──

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
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
  { label: 'Reports', path: '/reports', roles: [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS] },
  { label: 'Products', path: '/products', roles: ALL_INTERNAL },
  { label: 'Configuration', path: '/configuration', roles: [UserRole.ADMIN, UserRole.SALES_MANAGER] },
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

  // Generate user initials
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="glass border-b border-white/[0.06] sticky top-0 z-40 animate-slide-down">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-gradient font-bold text-sm tracking-tight hidden sm:block">DealFlow360</span>
        </div>

        {/* Navigation tabs */}
        <nav className="flex-1 overflow-x-auto mx-4 scrollbar-hide">
          <div className="flex items-center gap-0.5 min-w-max">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-indicator px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'active bg-white/[0.08] text-white'
                      : 'text-df-text-muted hover:text-white hover:bg-white/[0.04]'
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
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-indigo-500/20">
              {initials}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-df-text-dim mt-0.5">{user.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-medium text-df-text-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.2] rounded-lg transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
