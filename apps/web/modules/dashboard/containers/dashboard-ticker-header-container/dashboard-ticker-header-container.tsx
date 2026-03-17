'use client';

import { TickerHeader } from '@/components/ticker-header';
import { useDashboardTickerHeaderContainer } from '../../hooks/use-dashboard-ticker-header-container';

export function DashboardTickerHeaderContainer() {
  const { ticker, isLoading } = useDashboardTickerHeaderContainer();

  return <TickerHeader ticker={ticker ?? null} isLoading={isLoading} />;
}
