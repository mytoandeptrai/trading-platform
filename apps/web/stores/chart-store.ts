import { create } from 'zustand';

export interface ChartStore {
  symbol: string;
  setSymbol: (symbol: string) => void;

  resolution: string;
  setResolution: (resolution: string) => void;

  tvWidget: unknown | null;
  setTvWidget: (widget: unknown) => void;
}

export const useChartStore = create<ChartStore>((set) => ({
  symbol: 'BTC/USDT', // Backend expects format with slash (BTC/USDT, ETH/USDT, etc.)
  setSymbol: (symbol) => set({ symbol }),

  resolution: '15',
  setResolution: (resolution) => set({ resolution }),

  tvWidget: null,
  setTvWidget: (widget) => set({ tvWidget: widget }),
}));
