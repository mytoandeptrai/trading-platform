import { useChartStore } from '@/stores/chart-store';
import { useTicker } from '@/hooks/use-ticker';

export function useDashboardTickerHeaderContainer() {
  const { symbol } = useChartStore();
  const { data: ticker, isLoading } = useTicker(symbol);

  return {
    ticker,
    isLoading,
  };
}
