export interface Portfolio {
  id: string;
  name: string;
  color: string;
  currency: string;
  description?: string;
  createdAt: string;
}

export interface PortfolioActivity {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  unitPrice: number;
  fee: number;
  currency: string;
  portfolioId?: string;
  account?: string;
  comment?: string;
}

export interface MarketHistoryPoint {
  date: string;
  timestamp: number;
  price: number;
}

export interface MarketQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  currency: string;
  currentPrice: number;
  history: MarketHistoryPoint[];
}

export interface SimulationMetrics {
  baselineInitialInvestment: number;
  baselineFinalValue: number;
  baselineTotalReturn: number; // percentage
  baselineProfit: number;
  baselineMaxDrawdown: number; // percentage
  baselineCAGR: number; // percentage
  baselineSharpe: number;

  whatIfFinalValue: number;
  whatIfTotalReturn: number; // percentage
  whatIfProfit: number;
  whatIfMaxDrawdown: number; // percentage
  whatIfCAGR: number; // percentage
  whatIfSharpe: number;

  valueDelta: number; // whatIf - baseline
  profitDeltaPercent: number;
}

export interface SubstitutionRule {
  id: string;
  sourceSymbol: string;
  targetSymbol: string;
  swapPercentage: number;
  enabled: boolean;
}

export interface SimulationResult {
  rules: SubstitutionRule[];
  sourceSymbol: string;
  targetSymbol: string;
  swapPercentage: number;
  dates: string[];
  baselineValues: number[];
  whatIfValues: number[];
  deltas: number[];
  metrics: SimulationMetrics;
  swappedOrdersCount: number;
}

export interface CustomWindowSelection {
  startDate: string;
  endDate: string;
}

export interface DisplayMetrics {
  isPeriod: boolean;
  periodLabel: string;
  startDate: string;
  endDate: string;
  days: number;

  whatIfStartValue: number;
  whatIfEndValue: number;
  whatIfProfit: number;
  whatIfReturnPercent: number;
  whatIfMaxDrawdown: number;

  baseStartValue: number;
  baseEndValue: number;
  baseProfit: number;
  baseReturnPercent: number;
  baseMaxDrawdown: number;

  profitDelta: number;
  returnDeltaPercent: number;
  endValueDelta: number;
  cagr: number;
  sharpe: number;
  baseSharpe: number;
}

// Statistical Information Types
export interface MonthlyReturnCell {
  month: number; // 0 to 11
  returnPercent: number;
  startValue: number;
  endValue: number;
  profit: number;
}

export interface YearReturnRow {
  year: number;
  months: (MonthlyReturnCell | null)[]; // 12 elements (Jan-Dec)
  totalReturnPercent: number;
  totalProfit: number;
}

export interface PortfolioStatsData {
  // Returns
  totalReturnPercent: number;
  totalProfit: number;
  initialInvestment: number;
  currentValue: number;
  cagr: number;
  ytdReturnPercent: number;
  oneYearReturnPercent: number;
  bestDay: { date: string; returnPercent: number };
  worstDay: { date: string; returnPercent: number };
  winRateDaysPercent: number; // % of positive trading days
  positiveDaysCount: number;
  negativeDaysCount: number;
  totalTradingDays: number;
  avgDailyGainPercent: number;
  avgDailyLossPercent: number;
  profitFactor: number;

  // Risk & Volatility
  annualizedVolatility: number; // standard deviation
  downsideDeviation: number;
  maxDrawdown: number;
  currentDrawdown: number;
  allTimeHigh: number;
  allTimeHighDate: string;
  var95Daily: number; // Value at Risk 95%
  cvar95Daily: number; // Conditional VaR / Expected Shortfall
  maxDrawdownDurationDays: number;

  // Ratios (Annualized)
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  treynorRatio: number;
  beta: number; // vs S&P 500 (VOO)
  alpha: number; // vs S&P 500 (VOO)
  rSquared: number;
  correlationToBenchmark: number;

  // Concentration & Diversification
  hhiScore: number; // Herfindahl-Hirschman Index (0 - 10000)
  hhiRating: 'Well Diversified' | 'Moderately Concentrated' | 'Highly Concentrated';
  top1Weight: number;
  top3Weight: number;
  top5Weight: number;
  effectiveHoldingsCount: number;

  // Timeline series for visual charts
  timelineDates: string[];
  portfolioValues: number[];
  drawdownSeries: number[]; // e.g. -2.5% on each day
  benchmarkValues: number[];

  // Monthly / Annual Heatmap
  monthlyMatrix: YearReturnRow[];
}
