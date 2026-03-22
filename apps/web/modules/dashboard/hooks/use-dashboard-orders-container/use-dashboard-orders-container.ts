import { useState, useEffect, useCallback } from 'react';
import { useOrders, useCancelOrder } from '@/hooks/use-orders';
import { useSocket } from '@/contexts/socket-context';
import { useChartStore } from '@/stores/chart-store';
import { useQueryClient } from '@tanstack/react-query';
import { ordersKeys } from '@/hooks/use-orders';
import { toast } from 'sonner';
import {
  ConnectionStatus,
  PUBLIC_EVENTS,
  PRIVATE_EVENTS,
  type OrderMatched,
  type TradeExecuted,
  type OrderFilled,
  type OrderCancelled,
} from '@/types/socket';
import { useAuth } from '@/contexts/auth-context';

export function useDashboardOrdersContainer() {
  const [activeTab, setActiveTab] = useState('all');
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  // Get current trading pair
  const { symbol } = useChartStore();
  const { isAuthenticated } = useAuth();

  const status = activeTab === 'all' ? undefined : activeTab;
  const limit = 50;
  const { data, isLoading } = useOrders(status, isAuthenticated, limit, offset);
  const orders = data?.orders || [];
  const total = data?.total || 0;
  const { mutate: cancelOrder } = useCancelOrder();

  // Reset offset when tab changes
  useEffect(() => {
    setOffset(0);
  }, [activeTab]);

  // Subscribe to unified socket for real-time order updates
  const { subscribeToPair, unsubscribeFromPair, status: socketStatus, registerListener } = useSocket();

  // Subscribe to current trading pair
  useEffect(() => {
    if (socketStatus === ConnectionStatus.CONNECTED && symbol) {
      subscribeToPair(symbol);
      return () => {
        unsubscribeFromPair(symbol);
      };
    }
  }, [socketStatus, symbol, subscribeToPair, unsubscribeFromPair]);

  // Handle order matched event (public event - refresh if authenticated)
  useEffect(() => {
    if (socketStatus !== ConnectionStatus.CONNECTED) return;
    if (!isAuthenticated) return; // Only refresh if user is authenticated

    const cleanup = registerListener<OrderMatched>(PUBLIC_EVENTS.ORDER_MATCHED, (data) => {
      // Any order matched - refresh orders list (API will return user's orders only)
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      toast.info(`Order matched! Pair: ${data.pair}`);
    });

    return cleanup;
  }, [socketStatus, isAuthenticated, registerListener, queryClient]);

  // Handle trade executed event (private event - only if authenticated)
  useEffect(() => {
    if (socketStatus !== ConnectionStatus.CONNECTED || !isAuthenticated) return;

    const cleanup = registerListener<TradeExecuted>(PRIVATE_EVENTS.TRADE_EXECUTED, (data) => {
      toast.success(`Trade executed! ${data.side} ${data.amount} @ ${data.price}`);
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    });

    return cleanup;
  }, [socketStatus, isAuthenticated, registerListener, queryClient]);

  // Handle order filled event (private event - only if authenticated)
  useEffect(() => {
    if (socketStatus !== ConnectionStatus.CONNECTED || !isAuthenticated) return;

    const cleanup = registerListener<OrderFilled>(PRIVATE_EVENTS.ORDER_FILLED, (data) => {
      toast.success(`Order filled! Order ID: ${data.orderId}`);
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    });

    return cleanup;
  }, [socketStatus, isAuthenticated, registerListener, queryClient]);

  // Handle order cancelled event (private event - only if authenticated)
  useEffect(() => {
    if (socketStatus !== ConnectionStatus.CONNECTED || !isAuthenticated) return;

    const cleanup = registerListener<OrderCancelled>(PRIVATE_EVENTS.ORDER_CANCELLED, (data) => {
      toast.warning(`Order cancelled: ${data.reason}`);
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    });

    return cleanup;
  }, [socketStatus, isAuthenticated, registerListener, queryClient]);

  const handleCancelOrder = (orderId: string) => {
    cancelOrder(orderId, {
      onSuccess: () => {
        toast.success('Order canceled successfully');
      },
      onError: (error) => {
        toast.error(`Failed to cancel order: ${error.message}`);
      },
    });
  };

  return {
    activeTab,
    orders,
    isLoading,
    total,
    limit,
    offset,
    onTabChange: setActiveTab,
    onCancelOrder: handleCancelOrder,
    onPageChange: setOffset,
  };
}
