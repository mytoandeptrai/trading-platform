import { useQuery } from '@tanstack/react-query';
import { binanceAPI } from '@/lib/binance-api';
import { POLLING_INTERVALS } from '@/constants/trading';

export const orderbookKeys = {
  all: ['orderbook'] as const,
  symbol: (symbol: string, levels: number) => [...orderbookKeys.all, symbol, levels] as const,
};

export function useOrderBook(symbol: string, levels: number = 15) {
  return useQuery({
    queryKey: orderbookKeys.symbol(symbol, levels),
    queryFn: () => binanceAPI.getOrderBook(symbol, levels),
    staleTime: POLLING_INTERVALS.ORDERBOOK,
    refetchInterval: POLLING_INTERVALS.ORDERBOOK,
  });
}
