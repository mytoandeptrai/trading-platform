import { binanceAPI } from '@/lib/binance-api';
import { resolutionToBinanceInterval } from '@/lib/utils';
import type { ChartBar, DatafeedConfiguration, PeriodParams, SymbolInfo } from '@/types/chart';

const lastBarsCache = new Map<string, ChartBar>();
const wsConnections = new Map<string, WebSocket>();

export const createBinanceDatafeed = () => ({
  onReady: (callback: (config: DatafeedConfiguration) => void) => {
    setTimeout(() => {
      callback({
        supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W'],
      });
    }, 0);
  },

  searchSymbols: (
    _userInput: string,
    _exchange: string,
    _symbolType: string,
    onResultReadyCallback: (results: unknown[]) => void
  ) => {
    onResultReadyCallback([]);
  },

  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
    _onResolveErrorCallback: (error: string) => void
  ) => {
    try {
      const ticker = await binanceAPI.getTicker(symbolName);
      const precision = ticker.price >= 1 ? 2 : ticker.price >= 0.01 ? 4 : 8;

      const symbolInfo: SymbolInfo = {
        ticker: symbolName,
        name: symbolName,
        description: symbolName,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: 'Binance',
        minmov: 1,
        pricescale: Math.pow(10, precision),
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W'],
        volume_precision: 2,
        data_status: 'streaming',
        format: 'price',
      };

      onSymbolResolvedCallback(symbolInfo);
    } catch {
      _onResolveErrorCallback('Symbol not found');
    }
  },

  getBars: async (
    symbolInfo: { ticker?: string },
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: ChartBar[], meta: { noData: boolean }) => void,
    onError: (error: string) => void
  ) => {
    try {
      const interval = resolutionToBinanceInterval(resolution);
      const klines = await binanceAPI.getKlines(symbolInfo.ticker || '', interval, 500);

      const bars: ChartBar[] = klines
        .filter((kline) => {
          const time = kline.time / 1000;
          return time >= periodParams.from && time < periodParams.to;
        })
        .map((kline) => ({
          time: kline.time,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
          volume: kline.volume,
        }));

      if (bars.length > 0) {
        const lastBar = bars[bars.length - 1];
        if (lastBar) {
          lastBarsCache.set(symbolInfo.ticker || '', lastBar);
        }
      }

      onResult(bars, { noData: false });
    } catch (error) {
      onError(String(error));
    }
  },

  subscribeBars: (
    symbolInfo: { ticker?: string },
    resolution: string,
    onRealtimeCallback: (bar: ChartBar) => void,
    subscriberUID: string
  ) => {
    const symbol = symbolInfo.ticker || '';
    const interval = resolutionToBinanceInterval(resolution);

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
    );

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.e === 'kline') {
        const kline = data.k;
        const bar: ChartBar = {
          time: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
        };

        onRealtimeCallback(bar);

        if (kline.x) {
          lastBarsCache.set(symbol, bar);
        }
      }
    };

    wsConnections.set(subscriberUID, ws);
  },

  unsubscribeBars: (subscriberUID: string) => {
    const ws = wsConnections.get(subscriberUID);
    if (ws) {
      ws.close();
      wsConnections.delete(subscriberUID);
    }
  },
});
