// ── DealFlow360 – Reusable UI Components ──
// Compact, dark-themed primitives matching the mockup.
// No neon, no glassmorphism, no gradients.

import React from 'react';

// ── PageHeader ──
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-df-text">{title}</h1>
        {subtitle && <p className="text-sm text-df-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
const badgeColors = {
  success: 'bg-df-success-bg text-df-success border border-green-800',
  warning: 'bg-df-warning-bg text-df-warning border border-yellow-800',
  danger: 'bg-df-danger-bg text-df-danger border border-red-800',
  info: 'bg-df-info-bg text-df-info border border-blue-800',
  neutral: 'bg-df-surface text-df-text-muted border border-df-border',
} as const;

export function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: keyof typeof badgeColors;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColors[variant]}`}>
      {label}
    </span>
  );
}

// ── NoticeStrip ──
export function NoticeStrip({
  children,
  variant = 'info',
}: {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'danger';
}) {
  const colors = {
    info: 'bg-df-info-bg border-blue-700 text-blue-200',
    warning: 'bg-df-notice-bg border-df-notice text-yellow-200',
    success: 'bg-df-success-bg border-green-700 text-green-200',
    danger: 'bg-df-danger-bg border-red-700 text-red-200',
  };

  return (
    <div className={`px-4 py-2.5 rounded border-l-4 text-sm ${colors[variant]}`}>
      {children}
    </div>
  );
}

// ── Button ──
const buttonVariants = {
  primary: 'bg-df-nav hover:bg-df-nav-hover text-white',
  success: 'bg-df-success hover:bg-green-600 text-white',
  danger: 'bg-df-danger hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-df-border text-df-text-muted',
  outline: 'bg-transparent border border-df-border hover:bg-df-border text-df-text',
} as const;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
}) {
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-medium rounded
        transition-colors duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  );
}

// ── Input ──
export function Input({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-df-text-muted">{label}</label>}
      <input
        {...props}
        className={`
          w-full px-3 py-2 rounded border text-sm
          bg-df-bg text-df-text placeholder-df-text-dim
          focus:outline-none focus:ring-1 focus:ring-df-nav focus:border-df-nav
          ${error ? 'border-df-danger' : 'border-df-border'}
          ${props.className ?? ''}
        `}
      />
      {error && <p className="text-xs text-df-danger">{error}</p>}
    </div>
  );
}

// ── DataTable (shell) ──
export function DataTable({
  headers,
  children,
  emptyMessage = 'No data available',
  isEmpty = false,
}: {
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-df-border">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-df-text-muted uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-df-border">
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-df-text-dim">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton ──
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-df-border rounded ${className}`} />;
}

// ── Modal ──
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-df-surface border border-df-border rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-df-border">
          <h3 className="text-base font-semibold text-df-text">{title}</h3>
          <button onClick={onClose} className="text-df-text-dim hover:text-df-text transition-colors">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
