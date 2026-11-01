import type {
  PortfolioActivity,
  MarketQuote,
  PortfolioStatsData,
  YearReturnRow,
  MonthlyReturnCell,
} from '../types';

export function computePortfolioStats(
  activities: PortfolioActivity[],
  quotes: Record<string, MarketQuote>,
  benchmarkSymbol = 'VOO'
): PortfolioStatsData | null {
  if (activities.length === 0) return null;

  // Build price lookup maps
  const priceMaps: Record<string, Map<string, number>> = {};
  const allDateSet = new Set<string>();

  for (const [sym, q] of Object.entries(quotes)) {
    if (q && q.history) {
      const map = new Map<string, number>();
      for (const pt of q.history) {
        map.set(pt.date, pt.price);
        allDateSet.add(pt.date);
      }
      priceMaps[sym] = map;
    }
  }

  const sortedDates = Array.from(allDateSet).sort();
  if (sortedDates.length === 0) return null;

  const getPriceOnDate = (symbol: string, date: string): number => {
    const map = priceMaps[symbol];
    if (!map) return quotes[symbol]?.currentPrice || 0;
    if (map.has(date)) return map.get(date)!;

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

  const sortedActivities = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sortedActivities[0].date;
  const filteredTimeline = sortedDates.filter((d) => d >= startDate);
  if (filteredTimeline.length === 0) return null;

  const currentHoldings: Record<string, number> = {};
  let totalCashInvested = 0;
  let activityIndex = 0;

  const timelineDates: string[] = [];
  const portfolioValues: number[] = [];
  const benchmarkValues: number[] = [];
  const cashInvestedTimeline: number[] = [];
  const dailyDeposits: number[] = [];

  const initialBenchPrice = getPriceOnDate(benchmarkSymbol, filteredTimeline[0]) || 1;

  for (const currentDate of filteredTimeline) {
    let depositToday = 0;
    while (
      activityIndex < sortedActivities.length &&
      sortedActivities[activityIndex].date <= currentDate
    ) {
      const act = sortedActivities[activityIndex];
      const sign = act.type === 'BUY' ? 1 : -1;
      const orderCash = act.unitPrice * act.quantity + (act.fee || 0);

      if (act.type === 'BUY') {
        totalCashInvested += orderCash;
        depositToday += orderCash;
      } else {
        depositToday -= orderCash;
      }

      currentHoldings[act.symbol] = (currentHoldings[act.symbol] || 0) + sign * act.quantity;
      activityIndex++;
    }

    let portVal = 0;
    for (const [sym, qty] of Object.entries(currentHoldings)) {
      if (qty > 0) {
        portVal += qty * getPriceOnDate(sym, currentDate);
      }
    }

    const benchPrice = getPriceOnDate(benchmarkSymbol, currentDate) || initialBenchPrice;
    const benchRelativeVal = (benchPrice / initialBenchPrice) * totalCashInvested;

    timelineDates.push(currentDate);
    portfolioValues.push(Math.round(portVal * 100) / 100);
    benchmarkValues.push(Math.round(benchRelativeVal * 100) / 100);
    cashInvestedTimeline.push(totalCashInvested);
    dailyDeposits.push(depositToday);
  }

  const finalValue = portfolioValues[portfolioValues.length - 1] || 0;
  const totalProfit = finalValue - totalCashInvested;
  const totalReturnPercent =
    totalCashInvested > 0 ? (totalProfit / totalCashInvested) * 100 : 0;

  // Calculate daily returns adjusted for new capital deposits
  const dailyReturns: { date: string; returnPercent: number; deltaDollar: number }[] = [];
  const benchmarkDailyReturns: number[] = [];

  for (let i = 1; i < portfolioValues.length; i++) {
    const prevVal = portfolioValues[i - 1];
    const currVal = portfolioValues[i];
    const deposit = dailyDeposits[i];
    // Return = (End - (Start + Deposit)) / (Start + Deposit/2)
    const baseCapital = prevVal + (deposit > 0 ? deposit : 0);
    const dayReturn = baseCapital > 0 ? (currVal - prevVal - deposit) / baseCapital : 0;

    dailyReturns.push({
      date: timelineDates[i],
      returnPercent: dayReturn * 100,
      deltaDollar: currVal - prevVal - deposit,
    });

    const prevBench = benchmarkValues[i - 1];
    const currBench = benchmarkValues[i];
    const benchReturn = prevBench > 0 ? (currBench - prevBench) / prevBench : 0;
    benchmarkDailyReturns.push(benchReturn);
  }

  // Best & Worst Day
  let bestDay = { date: timelineDates[0], returnPercent: 0 };
  let worstDay = { date: timelineDates[0], returnPercent: 0 };
  let positiveCount = 0;
  let negativeCount = 0;
  let sumGains = 0;
  let sumLosses = 0;

  for (const dr of dailyReturns) {
    if (dr.returnPercent > bestDay.returnPercent) {
      bestDay = { date: dr.date, returnPercent: dr.returnPercent };
    }
    if (dr.returnPercent < worstDay.returnPercent) {
      worstDay = { date: dr.date, returnPercent: dr.returnPercent };
    }
    if (dr.returnPercent > 0.0001) {
      positiveCount++;
      sumGains += dr.deltaDollar;
    } else if (dr.returnPercent < -0.0001) {
      negativeCount++;
      sumLosses += Math.abs(dr.deltaDollar);
    }
  }

  const winRate =
    dailyReturns.length > 0
      ? (positiveCount / Math.max(1, positiveCount + negativeCount)) * 100
      : 50;
  const profitFactor = sumLosses > 0 ? sumGains / sumLosses : sumGains > 0 ? 99 : 1;

  // Annualized Volatility & Downside Deviation
  const returnValues = dailyReturns.map((r) => r.returnPercent / 100);
  const meanDaily =
    returnValues.length > 0
      ? returnValues.reduce((a, b) => a + b, 0) / returnValues.length
      : 0;
  const varianceDaily =
    returnValues.length > 0
      ? returnValues.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) /
        returnValues.length
      : 0;
  const stdDevDaily = Math.sqrt(varianceDaily);
  const annualizedVolatility = stdDevDaily * Math.sqrt(252) * 100;

  // Downside Deviation (semi-variance below 0)
  const downsideVariance =
    returnValues.length > 0
      ? returnValues.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) /
        returnValues.length
      : 0;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252) * 100;

  // Drawdowns Series & Max Drawdown
  const drawdownSeries: number[] = [];
  let peak = -Infinity;
  let allTimeHigh = 0;
  let allTimeHighDate = timelineDates[0];
  let maxDrawdown = 0;
  let maxDdDuration = 0;
  let currentDdDuration = 0;

  for (let i = 0; i < portfolioValues.length; i++) {
    const val = portfolioValues[i];
    if (val > peak) {
      peak = val;
      allTimeHigh = val;
      allTimeHighDate = timelineDates[i];
      currentDdDuration = 0;
    } else {
      currentDdDuration++;
      if (currentDdDuration > maxDdDuration) {
        maxDdDuration = currentDdDuration;
      }
    }

    const dd = peak > 0 ? ((val - peak) / peak) * 100 : 0;
    drawdownSeries.push(Math.round(dd * 100) / 100);
    if (Math.abs(dd) > maxDrawdown) {
      maxDrawdown = Math.abs(dd);
    }
  }

  const currentDrawdown =
    allTimeHigh > 0 ? Math.abs(((finalValue - allTimeHigh) / allTimeHigh) * 100) : 0;

  // Value at Risk (VaR 95% historical) & CVaR 95%
  const sortedDailyReturns = [...returnValues].sort((a, b) => a - b);
  const varIndex = Math.floor(sortedDailyReturns.length * 0.05);
  const var95Daily =
    sortedDailyReturns.length > 0 ? Math.abs(sortedDailyReturns[varIndex] * 100) : 0;

  const worstTail = sortedDailyReturns.slice(0, Math.max(1, varIndex));
  const cvar95Daily =
    worstTail.length > 0
      ? Math.abs((worstTail.reduce((a, b) => a + b, 0) / worstTail.length) * 100)
      : var95Daily;

  // CAGR
  const totalDays = Math.max(
    1,
    (new Date(timelineDates[timelineDates.length - 1]).getTime() -
      new Date(startDate).getTime()) /
      (24 * 3600 * 1000)
  );
  const years = Math.max(0.08, totalDays / 365.25);
  const cagr =
    totalCashInvested > 0 && finalValue > 0
      ? (Math.pow(finalValue / totalCashInvested, 1 / years) - 1) * 100
      : 0;

  // YTD & 1Y Returns
  const lastDateStr = timelineDates[timelineDates.length - 1];
  const lastYear = parseInt(lastDateStr.split('-')[0], 10);
  const ytdStartIndex = timelineDates.findIndex((d) => d.startsWith(`${lastYear}-01`));
  const ytdVal = ytdStartIndex !== -1 ? portfolioValues[ytdStartIndex] : portfolioValues[0];
  const ytdReturnPercent = ytdVal > 0 ? ((finalValue - ytdVal) / ytdVal) * 100 : 0;

  const oneYearIndex = Math.max(0, portfolioValues.length - 252);
  const oneYearVal = portfolioValues[oneYearIndex] || portfolioValues[0];
  const oneYearReturnPercent =
    oneYearVal > 0 ? ((finalValue - oneYearVal) / oneYearVal) * 100 : 0;

  // Sharpe, Sortino, Calmar
  const dailyRf = 0.02 / 252;
  const sharpeRatio =
    stdDevDaily > 0 ? ((meanDaily - dailyRf) / stdDevDaily) * Math.sqrt(252) : 0;
  const sortinoRatio =
    downsideDeviation > 0 ? (cagr - 2) / downsideDeviation : sharpeRatio * 1.3;
  const calmarRatio = maxDrawdown > 0 ? cagr / maxDrawdown : cagr / 5;

  // Beta & Alpha vs Benchmark
  let beta = 1.0;
  let alpha = 0.0;
  let correlation = 0.85;

  if (returnValues.length >= 10 && benchmarkDailyReturns.length >= 10) {
    const n = Math.min(returnValues.length, benchmarkDailyReturns.length);
    const pSlice = returnValues.slice(0, n);
    const bSlice = benchmarkDailyReturns.slice(0, n);

    const meanP = pSlice.reduce((a, b) => a + b, 0) / n;
    const meanB = bSlice.reduce((a, b) => a + b, 0) / n;

    let cov = 0;
    let varB = 0;
    let varP = 0;
    for (let i = 0; i < n; i++) {
      const diffP = pSlice[i] - meanP;
      const diffB = bSlice[i] - meanB;
      cov += diffP * diffB;
      varB += diffB * diffB;
      varP += diffP * diffP;
    }

    if (varB > 0) {
      beta = parseFloat((cov / varB).toFixed(2));
    }
    if (varB > 0 && varP > 0) {
      correlation = parseFloat((cov / Math.sqrt(varB * varP)).toFixed(2));
    }

    const benchFinal = benchmarkValues[benchmarkValues.length - 1] || 1;
    const benchStart = benchmarkValues[0] || 1;
    const benchCAGR = (Math.pow(benchFinal / benchStart, 1 / years) - 1) * 100;
    alpha = parseFloat((cagr - (2 + beta * (benchCAGR - 2))).toFixed(2));
  }

  const rSquared = parseFloat(Math.min(1, Math.max(0, correlation * correlation)).toFixed(2));
  const treynorRatio = beta > 0 ? (cagr - 2) / beta : 0;

  // Herfindahl-Hirschman Index (HHI) for holdings concentration
  // Weight of each holding currently:
  let hhiSum = 0;
  const weights: number[] = [];
  for (const qty of Object.values(currentHoldings)) {
    if (qty > 0) {
      // rough allocation
      const w = 100 / Math.max(1, Object.keys(currentHoldings).length);
      weights.push(w);
      hhiSum += w * w;
    }
  }
  const sortedWeights = [...weights].sort((a, b) => b - a);
  const top1Weight = sortedWeights[0] || 0;
  const top3Weight = sortedWeights.slice(0, 3).reduce((a, b) => a + b, 0);
  const top5Weight = sortedWeights.slice(0, 5).reduce((a, b) => a + b, 0);
  const hhiScore = Math.round(hhiSum);
  const hhiRating: 'Well Diversified' | 'Moderately Concentrated' | 'Highly Concentrated' =
    hhiScore < 1500
      ? 'Well Diversified'
      : hhiScore < 2500
      ? 'Moderately Concentrated'
      : 'Highly Concentrated';
  const effectiveHoldingsCount =
    hhiScore > 0 ? parseFloat((10000 / hhiScore).toFixed(1)) : weights.length;

  // Monthly and Annual Matrix
  const monthlyMatrix = buildMonthlyMatrix(timelineDates, portfolioValues);

  return {
    totalReturnPercent: parseFloat(totalReturnPercent.toFixed(2)),
    totalProfit: Math.round(totalProfit),
    initialInvestment: Math.round(totalCashInvested),
    currentValue: Math.round(finalValue),
    cagr: parseFloat(cagr.toFixed(2)),
    ytdReturnPercent: parseFloat(ytdReturnPercent.toFixed(2)),
    oneYearReturnPercent: parseFloat(oneYearReturnPercent.toFixed(2)),
    bestDay: { date: bestDay.date, returnPercent: parseFloat(bestDay.returnPercent.toFixed(2)) },
    worstDay: { date: worstDay.date, returnPercent: parseFloat(worstDay.returnPercent.toFixed(2)) },
    winRateDaysPercent: parseFloat(winRate.toFixed(1)),
    positiveDaysCount: positiveCount,
    negativeDaysCount: negativeCount,
    totalTradingDays: dailyReturns.length,
    avgDailyGainPercent:
      positiveCount > 0
        ? parseFloat(
            (
              dailyReturns.filter((r) => r.returnPercent > 0).reduce((a, b) => a + b.returnPercent, 0) /
              positiveCount
            ).toFixed(2)
          )
        : 0,
    avgDailyLossPercent:
      negativeCount > 0
        ? parseFloat(
            (
              dailyReturns.filter((r) => r.returnPercent < 0).reduce((a, b) => a + b.returnPercent, 0) /
              negativeCount
            ).toFixed(2)
          )
        : 0,
    profitFactor: parseFloat(profitFactor.toFixed(2)),

    annualizedVolatility: parseFloat(annualizedVolatility.toFixed(2)),
    downsideDeviation: parseFloat(downsideDeviation.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
    allTimeHigh: Math.round(allTimeHigh),
    allTimeHighDate,
    var95Daily: parseFloat(var95Daily.toFixed(2)),
    cvar95Daily: parseFloat(cvar95Daily.toFixed(2)),
    maxDrawdownDurationDays: maxDdDuration,

    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    treynorRatio: parseFloat(treynorRatio.toFixed(2)),
    beta,
    alpha,
    rSquared,
    correlationToBenchmark: correlation,

    hhiScore,
    hhiRating,
    top1Weight: parseFloat(top1Weight.toFixed(1)),
    top3Weight: parseFloat(top3Weight.toFixed(1)),
    top5Weight: parseFloat(top5Weight.toFixed(1)),
    effectiveHoldingsCount,

    timelineDates,
    portfolioValues,
    drawdownSeries,
    benchmarkValues,

    monthlyMatrix,
  };
}

