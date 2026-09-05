// ── DealFlow360 – App Layout (shadcn Sidebar & Header) ──

import React from 'react';
import { Outlet, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, User as UserIcon, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth.js';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../components/ui/sidebar.js';
import { AppSidebar } from '../components/layout/app-sidebar.js';
import { Separator } from '../components/ui/separator.js';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import { Avatar, AvatarFallback } from '../components/ui/avatar.js';
import { Button } from '../components/ui/button.js';
import { Toaster } from '../components/ui/sonner.js';

const ROUTE_NAMES: Record<string, string> = {
  '': 'Dashboard',
  'customers': 'Customers',
  'quotations': 'Quotations',
  'products': 'Products & Catalog',
  'approvals': 'Governance Approvals',
  'deal-health': 'Deal Health Monitoring',
  'fulfillment': 'Operations & Fulfillment',
  'subscriptions': 'Subscription Schedules',
  'invoices': 'Invoices & Payments',
  'reports': 'Analytics & Reports',
};

export function AppLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading DealFlow360...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentSegment = location.pathname.split('/')[1] || '';
  const currentTitle = ROUTE_NAMES[currentSegment] || 'Overview';
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DF';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top Navbar adhering to shadcn dashboard blocks */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="text-muted-foreground hover:text-foreground">DealFlow360</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">{currentTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-muted/40 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search deals, SKU, customers...</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/approvals')}
              title="Approvals & notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white" />
            </Button>

            <Separator orientation="vertical" className="h-4" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8 border border-neutral-700">
                    <AvatarFallback className="bg-neutral-900 text-white font-semibold text-xs border border-neutral-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/')}>
                  <UserIcon className="h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/approvals')}>
                  <Shield className="h-4 w-4" />
                  <span>Approvals Queue</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
