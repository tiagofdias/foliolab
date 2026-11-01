export interface HistoryPoint {
  date: string;
  value: number;
  net: number;
  return: number;
  drawdown: number;
}
export interface PeriodMetrics {
  start: string;
  end: string;
  startValue: number;
  endValue: number;
  flows: number;
  profit: number;
  return: number;
  drawdown: number;
  drawdowns: { date: string; value: number }[];
  volatility: number;
  sharpe: number | null;
  sortino: number | null;
  annualReturn: number | null;
  var95: number | null;
  best: number | null;
  worst: number | null;
  winRate: number;
  observations: number;
  maxDuration: number;
}
export function previousPoint(points: any[], date?: string): any | null;
export function fxRate(
  fx: Record<string, any[]>,
  from: string,
  to: string,
  date?: string,
): number | null;
export function convertData(
  trades: any[],
  quotes: Record<string, any>,
  fx: Record<string, any[]>,
  base?: string,
): { trades: any[]; quotes: Record<string, any>; missing: string[] };
export function periodMetrics(series: HistoryPoint[]): PeriodMetrics | null;
export function comparisonSeries(
  quote: any,
  dates: string[],
): { date: string; value: number | null }[];
export function monthlyReturns(
  series: HistoryPoint[],
): { month: string; return: number }[];
export function rollingVolatility(
  series: HistoryPoint[],
  window?: number,
): { date: string; value: number | null }[];
export function correlation(a: number[], b: number[]): number | null;
export function correlationMatrix(
  symbols: string[],
  quotes: Record<string, any>,
  start: string,
  end: string,
): { observations: number; values: (number | null)[][] };
export function simulateRules(
  trades: any[],
  quotes: Record<string, any>,
  rules: any[],
  substitute: Function,
): any[];
export function benchmarkMetrics(
  series: HistoryPoint[],
  quote: any,
): {
  beta: number | null;
  correlation: number | null;
  trackingError: number;
  informationRatio: number | null;
  alpha: number | null;
  observations: number;
} | null;
