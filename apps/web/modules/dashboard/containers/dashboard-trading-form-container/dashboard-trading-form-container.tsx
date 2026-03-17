'use client';

import { TradingForm } from '@/components/trading-form';
import { useDashboardTradingFormContainer } from '../../hooks/use-dashboard-trading-form-container';

export function DashboardTradingFormContainer() {
  const props = useDashboardTradingFormContainer();
  return <TradingForm {...props} />;
}
