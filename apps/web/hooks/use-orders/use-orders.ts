import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI } from '@/apis/orders';
import type { Order, PlaceOrderRequest } from '@/types/trading';

// Query Keys
export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (filters?: { status?: string }) => [...ordersKeys.lists(), filters] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
};

/**
 * Fetch orders list with optional filters
 */
export function useOrders(status?: string) {
  return useQuery({
    queryKey: ordersKeys.list({ status }),
    queryFn: () => ordersAPI.listOrders({ status }),
    staleTime: 5000, // 5 seconds
  });
}

/**
 * Fetch single order by ID
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => ordersAPI.getOrderById(orderId),
    enabled: !!orderId, // Only run if orderId exists
  });
}

/**
 * Place new order mutation
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PlaceOrderRequest) => ordersAPI.placeOrder(data),
    onSuccess: () => {
      // Invalidate orders list to refetch
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    },
  });
}

/**
 * Cancel order mutation
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersAPI.cancelOrder(orderId),
    onSuccess: () => {
      // Invalidate orders list to refetch
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    },
  });
}

/**
 * Cancel all orders mutation
 */
export function useCancelAllOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ordersAPI.cancelAllOrders(),
    onSuccess: () => {
      // Invalidate orders list to refetch
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    },
  });
}
