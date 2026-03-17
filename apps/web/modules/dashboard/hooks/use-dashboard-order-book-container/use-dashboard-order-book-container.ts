import { useChartStore } from '@/stores/chart-store';
import { useOrderBook } from '@/hooks/use-orderbook';
import { useTicker } from '@/hooks/use-ticker';

export function useDashboardOrderBookContainer() {
  const { symbol } = useChartStore();
  const { data: orderBook, isLoading: isLoadingOrderBook } = useOrderBook(symbol, 15);
  const { data: ticker, isLoading: isLoadingTicker } = useTicker(symbol);

  const isLoading = isLoadingOrderBook || isLoadingTicker;

  return {
    symbol,
    orderBook,
    ticker,
    isLoading,
  };
}
