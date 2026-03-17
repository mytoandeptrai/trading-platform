import type { OrderSide, OrderType } from '@/types/trading';
import { formatNumber } from '@/lib/utils';
import { PERCENTAGE_OPTIONS } from '@/constants/trading';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';

interface TradingFormProps {
  orderSide: OrderSide;
  orderType: OrderType;
  price: string;
  amount: string;
  total: string;
  availableBalance: number;
  symbol: string;

  onOrderSideChange: (side: OrderSide) => void;
  onOrderTypeChange: (type: OrderType) => void;
  onPriceChange: (price: string) => void;
  onAmountChange: (amount: string) => void;
  onPercentageClick: (percentage: number) => void;
  onSubmit: () => void;

  isSubmitting: boolean;
}

export function TradingForm({
  orderSide,
  orderType,
  price,
  amount,
  total,
  availableBalance,
  symbol,
  onOrderSideChange,
  onOrderTypeChange,
  onPriceChange,
  onAmountChange,
  onPercentageClick,
  onSubmit,
  isSubmitting,
}: TradingFormProps) {
  const baseCurrency = symbol.replace('USDT', '');
  const isValid = amount && (orderType === 'MARKET' || price);

  return (
    <div className="flex h-full flex-col bg-[#161616]">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400">Spot Trading</h3>
        <div className="mt-1 text-xs text-gray-500">{symbol}</div>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="border-b border-gray-800 p-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onOrderSideChange('BUY')}
            variant={orderSide === 'BUY' ? 'success' : 'secondary'}
            className="h-9"
          >
            Buy
          </Button>
          <Button
            onClick={() => onOrderSideChange('SELL')}
            variant={orderSide === 'SELL' ? 'destructive' : 'secondary'}
            className="h-9"
          >
            Sell
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Order Type */}
          <div>
            <Label className="mb-2 text-xs text-gray-400">Order Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onOrderTypeChange('LIMIT')}
                variant={orderType === 'LIMIT' ? 'default' : 'secondary'}
                className="h-9"
              >
                Limit
              </Button>
              <Button
                onClick={() => onOrderTypeChange('MARKET')}
                variant={orderType === 'MARKET' ? 'default' : 'secondary'}
                className="h-9"
              >
                Market
              </Button>
            </div>
          </div>

          {/* Available Balance */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Available</span>
            <span className="text-white">{formatNumber(availableBalance, 2)} USDT</span>
          </div>

          {/* Price Input (Only for LIMIT orders) */}
          {orderType === 'LIMIT' && (
            <div>
              <Label className="mb-2 text-xs text-gray-400">Price</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="border-gray-800 bg-[#0D0D0D] pr-16 text-white placeholder-gray-600 focus:border-[#00A8E8]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  USDT
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <Label className="mb-2 text-xs text-gray-400">Amount</Label>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.00"
                className="border-gray-800 bg-[#0D0D0D] pr-16 text-white placeholder-gray-600 focus:border-[#00A8E8]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {baseCurrency}
              </span>
            </div>
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PERCENTAGE_OPTIONS.map((percentage) => (
              <Button
                key={percentage}
                onClick={() => onPercentageClick(percentage)}
                variant="secondary"
                size="sm"
                className="h-8"
              >
                {percentage}%
              </Button>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Total</span>
            <span className="text-white">{total} USDT</span>
          </div>

          {/* Submit Button */}
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !isValid}
            variant={orderSide === 'BUY' ? 'success' : 'destructive'}
            className="h-12 w-full font-semibold"
          >
            {isSubmitting
              ? 'Placing Order...'
              : orderSide === 'BUY'
              ? `Buy ${baseCurrency}`
              : `Sell ${baseCurrency}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
