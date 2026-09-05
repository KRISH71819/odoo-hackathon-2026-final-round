// ── DealFlow360 – shadcn Login Page ──

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';

const DEMO_USERS = [
  { email: 'admin@dealflow.com', password: 'password123', label: 'Admin', initials: 'AD', color: 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800' },
  { email: 'rep@dealflow.com', password: 'password123', label: 'Sales Rep', initials: 'SR', color: 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800' },
  { email: 'manager@dealflow.com', password: 'password123', label: 'Manager', initials: 'MG', color: 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800' },
  { email: 'finance@dealflow.com', password: 'password123', label: 'Finance', initials: 'FI', color: 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800' },
  { email: 'customer@acme.com', password: 'password123', label: 'Customer', initials: 'CU', color: 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800' },
];

export function LoginPage() {
  const { login, signup, staffSignup, logout, user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@dealflow.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'staff-signup'>('login');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'CUSTOMER') {
        navigate('/my-portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  if (isLoading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const authUser = mode === 'signup'
        ? await signup(email, password, name)
        : mode === 'staff-signup'
          ? await staffSignup(email, password, name, inviteCode)
          : await login(email, password);

      if (authUser.role === 'CUSTOMER') {
        navigate('/my-portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? 'Login failed' : 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: (typeof DEMO_USERS)[0]) => {
    setError('');
    setLoading(true);
    try {
      const authUser = await login(demoUser.email, demoUser.password);
      if (authUser.role === 'CUSTOMER') {
        navigate('/my-portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <DollarSign className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">DealFlow360</h1>
          <p className="text-sm text-muted-foreground">Enterprise Sales Platform</p>
        </div>

        {/* Login/Signup Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{mode === 'login' ? 'Sign In' : mode === 'staff-signup' ? 'Create Sales Rep Account' : 'Create Customer Account'}</CardTitle>
            <CardDescription>
              {mode === 'login' ? 'Enter your credentials to continue' : mode === 'staff-signup' ? 'Sales Rep signup requires the staff invite code' : 'Create a customer account to view and manage your quotes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {mode !== 'login' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">Full Name</label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dealflow.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {mode === 'staff-signup' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="inviteCode">Staff Invite Code</label>
                  <Input id="inviteCode" type="password" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Provided by admin" required />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Customer Account' : mode === 'staff-signup' ? 'Create Sales Rep Account' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-center">
              {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Already have an account? Sign in</button>}
              {mode !== 'signup' && <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Customer signup</button>}
              {mode !== 'staff-signup' && <button type="button" onClick={() => { setMode('staff-signup'); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Sales Rep signup</button>}
            </div>

            {/* Demo Accounts */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">Quick Demo Login</p>
              <div className="flex flex-wrap justify-center gap-2">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleDemoLogin(u)}
                    disabled={loading}
                    className="group flex flex-col items-center gap-1 disabled:opacity-50"
                    title={`Login as ${u.label}`}
                  >
                    <div className={`w-9 h-9 rounded-full ${u.color} text-white flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110`}>
                      {u.initials}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{u.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
