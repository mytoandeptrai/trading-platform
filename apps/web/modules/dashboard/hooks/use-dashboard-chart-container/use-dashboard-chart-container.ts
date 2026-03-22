import { useEffect, useRef, useState } from 'react';
import { useChartStore } from '@/stores/chart-store';
import { useSocket } from '@/contexts/socket-context';
import { createBackendDatafeed } from '../../configs/datafeed';

type TVWidget = {
  onChartReady: (callback: () => void) => void;
  remove: () => void;
  activeChart: () => {
    onIntervalChanged: () => { subscribe: (a: null, callback: (interval: string) => void) => void };
    onSymbolChanged: () => { subscribe: (a: null, callback: (data: { name: string }) => void) => void };
  };
};

declare global {
  interface Window {
    TradingView: {
      widget: new (config: unknown) => TVWidget;
    };
  }
}

export function useDashboardChartContainer(scriptLoaded: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TVWidget | null>(null);

  const { symbol, resolution, setSymbol, setResolution, setTvWidget } = useChartStore();
  const { socket } = useSocket(); // Get unified socket for real-time updates

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !scriptLoaded || !window.TradingView) return;

    const widget = new window.TradingView.widget({
      symbol,
      datafeed: createBackendDatafeed(socket), // Pass socket to datafeed
      interval: resolution,
      container: containerRef.current,
      library_path: '/static/charting_library/',
      locale: 'en',
      disabled_features: [
        'header_symbol_search',
        'header_compare',
        'header_screenshot',
        'header_saveload',
      ],
      enabled_features: ['study_templates'],
      fullscreen: false,
      autosize: true,
      theme: 'Dark',
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#00C087',
        'mainSeriesProperties.candleStyle.downColor': '#F6465D',
        'mainSeriesProperties.candleStyle.borderUpColor': '#00C087',
        'mainSeriesProperties.candleStyle.borderDownColor': '#F6465D',
        'mainSeriesProperties.candleStyle.wickUpColor': '#00C087',
        'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
        'paneProperties.background': '#161616',
        'paneProperties.backgroundType': 'solid',
      },
    });

    widget.onChartReady(() => {
      setIsReady(true);
      widgetRef.current = widget;
      setTvWidget(widget);

      widget.activeChart().onIntervalChanged().subscribe(null, (interval) => {
        setResolution(interval);
      });

      widget.activeChart().onSymbolChanged().subscribe(null, (symbolData) => {
        setSymbol(symbolData.name);
      });
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
        setTvWidget(null);
      }
    };
  }, [symbol, resolution, scriptLoaded, socket, setSymbol, setResolution, setTvWidget]);

  return {
    containerRef,
    isReady,
  };
}
