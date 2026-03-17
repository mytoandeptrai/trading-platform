import { useQuery } from '@tanstack/react-query';
import { binanceAPI } from '@/lib/binance-api';
import { POLLING_INTERVALS } from '@/constants/trading';

export const tickerKeys = {
  all: ['ticker'] as const,
  symbol: (symbol: string) => [...tickerKeys.all, symbol] as const,
};

export function useTicker(symbol: string) {
  return useQuery({
    queryKey: tickerKeys.symbol(symbol),
    queryFn: () => binanceAPI.getTicker(symbol),
    staleTime: POLLING_INTERVALS.TICKER,
    refetchInterval: POLLING_INTERVALS.TICKER,
  });
}
