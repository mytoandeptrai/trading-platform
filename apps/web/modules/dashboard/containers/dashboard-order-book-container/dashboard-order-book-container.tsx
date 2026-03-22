'use client';

import { OrderBook } from '@/components/order-book';
import { useDashboardOrderBookContainer } from '../../hooks/use-dashboard-order-book-container';
import { Skeleton } from '@repo/ui/components/skeleton';

export function DashboardOrderBookContainer() {
  const { symbol, orderBook, ticker, isLoading } = useDashboardOrderBookContainer();

  if (isLoading || !orderBook || !ticker) {
    return (
      <div className="flex h-full flex-col bg-[#161616] p-4">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <OrderBook
      symbol={symbol}
      bids={orderBook.bids}
      asks={orderBook.asks}
      currentPrice={parseFloat(ticker.lastPrice)}
      changePercent={parseFloat(ticker.priceChangePercent)}
    />
  );
}
