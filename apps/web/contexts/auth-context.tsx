'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI } from '@/apis/auths';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { toast } from 'sonner';

interface AuthContextValue {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth Modal
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // Auth Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isAuthenticated = !!user;

  // Open/Close Auth Modal
  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Fetch current user from backend
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authAPI.me();
      setUser(userData);
    } catch (error) {
      // Not authenticated or token expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async (data: LoginRequest) => {
    try {
      const response = await authAPI.login(data);
      setUser(response.user);
      closeAuthModal();
      toast.success(`Welcome back, ${response.user.username}!`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
      throw error;
    }
  }, [closeAuthModal]);

  // Register
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      await authAPI.register(data);
      toast.success('Registration successful! Please login with your credentials.');
      // Note: Backend register does NOT set cookies, user must login
      // We'll switch to login tab in the modal (handled in AuthModal component)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
      setUser(null);
      toast.success('Logged out successfully');

      // Redirect to home if on protected route
      if (typeof window !== 'undefined' && window.location.pathname === '/portfolio') {
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      // Clear user anyway even if API call fails
      setUser(null);
    }
  }, []);

  // Initialize: Fetch user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
