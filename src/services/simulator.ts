import type {
  PortfolioActivity,
  MarketQuote,
  SimulationResult,
  SimulationMetrics,
  SubstitutionRule,
} from '../types';

export function runWhatIfSimulation({
  activities,
  rules = [],
  quotes,
  sourceSymbol,
  targetSymbol,
  swapPercentage = 100,
}: {
  activities: PortfolioActivity[];
  rules?: SubstitutionRule[];
  quotes: Record<string, MarketQuote>;
  sourceSymbol?: string;
  targetSymbol?: string;
  swapPercentage?: number;
}): SimulationResult {
  // Normalize rules: if rules array is empty but legacy single-symbol args passed, create a rule
  let activeRules = rules.filter((r) => r.enabled && r.sourceSymbol && r.targetSymbol);
  if (activeRules.length === 0 && sourceSymbol && targetSymbol) {
    activeRules = [
      {
        id: 'default-rule',
        sourceSymbol,
        targetSymbol,
        swapPercentage,
        enabled: true,
      },
    ];
  }

  // Map: sourceSymbol -> SubstitutionRule
  const ruleMap = new Map<string, SubstitutionRule>();
  for (const rule of activeRules) {
    ruleMap.set(rule.sourceSymbol, rule);
  }

  // Build price lookup maps: symbol -> (date -> price)
  const priceMaps: Record<string, Map<string, number>> = {};

  const registerQuote = (symbol: string, q: MarketQuote) => {
    if (!q || !q.history) return;
    const map = new Map<string, number>();
    for (const pt of q.history) {
      map.set(pt.date, pt.price);
    }
    priceMaps[symbol] = map;
  };

  // Register all available quotes
  for (const [sym, q] of Object.entries(quotes)) {
    registerQuote(sym, q);
  }

  // Collect all unique trading dates from quotes sorted chronologically
  const allDateSet = new Set<string>();
  for (const q of Object.values(quotes)) {
    if (q && q.history) {
      q.history.forEach((pt) => allDateSet.add(pt.date));
    }
  }
  const sortedDates = Array.from(allDateSet).sort();

  // Helper to get nearest available price for a symbol on or right before a given date
  const getPriceOnDate = (symbol: string, date: string): number => {
    const map = priceMaps[symbol];
    if (!map) return quotes[symbol]?.currentPrice || 0;
    if (map.has(date)) return map.get(date)!;

    // Search backward for the most recent trading day close
    let idx = sortedDates.indexOf(date);
    if (idx === -1) {
      idx = sortedDates.findIndex((d) => d > date);
      if (idx === -1) idx = sortedDates.length - 1;
      else idx = Math.max(0, idx - 1);
    }
    for (let i = idx; i >= 0; i--) {
      const prevDate = sortedDates[i];
      if (map.has(prevDate)) return map.get(prevDate)!;
    }
    return quotes[symbol]?.currentPrice || 0;
  };

  // Sort activities by date
  const sortedActivities = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedActivities.length === 0) {
    throw new Error('No activities provided for simulation');
  }

  const startDate = sortedActivities[0].date;
  const filteredTimeline = sortedDates.filter((d) => d >= startDate);

  // Track holdings over time
  const baselineHoldings: Record<string, number> = {};
  const whatIfHoldings: Record<string, number> = {};

  let totalCashInvested = 0;
  let swappedOrdersCount = 0;

  let activityIndex = 0;
  const baselineValues: number[] = [];
  const whatIfValues: number[] = [];
  const deltas: number[] = [];

  for (const currentDate of filteredTimeline) {
    // Process all orders executed on or before this date that haven't been applied yet
    while (activityIndex < sortedActivities.length && sortedActivities[activityIndex].date <= currentDate) {
      const act = sortedActivities[activityIndex];
      const sign = act.type === 'BUY' ? 1 : -1;
      const orderCash = act.unitPrice * act.quantity + act.fee;

      if (act.type === 'BUY') {
        totalCashInvested += orderCash;
      }

      // 1. Update Baseline
      baselineHoldings[act.symbol] = (baselineHoldings[act.symbol] || 0) + sign * act.quantity;

      // 2. Update What-If (multi-asset substitution)
      const rule = ruleMap.get(act.symbol);
      if (rule && act.type === 'BUY') {
        swappedOrdersCount++;
        const swapRatio = Math.max(0, Math.min(100, rule.swapPercentage)) / 100;
        const keptRatio = 1 - swapRatio;
        const keptQty = act.quantity * keptRatio;
        const swappedCash = act.unitPrice * act.quantity * swapRatio;

        // Target price on transaction date
        const targetPrice = getPriceOnDate(rule.targetSymbol, act.date) || quotes[rule.targetSymbol]?.currentPrice || 0;
        const targetQty = targetPrice > 0 ? swappedCash / targetPrice : 0;

        if (keptQty > 0) {
          whatIfHoldings[act.symbol] = (whatIfHoldings[act.symbol] || 0) + keptQty;
        }
        whatIfHoldings[rule.targetSymbol] = (whatIfHoldings[rule.targetSymbol] || 0) + targetQty;
      } else {
        whatIfHoldings[act.symbol] = (whatIfHoldings[act.symbol] || 0) + sign * act.quantity;
      }

      activityIndex++;
    }

    // Calculate valuations for this date
    let baseVal = 0;
    for (const [sym, qty] of Object.entries(baselineHoldings)) {
      if (qty > 0) {
        const p = getPriceOnDate(sym, currentDate);
        baseVal += qty * p;
      }
    }

    let whatIfVal = 0;
    for (const [sym, qty] of Object.entries(whatIfHoldings)) {
      if (qty > 0) {
        const p = getPriceOnDate(sym, currentDate);
        whatIfVal += qty * p;
      }
    }

    baselineValues.push(Math.round(baseVal * 100) / 100);
    whatIfValues.push(Math.round(whatIfVal * 100) / 100);
    deltas.push(Math.round((whatIfVal - baseVal) * 100) / 100);
  }

  // Calculate Metrics
  const baselineFinal = baselineValues[baselineValues.length - 1] || 0;
  const whatIfFinal = whatIfValues[whatIfValues.length - 1] || 0;

  const baselineProfit = baselineFinal - totalCashInvested;
  const whatIfProfit = whatIfFinal - totalCashInvested;

  const baselineTotalReturn = totalCashInvested > 0 ? (baselineProfit / totalCashInvested) * 100 : 0;
  const whatIfTotalReturn = totalCashInvested > 0 ? (whatIfProfit / totalCashInvested) * 100 : 0;

  // Max Drawdowns
  const calcMaxDrawdown = (series: number[]) => {
    let peak = -Infinity;
    let maxDd = 0;
    for (const val of series) {
      if (val > peak) peak = val;
      if (peak > 0) {
        const dd = (val - peak) / peak;
        if (dd < maxDd) maxDd = dd;
      }
    }
    return Math.abs(maxDd) * 100;
  };

  const baselineMaxDrawdown = calcMaxDrawdown(baselineValues);
  const whatIfMaxDrawdown = calcMaxDrawdown(whatIfValues);

  // CAGR
  const years = Math.max(0.2, (new Date(filteredTimeline[filteredTimeline.length - 1]).getTime() - new Date(startDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  const calcCAGR = (finalVal: number) => {
    if (totalCashInvested <= 0 || finalVal <= 0) return 0;
    return (Math.pow(finalVal / totalCashInvested, 1 / years) - 1) * 100;
  };

  // Sharpe (annualized with 2% risk-free rate)
  const calcSharpe = (series: number[]) => {
    if (series.length < 5) return 0;
    const dailyReturns: number[] = [];
    for (let i = 1; i < series.length; i++) {
      if (series[i - 1] > 0) {
        dailyReturns.push((series[i] - series[i - 1]) / series[i - 1]);
      }
    }
    if (dailyReturns.length === 0) return 0;
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    const dailyRf = 0.02 / 252;
    return ((mean - dailyRf) / stdDev) * Math.sqrt(252);
  };

  const metrics: SimulationMetrics = {
    baselineInitialInvestment: Math.round(totalCashInvested),
    baselineFinalValue: Math.round(baselineFinal),
    baselineTotalReturn: parseFloat(baselineTotalReturn.toFixed(2)),
    baselineProfit: Math.round(baselineProfit),
    baselineMaxDrawdown: parseFloat(baselineMaxDrawdown.toFixed(2)),
    baselineCAGR: parseFloat(calcCAGR(baselineFinal).toFixed(2)),
    baselineSharpe: parseFloat(calcSharpe(baselineValues).toFixed(2)),

    whatIfFinalValue: Math.round(whatIfFinal),
    whatIfTotalReturn: parseFloat(whatIfTotalReturn.toFixed(2)),
    whatIfProfit: Math.round(whatIfProfit),
    whatIfMaxDrawdown: parseFloat(whatIfMaxDrawdown.toFixed(2)),
    whatIfCAGR: parseFloat(calcCAGR(whatIfFinal).toFixed(2)),
    whatIfSharpe: parseFloat(calcSharpe(whatIfValues).toFixed(2)),

    valueDelta: Math.round(whatIfFinal - baselineFinal),
    profitDeltaPercent: parseFloat((whatIfTotalReturn - baselineTotalReturn).toFixed(2)),
  };

  return {
    rules: activeRules,
    sourceSymbol: activeRules[0]?.sourceSymbol || sourceSymbol || '',
    targetSymbol: activeRules[0]?.targetSymbol || targetSymbol || '',
    swapPercentage: activeRules[0]?.swapPercentage ?? swapPercentage,
    dates: filteredTimeline,
    baselineValues,
    whatIfValues,
    deltas,
    metrics,
    swappedOrdersCount,
  };
}
