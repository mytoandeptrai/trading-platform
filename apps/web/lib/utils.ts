export function formatPriceNumber(
  price: number | string | undefined,
  options?: { subscriptZeros?: boolean; maxDecimals?: number }
): string {
  if (price === undefined || price === null || price === '') return '0.00';

  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.00';

  const { subscriptZeros = true, maxDecimals = 8 } = options || {};

  if (subscriptZeros && num > 0 && num < 0.0001) {
    const str = num.toFixed(maxDecimals);
    const match = str.match(/^0\.(0+)([1-9]\d*)$/);

    if (match && match[1] && match[2]) {
      const zeroCount = match[1].length;
      const significantDigits = match[2];
      return `0.0₍${zeroCount}₎${significantDigits.slice(0, 4)}`;
    }
  }

  let decimals = 2;
  if (num >= 1000) decimals = 0;
  else if (num >= 1) decimals = 2;
  else if (num >= 0.01) decimals = 4;
  else decimals = maxDecimals;

  return num.toFixed(decimals);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number, decimals: number = 2): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

export function resolutionToBinanceInterval(resolution: string): string {
  const map: Record<string, string> = {
    '1': '1m',
    '3': '3m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '120': '2h',
    '240': '4h',
    '1D': '1d',
    '1W': '1w',
  };
  return map[resolution] || '1d';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
