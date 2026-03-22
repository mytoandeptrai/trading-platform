'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/components/dialog';
import { LoginForm, type LoginFormData } from './login-form';
import { RegisterForm, type RegisterFormData } from './register-form';

type AuthTab = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: LoginFormData) => Promise<void>;
  onRegister: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<void>;
  defaultTab?: AuthTab;
}

export function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  defaultTab = 'login',
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await onLogin(data);
      // Modal will be closed by auth context on success
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
    setIsLoading(true);
    try {
      await onRegister(data);
      // Switch to login tab after successful registration
      setActiveTab('login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('login')}
            disabled={isLoading}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            } disabled:opacity-50`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('register')}
            disabled={isLoading}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'register'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            } disabled:opacity-50`}
          >
            Register
          </button>
        </div>

        {/* Forms */}
        <div className="mt-6">
          {activeTab === 'login' ? (
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
          ) : (
            <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
