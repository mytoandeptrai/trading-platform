import httpClient from '../axios';
import type { Order, PlaceOrderRequest, PlaceOrderResponse } from '@/types/trading';

export const ordersAPI = {
  /**
   * Place a new order
   */
  async placeOrder(data: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    const response = await httpClient.post<PlaceOrderResponse>('/orders', data);
    return response.data;
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await httpClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * List orders with optional filters
   */
  async listOrders(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number; limit: number; offset: number }> {
    interface BackendOrder {
      id: string;
      pairName: string;
      isBid: boolean;
      orderType: string;
      price: string | null;
      amount: string;
      filled: string;
      remaining: string;
      status: string;
      placedAt: string;
    }

    const response = await httpClient.get<{ orders: BackendOrder[]; total: number; limit: number; offset: number }>('/orders', { params });

    // Transform backend format to frontend format
    const transformedOrders: Order[] = response.data.orders.map((order) => ({
      id: order.id,
      pair: order.pairName,
      side: (order.isBid ? 'BUY' : 'SELL') as any,
      type: order.orderType as any,
      price: order.price ? parseFloat(order.price) : null,
      amount: parseFloat(order.amount),
      filled: parseFloat(order.filled),
      remaining: parseFloat(order.remaining),
      status: order.status as any,
      createdAt: order.placedAt,
    }));

    return {
      orders: transformedOrders,
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  },

  /**
   * Cancel a specific order
   */
  async cancelOrder(orderId: string): Promise<{ orderId: number; status: string }> {
    const response = await httpClient.delete<{ orderId: number; status: string }>(
      `/orders/${orderId}`
    );
    return response.data;
  },

  /**
   * Cancel all active orders
   */
  async cancelAllOrders(): Promise<{ canceled: number; orderIds: string[] }> {
    const response = await httpClient.post<{ canceled: number; orderIds: string[] }>(
      '/orders/cancel-all'
    );
    return response.data;
  },
};
