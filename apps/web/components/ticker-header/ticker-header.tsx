import Link from 'next/link';
import type { Ticker } from '@/apis/markets';
import { formatPriceNumber, formatNumber, cn } from '@/lib/utils';
import { Skeleton } from '@repo/ui/components/skeleton';

interface TickerHeaderProps {
  ticker: Ticker | null;
  isLoading: boolean;
}

export function TickerHeader({ ticker, isLoading }: TickerHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-800 bg-[#0D0D0D] px-6 py-3 text-white">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-[#00A8E8]">
          TradingPlatform
        </Link>

        {!isLoading && ticker && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{ticker.pairName}</span>
            </div>

            <div className="flex flex-col">
              <div className="text-xl font-bold">{formatPriceNumber(ticker.lastPrice)}</div>
              <div
                className={cn(
                  'text-sm',
                  parseFloat(ticker.priceChangePercent) >= 0 ? 'text-[#00C087]' : 'text-[#F6465D]'
                )}
              >
                {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}
                {parseFloat(ticker.priceChangePercent ?? '0').toFixed(2)}%
              </div>
            </div>

            <div className="flex gap-4 text-xs">
              <div className="flex flex-col">
                <span className="text-gray-400">24h High</span>
                <span className="text-white">{formatPriceNumber(ticker.highPrice)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">24h Low</span>
                <span className="text-white">{formatPriceNumber(ticker.lowPrice)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">24h Volume</span>
                <span className="text-white">{formatNumber(ticker.volume, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-6">
            <Skeleton className="h-6 w-24" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            Trade
          </Link>
          <Link
            href="/portfolio"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            Portfolio
          </Link>
          <Link
            href="/orders"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            Orders
          </Link>
        </nav>
      </div>
    </header>
  );
}
