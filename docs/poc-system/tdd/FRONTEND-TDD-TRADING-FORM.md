# Frontend TDD - Trading Form & Order Management

## 1. Trading Form Component

### 1.1 Component Architecture

```
modules/dashboard/
├── containers/
│   └── dashboard-trading-form-container/
│       ├── dashboard-trading-form-container.tsx
│       └── index.ts
├── hooks/
│   └── use-dashboard-trading-form-container/
│       ├── use-dashboard-trading-form-container.ts
│       └── index.ts
└── configs/
    └── trading-constants.ts
```

### 1.2 Component Structure

#### UI Components (Pure Display)

**components/trading-form/trading-form.tsx**
```tsx
import type { OrderSide, OrderType } from '@/types/trading';

interface TradingFormProps {
  // State
  orderSide: OrderSide;
  orderType: OrderType;
  price: string;
  amount: string;
  total: string;
  availableBalance: number;

  // Callbacks
  onOrderSideChange: (side: OrderSide) => void;
  onOrderTypeChange: (type: OrderType) => void;
  onPriceChange: (price: string) => void;
  onAmountChange: (amount: string) => void;
  onPercentageClick: (percentage: number) => void;
  onSubmit: () => void;

  // Loading state
  isSubmitting: boolean;
}

export function TradingForm(props: TradingFormProps) {
  const {
    orderSide,
    orderType,
    price,
    amount,
    total,
    availableBalance,
    onOrderSideChange,
    onOrderTypeChange,
    onPriceChange,
    onAmountChange,
    onPercentageClick,
    onSubmit,
    isSubmitting,
  } = props;

  return (
    <div className="flex h-full flex-col bg-[#161616]">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400">Spot Trading</h3>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="border-b border-gray-800 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOrderSideChange('BUY')}
            className={cn(
              'rounded py-2 text-sm font-medium transition-colors',
              orderSide === 'BUY'
                ? 'bg-[#00C087] text-white'
                : 'bg-gray-800 text-gray-400'
            )}
          >
            Buy
          </button>
          <button
            onClick={() => onOrderSideChange('SELL')}
            className={cn(
              'rounded py-2 text-sm font-medium transition-colors',
              orderSide === 'SELL'
                ? 'bg-[#F6465D] text-white'
                : 'bg-gray-800 text-gray-400'
            )}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Order Type */}
          <div>
            <label className="mb-2 block text-xs text-gray-400">Order Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOrderTypeChange('LIMIT')}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  orderType === 'LIMIT'
                    ? 'bg-[#00A8E8] text-white'
                    : 'bg-gray-800 text-gray-400'
                )}
              >
                Limit
              </button>
              <button
                onClick={() => onOrderTypeChange('MARKET')}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  orderType === 'MARKET'
                    ? 'bg-[#00A8E8] text-white'
                    : 'bg-gray-800 text-gray-400'
                )}
              >
                Market
              </button>
            </div>
          </div>

          {/* Available Balance */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Available</span>
            <span className="text-white">
              {formatNumber(availableBalance, 2)} USDT
            </span>
          </div>

          {/* Price Input (Only for LIMIT orders) */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="mb-2 block text-xs text-gray-400">Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-gray-800 bg-[#0D0D0D] px-3 py-2 text-sm text-white focus:border-[#00A8E8] focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  USDT
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="mb-2 block text-xs text-gray-400">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-gray-800 bg-[#0D0D0D] px-3 py-2 text-sm text-white focus:border-[#00A8E8] focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                BTC
              </span>
            </div>
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                onClick={() => onPercentageClick(percentage)}
                className="rounded bg-gray-800 py-1.5 text-xs text-gray-400 hover:bg-gray-700"
              >
                {percentage}%
              </button>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Total</span>
            <span className="text-white">{total} USDT</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !amount || (orderType === 'LIMIT' && !price)}
            className={cn(
              'w-full rounded py-3 font-semibold transition-colors',
              orderSide === 'BUY'
                ? 'bg-[#00C087] hover:bg-[#00C087]/90 disabled:bg-[#00C087]/50'
                : 'bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:bg-[#F6465D]/50',
              'disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting
              ? 'Placing Order...'
              : orderSide === 'BUY'
              ? 'Buy BTC'
              : 'Sell BTC'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Container Hook (Logic)

**modules/dashboard/hooks/use-dashboard-trading-form-container/use-dashboard-trading-form-container.ts**
```tsx
import { useState, useEffect, useCallback } from 'react';
import { useTradingStore } from '@/stores/trading-store';
import { useChartStore } from '@/stores/chart-store';
import { useTicker } from '@/hooks/use-ticker';
import type { OrderSide, OrderType, PlaceOrderRequest } from '@/types/trading';

