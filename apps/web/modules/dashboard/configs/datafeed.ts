import { marketsAPI, type CandleTimeframe } from "@/apis/markets";
import { pairsAPI, type TradingPair } from "@/apis/pairs";
// import { binanceAPI } from '@/lib/binance-api';
// import { resolutionToBinanceInterval } from '@/lib/utils';
import type {
  ChartBar,
  DatafeedConfiguration,
  PeriodParams,
  SymbolInfo,
} from "@/types/chart";
import type { Socket } from "socket.io-client";
import { TickerSocketEvent, type TickerUpdate } from "@/types/socket";

const lastBarsCache = new Map<string, ChartBar>();

// Cache for trading pairs
let tradingPairsCache: TradingPair[] | null = null;
let pairsFetchPromise: Promise<TradingPair[]> | null = null;

// Store subscribers for real-time updates
interface Subscriber {
  subscriberUID: string;
  resolution: string;
  symbolInfo: { ticker?: string };
  onRealtimeCallback: (bar: ChartBar) => void;
  lastBar: ChartBar;
}

const subscribers = new Map<string, Subscriber[]>();

/**
 * Fetch and cache trading pairs from backend
 */
async function fetchTradingPairs(): Promise<TradingPair[]> {
  // Return cached data if available
  if (tradingPairsCache) {
    return tradingPairsCache;
  }

  // Return existing promise if fetch is in progress
  if (pairsFetchPromise) {
    return pairsFetchPromise;
  }

  // Start new fetch
  pairsFetchPromise = pairsAPI
    .getActivePairs()
    .then((pairs) => {
      tradingPairsCache = pairs;
      pairsFetchPromise = null;
      console.log(
        "[Datafeed] Loaded trading pairs:",
        pairs.map((p) => p.name),
      );
      return pairs;
    })
    .catch((error) => {
      console.error("[Datafeed] Failed to fetch trading pairs:", error);
      pairsFetchPromise = null;
      // Return empty array on error
      return [];
    });

  return pairsFetchPromise;
}

/**
 * Convert TradingView resolution to backend timeframe
 * TradingView: '1', '5', '15', '30', '60', '240', '1D', '1W'
 * Backend: '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
 */
function resolutionToTimeframe(resolution: string): CandleTimeframe {
  // Backend only supports: 1m, 5m, 1h, 1d
  const map: Record<string, CandleTimeframe> = {
    "1": "1m",
    "3": "5m", // Map to closest: 5m
    "5": "5m",
    "15": "1h", // Map to next larger: 1h
    "30": "1h", // Map to next larger: 1h
    "60": "1h",
    "120": "1d", // Map to next larger: 1d
    "240": "1d", // Map to next larger: 1d
    "1D": "1d",
    D: "1d",
    "1W": "1d", // Map to daily (no weekly support)
    W: "1d",
  };
  return map[resolution] || "1m";
}

/**
 * Convert TradingView resolution to milliseconds
 */
function getResolutionInMs(resolution: string): number {
  const map: Record<string, number> = {
    "1": 60 * 1000, // 1 minute
    "3": 3 * 60 * 1000,
    "5": 5 * 60 * 1000,
    "15": 15 * 60 * 1000,
    "30": 30 * 60 * 1000,
    "60": 60 * 60 * 1000, // 1 hour
    "120": 2 * 60 * 60 * 1000,
    "240": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000, // 1 day
    D: 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000, // 1 week
    W: 7 * 24 * 60 * 60 * 1000,
  };
  return map[resolution] || 60 * 1000; // Default 1 minute
}

/**
 * Create TradingView datafeed using backend API
 * Fetches candles from /api/ticker/:pair/candles
 * @param tickerSocket - Socket instance from TickerSocketContext for real-time updates
 */
