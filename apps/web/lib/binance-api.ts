import type { OrderBook, OrderBookLevel, Ticker, Kline } from '@/types/trading';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

export const binanceAPI = {
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();

    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      quoteVolume24h: parseFloat(data.quoteVolume),
    };
  },

  async getKlines(symbol: string, interval: string, limit: number = 500): Promise<Kline[]> {
    const response = await fetch(
      `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();

    return data.map((candle: unknown[]) => ({
      time: candle[0] as number,
      open: parseFloat(candle[1] as string),
      high: parseFloat(candle[2] as string),
      low: parseFloat(candle[3] as string),
      close: parseFloat(candle[4] as string),
      volume: parseFloat(candle[5] as string),
    }));
  },

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    const response = await fetch(
      `${BINANCE_API_BASE}/depth?symbol=${symbol}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();

    const parseBids = (bids: [string, string][]): OrderBookLevel[] => {
      let total = 0;
      return bids.map(([price, amount]) => {
        const qty = parseFloat(amount);
        total += qty;
        return {
          price: parseFloat(price),
          amount: qty,
          total,
        };
      });
    };

    const parseAsks = (asks: [string, string][]): OrderBookLevel[] => {
      let total = 0;
      return asks.reverse().map(([price, amount]) => {
        const qty = parseFloat(amount);
        total += qty;
        return {
          price: parseFloat(price),
          amount: qty,
          total,
        };
      });
    };

    return {
      bids: parseBids(data.bids),
      asks: parseAsks(data.asks),
      lastUpdateId: data.lastUpdateId,
    };
  },
};
