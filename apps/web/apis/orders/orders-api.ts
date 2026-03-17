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
  }): Promise<Order[]> {
    const response = await httpClient.get<Order[]>('/orders', { params });
    return response.data;
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
