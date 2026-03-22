// Ticker Socket Types
export interface TickerUpdate {
  pair: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  highPrice: number;
  lowPrice: number;
  timestamp: string;
}

export interface OrderBookUpdate {
  pair: string;
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
  timestamp: string;
}

// Order Socket Types
export interface OrderMatched {
  orderId: number;
  pair: string;
  side: string;
  type: string;
  price: number;
  amount: number;
  filled: number;
  status: string;
}

export interface TradeExecuted {
  tradeId: number;
  orderId: number;
  pair: string;
  side: string;
  price: number;
  amount: number;
  fee: number;
  timestamp: string;
}

export interface PublicTrade {
  tradeId: number;
  pair: string;
  price: number;
  amount: number;
  side: string;
  timestamp: string;
}

export interface OrderFilled {
  orderId: number;
  pair: string;
  status: string;
}

export interface OrderCancelled {
  orderId: number;
  reason: string;
}

// ============================================
// UNIFIED SOCKET EVENTS (/ws namespace)
// ============================================

// All public events (broadcast to all clients)
export const PUBLIC_EVENTS = {
  TICKER_UPDATE: 'ticker:update',
  ORDERBOOK_UPDATE: 'orderbook:update',
  ORDERBOOK_CHANGED: 'orderbook:changed',
  ORDER_MATCHED: 'order:matched', // Public event for both orderbook and order management
} as const;

// All private events (emit to user room - requires auth)
export const PRIVATE_EVENTS = {
  TRADE_EXECUTED: 'trade:executed',
  ORDER_FILLED: 'order:filled',
  ORDER_CANCELLED: 'order:cancelled',
} as const;

// Combined type for all socket events
export type SocketEvent =
  | (typeof PUBLIC_EVENTS)[keyof typeof PUBLIC_EVENTS]
  | (typeof PRIVATE_EVENTS)[keyof typeof PRIVATE_EVENTS];

// Legacy enums for backwards compatibility
export enum TickerSocketEvent {
  TICKER_UPDATE = 'ticker:update',
  ORDERBOOK_UPDATE = 'orderbook:update',
  ORDERBOOK_CHANGED = 'orderbook:changed',
}

export enum OrderSocketEvent {
  ORDER_MATCHED = 'order:matched',
  TRADE_EXECUTED = 'trade:executed',
  PUBLIC_TRADE = 'trade:public',
  ORDER_FILLED = 'order:filled',
  ORDER_CANCELLED = 'order:cancelled',
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBED = 'unsubscribed',
}

// Connection Status
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}
