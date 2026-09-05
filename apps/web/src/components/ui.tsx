// ── DealFlow360 – UI Component Barrel (backward compat + shadcn bridge) ──
// Re-exports shadcn components AND legacy helpers so existing pages keep working.

import React from 'react';
import { cn } from '../lib/utils.js';

// ── Re-export shadcn primitives ──
export { Button as ShadcnButton, buttonVariants } from './ui/button.js';
export { Card as ShadcnCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card.js';
export { Badge as ShadcnBadge, badgeVariants } from './ui/badge.js';
export { Input as ShadcnInput } from './ui/input.js';
export { Separator } from './ui/separator.js';
export { Skeleton } from './ui/skeleton.js';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './ui/table.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.js';
export { Avatar, AvatarImage, AvatarFallback } from './ui/avatar.js';
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from './ui/breadcrumb.js';
export { Toaster } from './ui/sonner.js';

// ── PageHeader (legacy compat, now using shadcn colors) ──
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const actionContent = actions ?? children;
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actionContent && <div className="flex items-center gap-2">{actionContent}</div>}
    </div>
  );
}

// ── Panel (maps to shadcn Card) ──
export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}>
      {title && (
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── StatusBadge (pure black & white monochrome) ──
const statusConfig: Record<string, { classes: string }> = {
  DRAFT: { classes: 'bg-neutral-900 text-neutral-300 border-neutral-700' },
  REVISION: { classes: 'bg-neutral-800 text-neutral-200 border-neutral-600' },
  PENDING_MANAGER: { classes: 'bg-neutral-800 text-white border-neutral-600' },
  PENDING_FINANCE: { classes: 'bg-neutral-800 text-white border-neutral-600' },
  APPROVED: { classes: 'bg-white text-black border-white font-semibold' },
  REJECTED: { classes: 'bg-neutral-950 text-neutral-400 border-neutral-700 line-through' },
  FULFILLMENT_READY: { classes: 'bg-neutral-100 text-black border-neutral-300 font-medium' },
  CONFIRMED: { classes: 'bg-white text-black border-white font-semibold' },
  BILLED: { classes: 'bg-neutral-800 text-neutral-200 border-neutral-700' },
  PAID: { classes: 'bg-white text-black border-white font-semibold' },
  PENDING: { classes: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  RETURNED: { classes: 'bg-neutral-900 text-neutral-400 border-neutral-700' },
  NONE: { classes: 'bg-neutral-900 text-neutral-400 border-neutral-700' },
  LOW: { classes: 'bg-neutral-900 text-neutral-300 border-neutral-700' },
  MEDIUM: { classes: 'bg-neutral-800 text-neutral-200 border-neutral-600' },
  HIGH: { classes: 'bg-white text-black border-white font-bold' },
  ACTIVE: { classes: 'bg-white text-black border-white font-semibold' },
  INACTIVE: { classes: 'bg-neutral-900 text-neutral-400 border-neutral-800' },
  BRONZE: { classes: 'bg-neutral-900 text-neutral-300 border-neutral-700 font-mono' },
  SILVER: { classes: 'bg-neutral-800 text-neutral-200 border-neutral-600 font-mono' },
  GOLD: { classes: 'bg-white text-black border-white font-bold font-mono' },
};

const badgeVariantMap = {
  success: 'bg-white text-black border-white font-medium',
  warning: 'bg-neutral-800 text-neutral-200 border-neutral-600',
  danger: 'bg-neutral-900 text-neutral-300 border-neutral-700',
  info: 'bg-neutral-800 text-neutral-200 border-neutral-600',
  neutral: 'bg-neutral-900 text-neutral-400 border-neutral-800',
} as const;

export function StatusBadge({
  status,
  label,
  variant = 'neutral',
  className = '',
}: {
  status?: string;
  label?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}) {
  if (status) {
    const cfg = statusConfig[status] || { classes: 'bg-secondary text-secondary-foreground' };
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold', cfg.classes, className)}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold', badgeVariantMap[variant], className)}>
      {label}
    </span>
  );
}

// ── NoticeStrip ──
export function NoticeStrip({
  children,
  variant = 'warning',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'warning' | 'info' | 'danger';
  className?: string;
}) {
  const variants = {
    warning: 'bg-neutral-900 text-neutral-200 border-neutral-700',
    info: 'bg-neutral-900 text-neutral-200 border-neutral-700',
    danger: 'bg-neutral-950 text-neutral-300 border-neutral-700',
  };
  return (
    <div className={cn('px-4 py-3 text-sm border rounded-lg', variants[variant], className)}>
      {children}
    </div>
  );
}

// ── Buttons (legacy wrappers using shadcn tokens) ──
const btnBase = 'inline-flex items-center justify-center font-medium rounded-md text-sm transition-colors disabled:pointer-events-none disabled:opacity-50';

export function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(btnBase, 'h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-neutral-200 font-semibold', className)} {...props}>{children}</button>;
}

export function DangerButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(btnBase, 'h-9 px-4 py-2 bg-neutral-900 text-neutral-200 border border-neutral-700 shadow hover:bg-neutral-800 hover:text-white', className)} {...props}>{children}</button>;
}

export function SecondaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(btnBase, 'h-9 px-4 py-2 bg-secondary text-secondary-foreground border border-border shadow-sm hover:bg-neutral-800 hover:text-white', className)} {...props}>{children}</button>;
}

export function SuccessButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(btnBase, 'h-9 px-4 py-2 bg-white text-black font-semibold shadow hover:bg-neutral-200', className)} {...props}>{children}</button>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  const sizeStyles = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-10 px-6 text-base' };

  return (
    <button className={cn(btnBase, 'border shadow-sm', variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </button>
  );
}

// ── Input (legacy with label support) ──
export function Input({
  label,
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
      <input
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          error ? 'border-destructive' : '',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}

// ── Select (legacy with label) ──
export function Select({
  label,
  children,
  error,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
      <select
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer',
          error ? 'border-destructive' : '',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}

// ── Spinner ──
export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground">Loading...</p>
    </div>
  );
}

// ── Formatters ──
export function formatCents(cents?: number | null, currency = 'USD'): string {
  if (cents == null || isNaN(cents)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatBps(bps?: number | null): string {
  if (bps == null || isNaN(bps)) return '0.0%';
  return `${(bps / 100).toFixed(1)}%`;
}

// ── Card & Badge (legacy compat) ──
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow p-6', className)}>{children}</div>;
}

export function Badge({ children, variant = 'neutral', className = '' }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold', badgeVariantMap[variant], className)}>{children}</span>;
}
