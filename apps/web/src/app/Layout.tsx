// ── DealFlow360 – App Layout ──

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { Navbar } from '../components/Navbar.js';

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-df-bg flex items-center justify-center">
        <div className="text-df-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-df-bg">
      <Navbar />
      <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
