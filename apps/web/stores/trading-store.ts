import { create } from 'zustand';
import type { OrderSide, OrderType } from '@/types/trading';

export interface TradingStore {
  currentPair: string;
  setCurrentPair: (pair: string) => void;

  orderSide: OrderSide;
  setOrderSide: (side: OrderSide) => void;

  orderType: OrderType;
  setOrderType: (type: OrderType) => void;

  orderPrice: string;
  setOrderPrice: (price: string) => void;

  orderAmount: string;
  setOrderAmount: (amount: string) => void;

  isPlacingOrder: boolean;
  setIsPlacingOrder: (isPlacing: boolean) => void;

  resetOrderForm: () => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  currentPair: 'BTC/USDT', // Backend expects format with slash (BTC/USDT, ETH/USDT, etc.)
  setCurrentPair: (pair) => set({ currentPair: pair }),

  orderSide: 'BUY',
  setOrderSide: (side) => set({ orderSide: side }),

  orderType: 'LIMIT',
  setOrderType: (type) => set({ orderType: type }),

  orderPrice: '',
  setOrderPrice: (price) => set({ orderPrice: price }),

  orderAmount: '',
  setOrderAmount: (amount) => set({ orderAmount: amount }),

  isPlacingOrder: false,
  setIsPlacingOrder: (isPlacing) => set({ isPlacingOrder: isPlacing }),

  resetOrderForm: () =>
    set({
      orderPrice: '',
      orderAmount: '',
    }),
}));
