'use client';

import Script from 'next/script';
import { useState } from 'react';
import { useDashboardChartContainer } from '../../hooks/use-dashboard-chart-container';

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
      </div>
    </>
  );
}
