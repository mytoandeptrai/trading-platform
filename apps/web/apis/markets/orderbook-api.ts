import httpClient from '../axios';

interface OrderbookSnapshot {
  pair: string;
  bids: Array<{
    price: number;
    quantity: number;
    orderCount: number;
  }>;
  asks: Array<{
    price: number;
    quantity: number;
    orderCount: number;
  }>;
}

export const orderbookAPI = {
  /**
   * Get orderbook snapshot from Redis
   */
  async getSnapshot(pair: string, levels: number = 20): Promise<OrderbookSnapshot> {
    const response = await httpClient.get<OrderbookSnapshot>('/orderbook', {
      params: { pair, levels },
    });
    return response.data;
  },
};
