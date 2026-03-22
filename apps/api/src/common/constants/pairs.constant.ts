export type TradingPairName = 'BTC/USD' | 'ETH/USD';

export interface TradingPairConfig {
  id: number;
  name: TradingPairName;
  baseCoin: string;
  quoteCurrency: string;
  minOrderAmount: number;
  maxOrderAmount: number;
  /** Smallest price increment (e.g. 0.01). */
  tickSize: number;
  /** For MARKET BUY: max price per unit when client omits price (sanity cap). */
  maxPrice: number;
  /** For MARKET SELL: not used for lock; sell is amount-based. */
  minPrice: number;
  takerFeeRate: number;
  makerFeeRate: number;
  isTradingActive: boolean;
}

export const TRADING_PAIRS: TradingPairConfig[] = [
  {
    id: 1,
    name: 'BTC/USD',
    baseCoin: 'BTC',
    quoteCurrency: 'USD',
    minOrderAmount: 0.001,
    maxOrderAmount: 100,
    tickSize: 0.01,
    maxPrice: 1_000_000,
    minPrice: 0.01,
    takerFeeRate: 0.001, // 0.1%
    makerFeeRate: 0.0005, // 0.05%
    isTradingActive: true,
  },
  {
    id: 2,
    name: 'ETH/USD',
    baseCoin: 'ETH',
    quoteCurrency: 'USD',
    minOrderAmount: 0.01,
    maxOrderAmount: 1000,
    tickSize: 0.01,
    maxPrice: 100_000,
    minPrice: 0.01,
    takerFeeRate: 0.001,
    makerFeeRate: 0.0005,
    isTradingActive: true,
  },
];

export function getPairConfig(name: string): TradingPairConfig | undefined {
  return TRADING_PAIRS.find((p) => p.name === name);
}
