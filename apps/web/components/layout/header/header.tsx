'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@repo/ui/components/button';
import { AuthModal } from '@/components/auth-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { User, LogOut, BarChart3 } from 'lucide-react';

export function Header() {
  const {
    user,
    isAuthenticated,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
  } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0D0D0D]">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#00A8E8]" />
            <span className="text-xl font-bold text-white">TradeX</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Trade
            </Link>
            <Link
              href="/orders"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Orders
            </Link>
            {isAuthenticated && (
              <Link
                href="/portfolio"
                className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button onClick={openAuthModal} size="sm">
                Login
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 transition-colors hover:bg-gray-700">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00A8E8] text-sm font-semibold text-white">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {user?.username}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/portfolio" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 text-red-500 focus:text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onLogin={login}
        onRegister={register}
      />
    </>
  );
}
