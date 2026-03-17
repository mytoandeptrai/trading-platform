'use client';

import { DashboardTickerHeaderContainer } from './containers/dashboard-ticker-header-container';
import { DashboardOrderBookContainer } from './containers/dashboard-order-book-container';
import { DashboardChartContainer } from './containers/dashboard-chart-container';
import { DashboardTradingFormContainer } from './containers/dashboard-trading-form-container';
import { DashboardOrdersContainer } from './containers/dashboard-orders-container';

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D0D]">
      <DashboardTickerHeaderContainer />

      {/* Top section: OrderBook, Chart, Trading Form */}
      <div className="flex h-[calc(100vh-80px)] min-h-[600px]">
        <div className="w-[320px] border-r border-gray-800">
          <DashboardOrderBookContainer />
        </div>

        <div className="flex-1">
          <DashboardChartContainer />
        </div>

        <div className="w-[340px] border-l border-gray-800">
          <DashboardTradingFormContainer />
        </div>
      </div>

      {/* Bottom section: Orders Table */}
      <div className="border-t border-gray-800">
        <DashboardOrdersContainer />
      </div>
    </div>
  );
}
