'use client';

import { useState } from 'react';
import { OrdersListContainer } from './containers/orders-list-container';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'PENDING', label: 'Open Orders' },
  { id: 'FILLED', label: 'Filled' },
  { id: 'CANCELED', label: 'Canceled' },
];

export function Orders() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="flex h-full flex-col bg-[#0D0D0D]">
      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-1 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#00A8E8] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <OrdersListContainer status={activeTab === 'all' ? undefined : activeTab} />
      </div>
    </div>
  );
}
