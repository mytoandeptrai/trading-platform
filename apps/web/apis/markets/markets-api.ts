import httpClient from '../axios';

// ============================================
// Types
// ============================================

export interface Ticker {
  pairName: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  tradeCount: number;
  updatedAt: string;
}

export interface Candle {
  pairName: string;
  openTime: string;
  closeTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  tradesCount: number;
  isClosed: boolean;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBook {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

// Timeframe type for candles
export type CandleTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

// ============================================
// Constants
// ============================================

export const DEFAULT_TAKE_PAYLOAD = 1000;

// ============================================
// Markets API Client
// ============================================

export const marketsAPI = {
  /**
   * Get all tickers
   * Backend: GET /api/ticker
   */
  async getAllTickers(): Promise<Ticker[]> {
    const response = await httpClient.get<Ticker[]>('/ticker');
    return response.data;
  },

  /**
   * Get ticker for a specific pair
   * Backend: GET /api/ticker/:pair
   * @param pair - Trading pair (e.g., 'BTC/USD')
   */
  async getTicker(pair: string): Promise<Ticker> {
    const response = await httpClient.get<Ticker>(`/ticker/${encodeURIComponent(pair)}`);
    return response.data;
  },

  /**
   * Get candles for a specific pair with time range
   * Backend: GET /api/ticker/candles?pairName=BTC/USDT&interval=1m&startTime=...&endTime=...&take=1000
   * @param pairName - Trading pair (e.g., 'BTC/USDT')
   * @param interval - Candle interval (1m, 5m, 1h, 1d)
   * @param startTime - Start time in seconds (Unix timestamp)
   * @param endTime - End time in seconds (Unix timestamp)
   * @param take - Number of candles to fetch (default: DEFAULT_TAKE_PAYLOAD)
   */
  async getCandles(
    pairName: string,
    interval: CandleTimeframe = '1m',
    startTime?: number,
    endTime?: number,
    take: number = DEFAULT_TAKE_PAYLOAD
  ): Promise<Candle[]> {
    const response = await httpClient.get<Candle[]>('/ticker/candles', {
      params: {
        pairName,
        interval,
        startTime,
        endTime,
        take,
      },
    });
    return response.data;
  },

  /**
   * Get orderbook snapshot
   * Backend: GET /api/orderbook?pair=BTC/USD&levels=20
   * @param pair - Trading pair
   * @param levels - Number of price levels (default: 20)
   */
  async getOrderBook(pair: string, levels: number = 20): Promise<OrderBook> {
    const response = await httpClient.get<OrderBook>('/orderbook', {
      params: { pair, levels },
    });
    return response.data;
  },
};