export function useDashboardTradingFormContainer() {
  const { symbol } = useChartStore();
  const { ticker } = useTicker(symbol);

  const {
    orderSide,
    orderType,
    orderPrice,
    orderAmount,
    setOrderSide,
    setOrderType,
    setOrderPrice,
    setOrderAmount,
    isPlacingOrder,
    setIsPlacingOrder,
    resetOrderForm,
  } = useTradingStore();

  const [total, setTotal] = useState('0.00');
  const [availableBalance] = useState(10000); // Mock - will be from API

  // Auto-fill market price for LIMIT orders
  useEffect(() => {
    if (orderType === 'LIMIT' && !orderPrice && ticker) {
      setOrderPrice(ticker.price.toString());
    }
  }, [orderType, orderPrice, ticker, setOrderPrice]);

  // Calculate total
  useEffect(() => {
    const price = parseFloat(orderPrice) || 0;
    const amount = parseFloat(orderAmount) || 0;
    setTotal((price * amount).toFixed(2));
  }, [orderPrice, orderAmount]);

  // Handle percentage click
  const handlePercentageClick = useCallback(
    (percentage: number) => {
      if (!ticker) return;

      const price = orderType === 'LIMIT'
        ? parseFloat(orderPrice) || ticker.price
        : ticker.price;

      const maxAmount = (availableBalance * (percentage / 100)) / price;
      setOrderAmount(maxAmount.toFixed(6));
    },
    [orderType, orderPrice, ticker, availableBalance, setOrderAmount]
  );

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!orderAmount || (orderType === 'LIMIT' && !orderPrice)) {
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData: PlaceOrderRequest = {
        pair: symbol,
        side: orderSide,
        type: orderType,
        amount: parseFloat(orderAmount),
        ...(orderType === 'LIMIT' && { price: parseFloat(orderPrice) }),
      };

      // TODO: Call API to place order
      console.log('Placing order:', orderData);

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      resetOrderForm();

      // TODO: Show success toast
      // TODO: Refresh orders list
    } catch (error) {
      console.error('Failed to place order:', error);
      // TODO: Show error toast
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    symbol,
    orderSide,
    orderType,
    orderPrice,
    orderAmount,
    setIsPlacingOrder,
    resetOrderForm,
  ]);

  return {
    // State
    orderSide,
    orderType,
    price: orderPrice,
    amount: orderAmount,
    total,
    availableBalance,
    isSubmitting: isPlacingOrder,

    // Callbacks
    onOrderSideChange: setOrderSide,
    onOrderTypeChange: setOrderType,
    onPriceChange: setOrderPrice,
    onAmountChange: setOrderAmount,
    onPercentageClick: handlePercentageClick,
    onSubmit: handleSubmit,
  };
}
```

#### Container (Render Only)

**modules/dashboard/containers/dashboard-trading-form-container/dashboard-trading-form-container.tsx**
```tsx
'use client';

import { TradingForm } from '@/components/trading-form';
import { useDashboardTradingFormContainer } from '../../hooks/use-dashboard-trading-form-container';

export function DashboardTradingFormContainer() {
  const props = useDashboardTradingFormContainer();
  return <TradingForm {...props} />;
}
```

---

## 2. Order Management

### 2.1 Orders Page Architecture

```
app/
└── orders/
    └── page.tsx

modules/orders/
├── containers/
│   └── orders-list-container/
│       ├── orders-list-container.tsx
│       └── index.ts
├── hooks/
│   └── use-orders-list-container/
│       ├── use-orders-list-container.ts
│       └── index.ts
└── orders.tsx

components/
└── orders-table/
    ├── orders-table.tsx
    └── index.ts
```

### 2.2 Orders Table Component

**components/orders-table/orders-table.tsx**
```tsx
import type { Order } from '@/types/trading';
import { formatPriceNumber, formatNumber, cn } from '@/lib/utils';

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onCancelOrder: (orderId: string) => void;
}

export function OrdersTable({ orders, isLoading, onCancelOrder }: OrdersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-400">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-400">No orders found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
              Pair
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
              Side
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
              Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
              Filled
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
              Status
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-gray-800 hover:bg-gray-800/50"
            >
              <td className="px-4 py-3 text-sm text-white">{order.pair}</td>
              <td className="px-4 py-3 text-sm text-gray-300">{order.type}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'text-sm font-medium',
                    order.side === 'BUY' ? 'text-[#00C087]' : 'text-[#F6465D]'
                  )}
                >
                  {order.side}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {order.price ? formatPriceNumber(order.price) : 'Market'}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatNumber(order.amount, 6)}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatNumber(order.filled, 6)}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {order.price
                  ? formatPriceNumber(order.price * order.amount)
                  : '-'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-center">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => onCancelOrder(order.id)}
                    className="text-xs text-[#F6465D] hover:text-[#F6465D]/80"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: 'bg-yellow-500/20 text-yellow-500',
    FILLED: 'bg-green-500/20 text-green-500',
    PARTIALLY_FILLED: 'bg-blue-500/20 text-blue-500',
    CANCELED: 'bg-red-500/20 text-red-500',
  };

  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-1 text-xs font-medium',
        colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-500'
      )}
    >
      {status}
    </span>
  );
}
```

### 2.3 Orders Hook

**hooks/use-orders/use-orders.ts**
```tsx
import { useEffect, useState } from 'react';
import type { Order } from '@/types/trading';

