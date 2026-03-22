import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { marketsAPI } from '@/apis/markets';
import { useSocket } from '@/contexts/socket-context';
import { ConnectionStatus, PUBLIC_EVENTS } from '@/types/socket';
// import { binanceAPI } from '@/lib/binance-api';
import { POLLING_INTERVALS } from '@/constants/trading';

export const orderbookKeys = {
  all: ['orderbook'] as const,
  symbol: (symbol: string, levels: number) => [...orderbookKeys.all, symbol, levels] as const,
};

/**
 * Hook to fetch and subscribe to orderbook updates
 * Refetches API when order.matched event received
 */
export function useOrderBook(symbol: string, levels: number = 15) {
  const { registerListener, status } = useSocket();
  const queryClient = useQueryClient();

  // Initial fetch from backend API
  const query = useQuery({
    queryKey: orderbookKeys.symbol(symbol, levels),
    queryFn: async () => {
      const data = await marketsAPI.getOrderBook(symbol, levels);

      // Transform API format to component format
      // Calculate cumulative totals
      let bidTotal = 0;
      const transformedBids = data.bids.map((level) => {
        bidTotal += level.quantity;
        return {
          price: level.price,
          amount: level.quantity,
          total: bidTotal,
        };
      });

      let askTotal = 0;
      const transformedAsks = data.asks.map((level) => {
        askTotal += level.quantity;
        return {
          price: level.price,
          amount: level.quantity,
          total: askTotal,
        };
      });

      return {
        pair: data.pair,
        bids: transformedBids,
        asks: transformedAsks,
      };
    },
    staleTime: 60000, // 1 minute
  });

  // Listen for order.matched event (after matching) to refetch orderbook
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return;

    const cleanup = registerListener<{ pair: string; orderId: string }>(
      PUBLIC_EVENTS.ORDER_MATCHED,
      (event) => {
        console.log("🚀 ~ useOrderBook ~ order.matched event:", event)
        if (event.pair === symbol) {
          // Refetch orderbook from API
          queryClient.invalidateQueries({ queryKey: orderbookKeys.symbol(symbol, levels) });
        }
      }
    );

    return cleanup;
  }, [status, symbol, levels, registerListener, queryClient]);

  // Listen for orderbook.changed event (when new order placed) to refetch orderbook
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return;

    const cleanup = registerListener<{ pair: string; timestamp: string }>(
      PUBLIC_EVENTS.ORDERBOOK_CHANGED,
      (event) => {
        console.log("🚀 ~ useOrderBook ~ orderbook.changed event:", event)
        if (event.pair === symbol) {
          // Refetch orderbook from API
          queryClient.invalidateQueries({ queryKey: orderbookKeys.symbol(symbol, levels) });
        }
      }
    );

    return cleanup;
  }, [status, symbol, levels, registerListener, queryClient]);

  return query;
}

// ============================================
// OLD BINANCE API VERSION (COMMENTED OUT)
// ============================================
// export function useOrderBook(symbol: string, levels: number = 15) {
//   return useQuery({
//     queryKey: orderbookKeys.symbol(symbol, levels),
//     queryFn: () => binanceAPI.getOrderBook(symbol, levels),
//     staleTime: POLLING_INTERVALS.ORDERBOOK,
//     refetchInterval: POLLING_INTERVALS.ORDERBOOK,
//   });
// }
