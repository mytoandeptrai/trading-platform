'use client';

import { useDashboardOrdersContainer } from '../../hooks/use-dashboard-orders-container';
import { OrdersTable } from '@/components/orders-table';

export function DashboardOrdersContainer() {
  const { activeTab, orders, isLoading, onTabChange, onCancelOrder } = useDashboardOrdersContainer();

  const tabs = [
    { value: 'all', label: 'All Orders' },
    { value: 'PENDING', label: 'Open Orders' },
    { value: 'FILLED', label: 'Order History' },
    { value: 'CANCELED', label: 'Canceled' },
  ];

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
        />
      </div>
    </div>
  );
}
