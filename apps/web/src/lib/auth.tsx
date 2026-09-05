// ── DealFlow360 – Auth Context ──
// Manages JWT, user state, login/logout. Used app-wide via useAuth hook.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, getToken } from './api-client.js';
import { UserRole } from '@dealflow360/contracts';
import type { ApiResponse } from '@dealflow360/contracts';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      api
        .get<ApiResponse<AuthUser>>('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role?: UserRole) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/signup', { email, password, name, role });
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}