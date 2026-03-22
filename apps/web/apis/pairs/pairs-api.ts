import httpClient from '../axios';

export interface TradingPair {
  id: number;
  name: string;
  baseCoin: string;
  quoteCurrency: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  tickSize: string;
  maxPrice: string;
  minPrice: string;
  takerFeeRate: string;
  makerFeeRate: string;
  isTradingActive: boolean;
}

export const pairsAPI = {
  /**
   * Get all trading pairs
   * Backend: GET /api/pairs
   */
  async getAllPairs(): Promise<TradingPair[]> {
    const response = await httpClient.get<TradingPair[]>('/pairs');
    return response.data;
  },

  /**
   * Get all active trading pairs
   * Backend: GET /api/pairs/active
   */
  async getActivePairs(): Promise<TradingPair[]> {
    const response = await httpClient.get<TradingPair[]>('/pairs/active');
    return response.data;
  },

  /**
   * Get a specific trading pair by name
   * Backend: GET /api/pairs/:name
   * @param name - Trading pair name (e.g., 'BTC/USD')
   */
  async getPairByName(name: string): Promise<TradingPair> {
    const response = await httpClient.get<TradingPair>(`/pairs/${encodeURIComponent(name)}`);
    return response.data;
  },
};