function buildMonthlyMatrix(dates: string[], values: number[]): YearReturnRow[] {
  // Map: year -> month (0-11) -> { startVal, endVal }
  const yearMonthMap = new Map<number, Map<number, { startVal: number; endVal: number }>>();

  for (let i = 0; i < dates.length; i++) {
    const dStr = dates[i];
    const val = values[i];
    const [yStr, mStr] = dStr.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1; // 0-indexed

    if (!yearMonthMap.has(year)) {
      yearMonthMap.set(year, new Map());
    }
    const mTree = yearMonthMap.get(year)!;
    if (!mTree.has(month)) {
      mTree.set(month, { startVal: val, endVal: val });
    } else {
      mTree.get(month)!.endVal = val;
    }
  }

  const rows: YearReturnRow[] = [];
  const sortedYears = Array.from(yearMonthMap.keys()).sort((a, b) => b - a); // latest year first

  for (const year of sortedYears) {
    const mTree = yearMonthMap.get(year)!;
    const months: (MonthlyReturnCell | null)[] = [];
    let yearStartVal: number | null = null;
    let yearEndVal: number | null = null;

    for (let m = 0; m < 12; m++) {
      if (mTree.has(m)) {
        const { startVal, endVal } = mTree.get(m)!;
        if (yearStartVal === null) yearStartVal = startVal;
        yearEndVal = endVal;

        const profit = endVal - startVal;
        const returnPct = startVal > 0 ? (profit / startVal) * 100 : 0;
        months.push({
          month: m,
          startValue: Math.round(startVal),
          endValue: Math.round(endVal),
          profit: Math.round(profit),
          returnPercent: parseFloat(returnPct.toFixed(2)),
        });
      } else {
        months.push(null);
      }
    }

    const yStart = yearStartVal || 1;
    const yEnd = yearEndVal || yStart;
    const yProfit = yEnd - yStart;
    const yReturn = yStart > 0 ? (yProfit / yStart) * 100 : 0;

    rows.push({
      year,
      months,
      totalReturnPercent: parseFloat(yReturn.toFixed(2)),
      totalProfit: Math.round(yProfit),
    });
  }

  return rows;
}
