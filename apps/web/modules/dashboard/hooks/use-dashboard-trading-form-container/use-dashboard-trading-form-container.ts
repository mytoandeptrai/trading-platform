import { useState, useEffect, useCallback } from 'react';
import { useTradingStore } from '@/stores/trading-store';
import { useChartStore } from '@/stores/chart-store';
import { useTicker } from '@/hooks/use-ticker';
import { usePlaceOrder } from '@/hooks/use-orders';
import { MOCK_AVAILABLE_BALANCE, TRADING_FEE_RATE } from '@/constants/trading';
import type { OrderSide, OrderType } from '@/types/trading';
import { toast } from 'sonner';

export function useDashboardTradingFormContainer() {
  const { symbol } = useChartStore();
  const { data: ticker } = useTicker(symbol);

  const {
    orderSide,
    orderType,
    orderPrice,
    orderAmount,
    setOrderSide,
    setOrderType,
    setOrderPrice,
    setOrderAmount,
    resetOrderForm,
  } = useTradingStore();

  const { mutate: placeOrder, isPending: isPlacingOrder } = usePlaceOrder();

  const [total, setTotal] = useState('0.00');
  const availableBalance = MOCK_AVAILABLE_BALANCE;

  // Auto-fill market price for LIMIT orders
  useEffect(() => {
    if (orderType === 'LIMIT' && !orderPrice && ticker) {
      setOrderPrice(ticker.price.toString());
    }
  }, [orderType, orderPrice, ticker, setOrderPrice]);

  // Calculate total
  useEffect(() => {
    const price = orderType === 'LIMIT'
      ? parseFloat(orderPrice) || 0
      : ticker?.price || 0;
    const amount = parseFloat(orderAmount) || 0;
    const subtotal = price * amount;
    const fee = subtotal * TRADING_FEE_RATE;
    const totalWithFee = orderSide === 'BUY' ? subtotal + fee : subtotal - fee;
    setTotal(totalWithFee.toFixed(2));
  }, [orderPrice, orderAmount, orderType, orderSide, ticker]);

  // Handle percentage click
  const handlePercentageClick = useCallback(
    (percentage: number) => {
      if (!ticker) return;

      const price = orderType === 'LIMIT'
        ? parseFloat(orderPrice) || ticker.price
        : ticker.price;

      // Calculate max amount considering fee
      const availableForTrade = orderSide === 'BUY'
        ? availableBalance / (1 + TRADING_FEE_RATE)
        : availableBalance;

      const maxAmount = (availableForTrade * (percentage / 100)) / price;
      setOrderAmount(maxAmount.toFixed(6));
    },
    [orderType, orderPrice, orderSide, ticker, availableBalance, setOrderAmount]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!orderAmount || (orderType === 'LIMIT' && !orderPrice)) {
      return;
    }

    placeOrder(
      {
        pair: symbol,
        side: orderSide,
        type: orderType,
        amount: parseFloat(orderAmount),
        ...(orderType === 'LIMIT' && { price: parseFloat(orderPrice) }),
      },
      {
        onSuccess: (data) => {
          toast.success(`Order placed successfully! Order ID: ${data.orderId}`);
          resetOrderForm();
        },
        onError: (error) => {
          toast.error(`Failed to place order: ${error.message}`);
        },
      }
    );
  }, [
    symbol,
    orderSide,
    orderType,
    orderPrice,
    orderAmount,
    placeOrder,
    resetOrderForm,
  ]);

  return {
    orderSide,
    orderType,
    price: orderPrice,
    amount: orderAmount,
    total,
    availableBalance,
    symbol,
    isSubmitting: isPlacingOrder,
    onOrderSideChange: setOrderSide,
    onOrderTypeChange: setOrderType,
    onPriceChange: setOrderPrice,
    onAmountChange: setOrderAmount,
    onPercentageClick: handlePercentageClick,
    onSubmit: handleSubmit,
  };
}
