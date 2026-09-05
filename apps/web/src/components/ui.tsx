// ── DealFlow360 – Reusable UI Components ──
// Unified compact dark-themed enterprise components.

import React from 'react';

// ── PageHeader ──
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
        <h1 className="text-xl font-semibold text-df-text">{title}</h1>
        {subtitle && <p className="text-sm text-df-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actionContent && <div className="flex items-center gap-2">{actionContent}</div>}
    </div>
  );
}

// ── Panel ──
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
    <div className={`bg-df-surface border border-df-border rounded-md ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-df-border">
          <h2 className="text-sm font-medium text-df-text">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── StatusBadge ──
const statusColors: Record<string, string> = {
  DRAFT: 'bg-df-border text-df-text-muted border border-df-border',
  REVISION: 'bg-amber-950/40 text-amber-400 border border-amber-800',
  PENDING_MANAGER: 'bg-blue-950/40 text-blue-400 border border-blue-800',
  PENDING_FINANCE: 'bg-indigo-950/40 text-indigo-400 border border-indigo-800',
  APPROVED: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  REJECTED: 'bg-rose-950/40 text-rose-400 border border-rose-800',
  FULFILLMENT_READY: 'bg-blue-950/40 text-blue-400 border border-blue-800',
  CONFIRMED: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  BILLED: 'bg-blue-950/40 text-blue-400 border border-blue-800',
  PAID: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  PENDING: 'bg-amber-950/40 text-amber-400 border border-amber-800',
  RETURNED: 'bg-amber-950/40 text-amber-400 border border-amber-800',
  NONE: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  LOW: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  MEDIUM: 'bg-amber-950/40 text-amber-400 border border-amber-800',
  HIGH: 'bg-rose-950/40 text-rose-400 border border-rose-800',
  ACTIVE: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800',
  INACTIVE: 'bg-df-border text-df-text-muted border border-df-border',
};

const badgeColors = {
  success: 'bg-df-success-bg text-df-success border border-green-800',
  warning: 'bg-df-warning-bg text-df-warning border border-yellow-800',
  danger: 'bg-df-danger-bg text-df-danger border border-red-800',
  info: 'bg-df-info-bg text-df-info border border-blue-800',
  neutral: 'bg-df-surface text-df-text-muted border border-df-border',
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
    const color = statusColors[status] || 'bg-df-border text-df-text-muted border border-df-border';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} ${className}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${badgeColors[variant]} ${className}`}
    >
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
    warning: 'bg-df-warning-bg text-df-warning border-yellow-800',
    info: 'bg-df-info-bg text-df-info border-blue-800',
    danger: 'bg-df-danger-bg text-df-danger border-red-800',
  };
  return (
    <div className={`px-3 py-2 text-sm border rounded ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

// ── Buttons ──

const btnBase =
  'inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none';

export function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${btnBase} bg-df-nav hover:bg-df-nav-hover text-white ${className}`} {...props}>
      {children}
    </button>
  );
}

export function DangerButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${btnBase} bg-df-danger hover:bg-red-700 text-white ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} bg-df-surface hover:bg-df-border text-df-text border border-df-border ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SuccessButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${btnBase} bg-df-success hover:bg-green-700 text-white ${className}`} {...props}>
      {children}
    </button>
  );
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
    primary: 'bg-df-nav text-white hover:bg-df-nav-hover border-transparent',
    secondary: 'bg-df-surface text-df-text hover:bg-df-border border-df-border',
    danger: 'bg-df-danger text-white hover:bg-red-700 border-transparent',
    ghost: 'bg-transparent text-df-text-muted hover:text-df-text hover:bg-df-surface border-transparent',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded border transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ──
export function Input({
  label,
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-df-text-muted mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-1.5 bg-df-surface border border-df-border rounded text-xs text-df-text placeholder-df-text-dim focus:outline-none focus:border-df-nav transition-colors ${
          error ? 'border-df-danger' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-df-danger mt-1">{error}</p>}
    </div>
  );
}

// ── Select ──
export function Select({
  label,
  children,
  error,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-df-text-muted mb-1">{label}</label>}
      <select
        className={`w-full px-3 py-1.5 bg-df-surface border border-df-border rounded text-xs text-df-text focus:outline-none focus:border-df-nav transition-colors ${
          error ? 'border-df-danger' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-df-danger mt-1">{error}</p>}
    </div>
  );
}

// ── Spinner ──
export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-df-border border-t-df-nav rounded-full animate-spin" />
    </div>
  );
}

// ── Formatters ──

export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

// ── Additional UI Helpers ──
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-df-surface border border-df-border rounded-md p-4 ${className}`}>{children}</div>;
}

export function Badge({ children, variant = 'neutral', className = '' }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; className?: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${badgeColors[variant]} ${className}`}>{children}</span>;
}
