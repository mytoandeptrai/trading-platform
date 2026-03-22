export interface ChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ResolutionType = '1' | '3' | '5' | '15' | '30' | '60' | '120' | '240' | '1D' | '1W';

export interface SymbolInfo {
  ticker: string;
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: ResolutionType[];
  volume_precision: number;
  data_status: string;
  format: string;
}

export interface DatafeedConfiguration {
  supported_resolutions: ResolutionType[];
}

export interface PeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
  countBack?: number;
}
