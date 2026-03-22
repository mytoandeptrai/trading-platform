import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { marketsAPI, type Ticker } from '@/apis/markets';
import { useSocket } from '@/contexts/socket-context';
import { ConnectionStatus, PUBLIC_EVENTS, type TickerUpdate } from '@/types/socket';
// import { binanceAPI } from '@/lib/binance-api';
// import { POLLING_INTERVALS } from '@/constants/trading';

export const tickerKeys = {
  all: ['ticker'] as const,
  symbol: (symbol: string) => [...tickerKeys.all, symbol] as const,
};

/**
 * Hook to fetch and subscribe to ticker updates
 * Uses backend API + WebSocket for real-time updates
 */
export function useTicker(symbol: string) {
  const { registerListener, status } = useSocket();
  const [realtimeTicker, setRealtimeTicker] = useState<Ticker | null>(null);

  // Initial fetch from backend API
  const query = useQuery({
    queryKey: tickerKeys.symbol(symbol),
    queryFn: () => marketsAPI.getTicker(symbol),
    staleTime: 60000, // 1 minute
    // No polling - rely on WebSocket for updates
  });

  // Subscribe to ticker updates from WebSocket
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return;

    const cleanup = registerListener<TickerUpdate>(PUBLIC_EVENTS.TICKER_UPDATE, (tickerUpdate) => {
      if (tickerUpdate.pair === symbol) {
        // Transform WebSocket format to match API Ticker format
        const transformed: Ticker = {
          pairName: tickerUpdate.pair,
          lastPrice: tickerUpdate.lastPrice.toString(),
          openPrice: '0', // WebSocket doesn't provide all fields
          highPrice: tickerUpdate.highPrice.toString(),
          lowPrice: tickerUpdate.lowPrice.toString(),
          priceChange: tickerUpdate.priceChange.toString(),
          priceChangePercent: tickerUpdate.priceChangePercent.toString(),
          volume: tickerUpdate.volume.toString(),
          quoteVolume: '0',
          bidPrice: '0',
          bidQty: '0',
          askPrice: '0',
          askQty: '0',
          tradeCount: 0,
          updatedAt: tickerUpdate.timestamp,
        };
        setRealtimeTicker(transformed);
      }
    });

    return cleanup;
  }, [status, symbol, registerListener]);

  // Return realtime data if available, otherwise fallback to query data
  return {
    ...query,
    data: realtimeTicker || query.data,
  };
}

// ============================================
// OLD BINANCE API VERSION (COMMENTED OUT)
// ============================================
// export function useTicker(symbol: string) {
//   return useQuery({
//     queryKey: tickerKeys.symbol(symbol),
//     queryFn: () => binanceAPI.getTicker(symbol),
//     staleTime: POLLING_INTERVALS.TICKER,
//     refetchInterval: POLLING_INTERVALS.TICKER,
//   });
// }
