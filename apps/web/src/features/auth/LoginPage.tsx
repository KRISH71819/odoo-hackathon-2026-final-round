// ── DealFlow360 – Login Page ──

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { Button, Input, NoticeStrip } from '../../components/ui.js';

export function LoginPage() {
  const { login, signup, logout, user, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');

  if (isLoading) return null;
  if (isAuthenticated && user?.role !== 'CUSTOMER') return <Navigate to="/" replace />;
  if (isAuthenticated && user?.role === 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-df-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <NoticeStrip variant="warning">Customer accounts use the secure quotation portal link sent by the sales team. Internal workspace access is blocked.</NoticeStrip>
          <Button className="w-full mt-4" onClick={logout}>Back to Login</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') await signup(email, password, name);
      else await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick login buttons for demo
  const demoAccounts = [
    { label: 'Admin', email: 'admin@dealflow.com' },
    { label: 'Sales Rep', email: 'rep@dealflow.com' },
    { label: 'Manager', email: 'manager@dealflow.com' },
    { label: 'Finance', email: 'finance@dealflow.com' },
    { label: 'Customer', email: 'customer@acme.com' },
  ];

  const quickLogin = async (demoEmail: string) => {
    setError('');
    setSubmitting(true);
    try {
      await login(demoEmail, 'password123');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-df-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-df-nav">DealFlow360</h1>
          <p className="text-sm text-df-text-muted mt-1">Sales Operations Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-df-surface border border-df-border rounded-lg p-6">
          <div className="flex gap-2 mb-6">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded ${mode === 'login' ? 'text-white bg-df-nav' : 'text-df-text-muted bg-df-bg border border-df-border'}`}>Login</button>
            <button type="button" onClick={() => setMode('signup')} className={`flex-1 py-2 text-sm font-medium rounded ${mode === 'signup' ? 'text-white bg-df-nav' : 'text-df-text-muted bg-df-bg border border-df-border'}`}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <NoticeStrip variant="danger">{error}</NoticeStrip>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Sales Rep Account' : 'Login'}
            </Button>
          </form>
        </div>

        {/* Demo quick login */}
        <div className="mt-4">
          <NoticeStrip variant="warning">
            Demo mode: Use any button below to sign in with a test account.
            <br />
            <span className="text-xs opacity-75">All accounts use password: password123</span>
          </NoticeStrip>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => quickLogin(acc.email)}
                disabled={submitting}
                className="px-2.5 py-1 text-xs font-medium bg-df-surface border border-df-border rounded text-df-text-muted hover:text-df-text hover:border-df-nav transition-colors disabled:opacity-50"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
