// Trading Constants

// Fee Configuration
export const TRADING_FEE_PERCENT = 0.1; // 0.1%
export const TRADING_FEE_RATE = TRADING_FEE_PERCENT / 100;

// Mock Balance (will be replaced with API)
export const MOCK_AVAILABLE_BALANCE = 10000; // USDT

// Order Types
export const ORDER_TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
} as const;

// Order Sides
export const ORDER_SIDES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  CANCELED: 'CANCELED',
} as const;

// Default Values
export const DEFAULT_ORDER_TYPE = ORDER_TYPES.LIMIT;
export const DEFAULT_ORDER_SIDE = ORDER_SIDES.BUY;

// Percentage Options
export const PERCENTAGE_OPTIONS = [25, 50, 75, 100];

// Polling Intervals (ms)
export const POLLING_INTERVALS = {
  TICKER: 3000,
  ORDERBOOK: 1000,
  ORDERS: 5000,
  BALANCE: 10000,
} as const;
