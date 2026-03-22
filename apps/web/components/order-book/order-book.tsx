'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { OrderBookLevel } from '@/types/trading';
import { formatPriceNumber, formatNumber, cn } from '@/lib/utils';

interface OrderBookProps {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentPrice: number;
  changePercent: number;
}

export function OrderBook({ symbol, bids, asks, currentPrice, changePercent }: OrderBookProps) {
  const asksParentRef = useRef<HTMLDivElement>(null);
  const bidsParentRef = useRef<HTMLDivElement>(null);

  const maxTotal = Math.max(
    bids[0]?.total || 0,
    asks[asks.length - 1]?.total || 0
  );

  const getBarWidth = (total: number) => {
    if (maxTotal === 0) return 0;
    return (total / maxTotal) * 100;
  };

  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : 0;
  const spreadPercent = currentPrice ? (spread / currentPrice) * 100 : 0;

  // Virtualize asks list
  const asksVirtualizer = useVirtualizer({
    count: asks.length,
    getScrollElement: () => asksParentRef.current,
    estimateSize: () => 28, // Row height in pixels
    overscan: 5, // Render 5 extra items above and below viewport
  });

  // Virtualize bids list
  const bidsVirtualizer = useVirtualizer({
    count: bids.length,
    getScrollElement: () => bidsParentRef.current,
    estimateSize: () => 28, // Row height in pixels
    overscan: 5,
  });

  return (
    <div className="flex h-full flex-col bg-[#161616] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">Order Book</h3>
          <div className="text-xs text-gray-500">{symbol}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{formatPriceNumber(currentPrice)}</div>
          <div
            className={cn(
              'text-sm font-medium',
              changePercent >= 0 ? 'text-[#00C087]' : 'text-[#F6465D]'
            )}
          >
            {changePercent >= 0 ? '+' : ''}
            {changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 border-b border-gray-800 px-4 py-2 text-xs text-gray-400">
        <div className="text-left">Price</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Asks - Virtualized */}
          <div ref={asksParentRef} className="flex-1 overflow-y-auto">
            <div
              className="relative flex flex-col-reverse"
              style={{
                height: `${asksVirtualizer.getTotalSize()}px`,
              }}
            >
              {asksVirtualizer.getVirtualItems().map((virtualItem) => {
                const ask = asks[virtualItem.index];
                if (!ask) return null;

                return (
                  <div
                    key={virtualItem.key}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="relative grid grid-cols-3 px-4 py-1 text-xs hover:bg-gray-800/50">
                      <div
                        className="absolute right-0 top-0 h-full bg-[#F6465D]/10"
                        style={{ width: `${getBarWidth(ask.total)}%` }}
                      />
                      <div className="relative text-left text-[#F6465D]">
                        {formatPriceNumber(ask.price)}
                      </div>
                      <div className="relative text-right text-gray-300">
                        {formatNumber(ask.amount, 4)}
                      </div>
                      <div className="relative text-right text-gray-400">
                        {formatNumber(ask.total, 4)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spread */}
          <div className="border-y border-gray-800 bg-[#0D0D0D] px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Spread</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{formatPriceNumber(spread)}</span>
                <span className="text-gray-400">
                  ({spreadPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Bids - Virtualized */}
          <div ref={bidsParentRef} className="flex-1 overflow-y-auto">
            <div
              className="relative"
              style={{
                height: `${bidsVirtualizer.getTotalSize()}px`,
              }}
            >
              {bidsVirtualizer.getVirtualItems().map((virtualItem) => {
                const bid = bids[virtualItem.index];
                if (!bid) return null;

                return (
                  <div
                    key={virtualItem.key}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="relative grid grid-cols-3 px-4 py-1 text-xs hover:bg-gray-800/50">
                      <div
                        className="absolute right-0 top-0 h-full bg-[#00C087]/10"
                        style={{ width: `${getBarWidth(bid.total)}%` }}
                      />
                      <div className="relative text-left text-[#00C087]">
                        {formatPriceNumber(bid.price)}
                      </div>
                      <div className="relative text-right text-gray-300">
                        {formatNumber(bid.amount, 4)}
                      </div>
                      <div className="relative text-right text-gray-400">
                        {formatNumber(bid.total, 4)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