export function useOrders(status?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // TODO: Call API
        // const response = await fetch(`/api/orders?status=${status}`);
        // const data = await response.json();

        // Mock data
        const mockOrders: Order[] = [
          {
            id: '1',
            pair: 'BTC/USDT',
            side: 'BUY',
            type: 'LIMIT',
            price: 43250.5,
            amount: 0.5,
            filled: 0.25,
            remaining: 0.25,
            status: 'PARTIALLY_FILLED',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            pair: 'ETH/USDT',
            side: 'SELL',
            type: 'MARKET',
            price: null,
            amount: 2.0,
            filled: 0,
            remaining: 2.0,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
        ];

        setOrders(mockOrders);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [status]);

  const cancelOrder = async (orderId: string) => {
    try {
      // TODO: Call API
      // await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });

      // Mock: Remove from list
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      console.log('Order canceled:', orderId);
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };

  return { orders, isLoading, error, cancelOrder };
}
```

---

## 3. Confirmation Modals

### 3.1 Order Confirmation Modal

**components/modals/order-confirmation-modal/order-confirmation-modal.tsx**
```tsx
import type { OrderSide, OrderType } from '@/types/trading';
import { formatPriceNumber, cn } from '@/lib/utils';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;

  // Order details
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number | null;
  amount: number;
  fee: number;
  total: number;

  isSubmitting: boolean;
}

export function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  pair,
  side,
  type,
  price,
  amount,
  fee,
  total,
  isSubmitting,
}: OrderConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-[#161616] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Confirm {side === 'BUY' ? 'Buy' : 'Sell'} Order
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Order Details */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pair</span>
            <span className="text-white">{pair}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Type</span>
            <span className="text-white">{type} Order</span>
          </div>

          {price && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price</span>
              <span className="text-white">{formatPriceNumber(price)} USDT</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount</span>
            <span className="text-white">{amount.toFixed(6)} BTC</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Fee (0.1%)</span>
            <span className="text-white">{formatPriceNumber(fee)} USDT</span>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Total</span>
              <span className="text-lg font-bold text-white">
                {formatPriceNumber(total)} USDT
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded bg-gray-800 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn(
              'rounded py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50',
              side === 'BUY'
                ? 'bg-[#00C087] hover:bg-[#00C087]/90'
                : 'bg-[#F6465D] hover:bg-[#F6465D]/90'
            )}
          >
            {isSubmitting ? 'Confirming...' : `Confirm ${side === 'BUY' ? 'Buy' : 'Sell'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. API Integration

### 4.1 Orders API Client

**lib/api/orders-api.ts**
```tsx
import type { Order, PlaceOrderRequest, PlaceOrderResponse } from '@/types/trading';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const ordersAPI = {
  async placeOrder(data: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // For cookies
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to place order');
    }

    return response.json();
  },

  async getOrders(status?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE}/orders?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    return response.json();
  },

  async cancelOrder(orderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to cancel order');
    }
  },

  async cancelAllOrders(): Promise<{ canceled: number; orderIds: string[] }> {
    const response = await fetch(`${API_BASE}/orders/cancel-all`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to cancel all orders');
    }

    return response.json();
  },
};
```

---

## 5. Implementation Timeline

### Phase 1: Trading Form (2 days)
- Day 1: Create trading form component and container
- Day 2: Implement order placement logic, validation, and error handling

### Phase 2: Order Management (2 days)
- Day 1: Create orders table component and orders page
- Day 2: Implement order fetching, filtering, and cancellation

### Phase 3: Modals & Polish (1 day)
- Day 1: Create confirmation modals, integrate with trading form
- Bonus: Add toast notifications for success/error states

---

## 6. Testing Checklist

### Trading Form
- [ ] Buy/Sell tab switching works
- [ ] Limit/Market order type switching works
- [ ] Price input only shows for LIMIT orders
- [ ] Market price auto-fills for LIMIT orders
- [ ] Amount calculation with percentage buttons works correctly
- [ ] Total calculation is accurate
- [ ] Form validation prevents invalid submissions
- [ ] Submit button shows loading state
- [ ] Success/error states handled properly

### Order Management
- [ ] Orders table displays correctly
- [ ] Status badges show correct colors
- [ ] Cancel button only shows for PENDING orders
- [ ] Cancel action works and updates UI
- [ ] Empty state shows when no orders
- [ ] Loading state displays properly

### Modals
- [ ] Confirmation modal opens on submit
- [ ] Order details display correctly
- [ ] Fee calculation is accurate
- [ ] Confirm/Cancel actions work
- [ ] Modal closes on success

---

## 7. Notes

1. **Mock Data**: Initially using mock data for available balance and orders
2. **API Integration**: Ready to connect to backend `/api/orders` endpoints
3. **Real-time Updates**: Can add WebSocket for live order updates later
4. **Responsive**: Design supports both desktop (340px width) and mobile views
5. **Accessibility**: All interactive elements have proper focus states