export const createBackendDatafeed = (tickerSocket: Socket | null) => {
  // Set up socket listener for ticker updates (for real-time candle updates)
  let socketListenerCleanup: (() => void) | null = null;

  if (tickerSocket) {
    const handleTickerUpdate = (data: TickerUpdate) => {
      // Update all active subscribers with the new price
      const symbolSubscribers = subscribers.get(data.pair);
      if (!symbolSubscribers || symbolSubscribers.length === 0) return;

      const now = Date.now();

      symbolSubscribers.forEach((subscriber) => {
        const { lastBar, onRealtimeCallback, resolution } = subscriber;

        // Calculate bar time based on resolution
        const resolutionMs = getResolutionInMs(resolution);
        const currentBarTime = Math.floor(now / resolutionMs) * resolutionMs;

        // Check if we're updating the same bar or creating a new one
        if (lastBar.time === currentBarTime) {
          // Update existing bar
          const updatedBar: ChartBar = {
            ...lastBar,
            close: data.lastPrice,
            high: Math.max(lastBar.high, data.lastPrice),
            low: Math.min(lastBar.low, data.lastPrice),
            volume: lastBar.volume + (data.volume || 0), // Accumulate volume if available
          };
          subscriber.lastBar = updatedBar;
          onRealtimeCallback(updatedBar);
        } else if (currentBarTime > lastBar.time) {
          // New bar started
          const newBar: ChartBar = {
            time: currentBarTime,
            open: lastBar.close,
            high: data.lastPrice,
            low: data.lastPrice,
            close: data.lastPrice,
            volume: 0,
          };
          subscriber.lastBar = newBar;
          onRealtimeCallback(newBar);
        }
      });
    };

    tickerSocket.on(TickerSocketEvent.TICKER_UPDATE, handleTickerUpdate);
    socketListenerCleanup = () => {
      tickerSocket.off(TickerSocketEvent.TICKER_UPDATE, handleTickerUpdate);
    };
  }

  return {
    onReady: async (callback: (config: DatafeedConfiguration) => void) => {
      // Fetch trading pairs in the background
      fetchTradingPairs().catch((error) => {
        console.error("[Datafeed] Failed to preload trading pairs:", error);
      });

      setTimeout(() => {
        callback({
          supported_resolutions: ["1", "5", "60", "1D"], // Backend only supports 1m, 5m, 1h, 1d
        });
      }, 0);
    },

    searchSymbols: async (
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResultReadyCallback: (results: unknown[]) => void,
    ) => {
      try {
        const pairs = await fetchTradingPairs();
        const searchQuery = userInput.toUpperCase();

        // Filter pairs by search query
        const results = pairs
          .filter((pair) => {
            const pairName = pair.name.toUpperCase();
            const baseCoin = pair.baseCoin.toUpperCase();
            const quoteCurrency = pair.quoteCurrency.toUpperCase();

            return (
              pairName.includes(searchQuery) ||
              baseCoin.includes(searchQuery) ||
              quoteCurrency.includes(searchQuery)
            );
          })
          .map((pair) => ({
            symbol: pair.name,
            full_name: pair.name,
            description: `${pair.baseCoin}/${pair.quoteCurrency}`,
            exchange: "TradeX",
            ticker: pair.name,
            type: "crypto",
          }));

        console.log("[Datafeed] Search results for", userInput, ":", results);
        onResultReadyCallback(results);
      } catch (error) {
        console.error("[Datafeed] Search error:", error);
        onResultReadyCallback([]);
      }
    },

    resolveSymbol: async (
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
      onResolveErrorCallback: (error: string) => void,
    ) => {
      try {
        // Fetch pairs to validate symbol
        const pairs = await fetchTradingPairs();
        const pairConfig = pairs.find((p) => p.name === symbolName);

        if (!pairConfig) {
          console.error(
            "[Datafeed] Symbol not found in trading pairs:",
            symbolName,
          );
          onResolveErrorCallback(`Symbol ${symbolName} not found`);
          return;
        }

        // Calculate precision from tick size
        // tick_size: "0.01" -> precision: 2
        // tick_size: "0.0001" -> precision: 4
        const tickSize = parseFloat(pairConfig.tickSize);
        const precision = Math.abs(Math.floor(Math.log10(tickSize)));

        const symbolInfo: SymbolInfo = {
          ticker: symbolName,
          name: symbolName,
          description: `${pairConfig.baseCoin}/${pairConfig.quoteCurrency}`,
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          exchange: "TradeX",
          minmov: 1,
          pricescale: Math.pow(10, precision),
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: ["1", "5", "60", "1D"],
          volume_precision: 2,
          data_status: "streaming",
          format: "price",
        };

        console.log("[Datafeed] Resolved symbol:", symbolName, symbolInfo);
        onSymbolResolvedCallback(symbolInfo);
      } catch (error) {
        console.error("[Datafeed] Resolve symbol error:", error);
        onResolveErrorCallback(`Failed to resolve symbol ${symbolName}`);
      }
    },

    getBars: async (
      symbolInfo: { ticker?: string; name?: string },
      resolution: string,
      periodParams: PeriodParams,
      onResult: (bars: ChartBar[], meta: { noData: boolean }) => void,
      onError: (error: string) => void,
    ) => {
      try {
        const interval = resolutionToTimeframe(resolution);
        const pairName = symbolInfo.name || symbolInfo.ticker || "";

        // Fetch candles with time range filtering
        const candles = await marketsAPI.getCandles(
          pairName,
          interval,
          periodParams.from,
          periodParams.to,
          1000,
        );

        const bars: ChartBar[] = candles
          .map((candle) => {
            return {
              time: new Date(candle.openTime).getTime(),
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close),
              volume: parseFloat(candle.volume),
            };
          })
          .filter((bar) => {
            // Filter out invalid bars (NaN values)
            return (
              !isNaN(bar.time) &&
              !isNaN(bar.open) &&
              !isNaN(bar.high) &&
              !isNaN(bar.low) &&
              !isNaN(bar.close) &&
              !isNaN(bar.volume)
            );
          });

        if (bars.length > 0) {
          const lastBar = bars[bars.length - 1];
          if (lastBar) {
            lastBarsCache.set(symbolInfo.ticker || "", lastBar);
          }
        }

        onResult(bars, { noData: bars.length === 0 });
      } catch (error) {
        console.error("getBars error:", error);
        onError(String(error));
      }
    },

    subscribeBars: (
      symbolInfo: { ticker?: string },
      resolution: string,
      onRealtimeCallback: (bar: ChartBar) => void,
      subscriberUID: string,
    ) => {
      const symbol = symbolInfo.ticker || "";
      console.log(
        "[Datafeed] subscribeBars:",
        symbol,
        resolution,
        subscriberUID,
      );

      // Get the last bar from cache
      const lastBar = lastBarsCache.get(symbol);
      if (!lastBar) {
        console.warn("[Datafeed] No last bar found in cache for", symbol);
        return;
      }

      // Create subscriber
      const subscriber: Subscriber = {
        subscriberUID,
        resolution,
        symbolInfo,
        onRealtimeCallback,
        lastBar: { ...lastBar }, // Clone to avoid mutations
      };

      // Add to subscribers map
      if (!subscribers.has(symbol)) {
        subscribers.set(symbol, []);
      }
      subscribers.get(symbol)?.push(subscriber);

      console.log("[Datafeed] Subscribed to real-time updates for", symbol);
    },

    unsubscribeBars: (subscriberUID: string) => {
      console.log("[Datafeed] unsubscribeBars:", subscriberUID);

      // Remove subscriber from all symbols
      subscribers.forEach((symbolSubscribers, symbol) => {
        const index = symbolSubscribers.findIndex(
          (s) => s.subscriberUID === subscriberUID,
        );
        if (index !== -1) {
          symbolSubscribers.splice(index, 1);
          console.log(
            "[Datafeed] Removed subscriber",
            subscriberUID,
            "from",
            symbol,
          );
        }
        // Clean up empty arrays
        if (symbolSubscribers.length === 0) {
          subscribers.delete(symbol);
        }
      });
    },
  };
};

