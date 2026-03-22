'use client';

import { useDashboardOrdersContainer } from '../../hooks/use-dashboard-orders-container';
import { OrdersTable } from '@/components/orders-table';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@repo/ui/components/button';
import { LogIn } from 'lucide-react';

export function DashboardOrdersContainer() {
  const { isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const {
    activeTab,
    orders,
    isLoading,
    total,
    limit,
    offset,
    onTabChange,
    onCancelOrder,
    onPageChange,
  } = useDashboardOrdersContainer();

  const tabs = [
    { value: 'all', label: 'All Orders' },
    { value: 'PENDING', label: 'Open Orders' },
    { value: 'FILLED', label: 'Order History' },
    { value: 'CANCELED', label: 'Canceled' },
  ];

  if (authLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-[#0D0D0D]">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 bg-[#0D0D0D] p-8 text-center">
        <LogIn className="h-12 w-12 text-gray-600" />
        <div>
          <h3 className="text-lg font-semibold text-white">Login to View Orders</h3>
          <p className="mt-2 text-sm text-gray-400">
            Please login to view your trading history
          </p>
        </div>
        <Button onClick={openAuthModal} className="mt-2">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[400px] flex-col bg-[#0D0D0D]">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'border-b-2 border-[#00A8E8] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-auto">
        <OrdersTable
          orders={orders}
          isLoading={isLoading}
          onCancelOrder={onCancelOrder}
          total={total}
          limit={limit}
          offset={offset}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
