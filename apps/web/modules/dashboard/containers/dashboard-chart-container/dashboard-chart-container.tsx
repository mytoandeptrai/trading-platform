'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useDashboardChartContainer } from '../../hooks/use-dashboard-chart-container';
import { Skeleton } from '@repo/ui/components/skeleton';

export function DashboardChartContainer() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { containerRef, isReady } = useDashboardChartContainer(scriptLoaded);

  return (
    <>
      <Script
        src="/static/charting_library/charting_library.standalone.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="afterInteractive"
      />
      <div className="relative h-full w-full">
        <div ref={containerRef} className="h-full w-full" />
        {!isReady && (
          <div className="absolute inset-0 flex flex-col gap-4 bg-[#161616] p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
            <Skeleton className="flex-1" />
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-12" />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