// ============================================
// OLD BINANCE DATAFEED (COMMENTED OUT)
// ============================================
// const wsConnections = new Map<string, WebSocket>();
//
// export const createBinanceDatafeed = () => ({
//   onReady: (callback: (config: DatafeedConfiguration) => void) => {
//     setTimeout(() => {
//       callback({
//         supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W'],
//       });
//     }, 0);
//   },
//
//   searchSymbols: (
//     _userInput: string,
//     _exchange: string,
//     _symbolType: string,
//     onResultReadyCallback: (results: unknown[]) => void
//   ) => {
//     onResultReadyCallback([]);
//   },
//
//   resolveSymbol: async (
//     symbolName: string,
//     onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
//     _onResolveErrorCallback: (error: string) => void
//   ) => {
//     try {
//       const ticker = await binanceAPI.getTicker(symbolName);
//       const precision = ticker.price >= 1 ? 2 : ticker.price >= 0.01 ? 4 : 8;
//
//       const symbolInfo: SymbolInfo = {
//         ticker: symbolName,
//         name: symbolName,
//         description: symbolName,
//         type: 'crypto',
//         session: '24x7',
//         timezone: 'Etc/UTC',
//         exchange: 'Binance',
//         minmov: 1,
//         pricescale: Math.pow(10, precision),
//         has_intraday: true,
//         has_daily: true,
//         has_weekly_and_monthly: true,
//         supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W'],
//         volume_precision: 2,
//         data_status: 'streaming',
//         format: 'price',
//       };
//
//       onSymbolResolvedCallback(symbolInfo);
//     } catch {
//       _onResolveErrorCallback('Symbol not found');
//     }
//   },
//
//   getBars: async (
//     symbolInfo: { ticker?: string },
//     resolution: string,
//     periodParams: PeriodParams,
//     onResult: (bars: ChartBar[], meta: { noData: boolean }) => void,
//     onError: (error: string) => void
//   ) => {
//     try {
//       const interval = resolutionToBinanceInterval(resolution);
//       const klines = await binanceAPI.getKlines(symbolInfo.ticker || '', interval, 500);
//
//       const bars: ChartBar[] = klines
//         .filter((kline) => {
//           const time = kline.time / 1000;
//           return time >= periodParams.from && time < periodParams.to;
//         })
//         .map((kline) => ({
//           time: kline.time,
//           open: kline.open,
//           high: kline.high,
//           low: kline.low,
//           close: kline.close,
//           volume: kline.volume,
//         }));
//
//       if (bars.length > 0) {
//         const lastBar = bars[bars.length - 1];
//         if (lastBar) {
//           lastBarsCache.set(symbolInfo.ticker || '', lastBar);
//         }
//       }
//
//       onResult(bars, { noData: false });
//     } catch (error) {
//       onError(String(error));
//     }
//   },
//
//   subscribeBars: (
//     symbolInfo: { ticker?: string },
//     resolution: string,
//     onRealtimeCallback: (bar: ChartBar) => void,
//     subscriberUID: string
//   ) => {
//     const symbol = symbolInfo.ticker || '';
//     const interval = resolutionToBinanceInterval(resolution);
//
//     const ws = new WebSocket(
//       `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
//     );
//
//     ws.onmessage = (event: MessageEvent) => {
//       const data = JSON.parse(event.data);
//       if (data.e === 'kline') {
//         const kline = data.k;
//         const bar: ChartBar = {
//           time: kline.t,
//           open: parseFloat(kline.o),
//           high: parseFloat(kline.h),
//           low: parseFloat(kline.l),
//           close: parseFloat(kline.c),
//           volume: parseFloat(kline.v),
//         };
//
//         onRealtimeCallback(bar);
//
//         if (kline.x) {
//           lastBarsCache.set(symbol, bar);
//         }
//       }
//     };
//
//     wsConnections.set(subscriberUID, ws);
//   },
//
//   unsubscribeBars: (subscriberUID: string) => {
//     const ws = wsConnections.get(subscriberUID);
//     if (ws) {
//       ws.close();
//       wsConnections.delete(subscriberUID);
//     }
//   },
// });
