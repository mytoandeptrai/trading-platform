export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELED';

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Order {
  id: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number | null;
  amount: number;
  filled: number;
  remaining: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface PlaceOrderRequest {
  pair: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
}

export interface PlaceOrderResponse {
  orderId: number;
  status: string;
}
