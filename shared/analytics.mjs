// All calculations operate in the selected reporting currency. No future FX
// observation or future market price is ever used for a historical date.
export function previousPoint(points, date) {
  if (!points?.length) return null;
  if (!date) return points.at(-1);
  let lo = 0,
    hi = points.length - 1,
    found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found < 0 ? null : points[found];
}
export function fxRate(fx, from, to, date) {
  const pence = from === "GBp" || from === "GBX";
  if (pence) from = "GBP";
  if (from === to) return pence ? 0.01 : 1;
  const a = from === "EUR" ? 1 : previousPoint(fx?.[from], date)?.rate;
  const b = to === "EUR" ? 1 : previousPoint(fx?.[to], date)?.rate;
  return a > 0 && b > 0 ? (b / a) * (pence ? 0.01 : 1) : null;
}
export function convertData(trades, quotes, fx, base = "EUR") {
  const missing = new Set();
  const convertedTrades = trades.map((t) => {
    const rate = fxRate(fx, t.currency, base, t.date);
    if (rate === null) missing.add(`${t.currency}/${base} on ${t.date}`);
    return {
      ...t,
      currency: base,
      unitPrice: t.unitPrice * (rate ?? NaN),
      fee: t.fee * (rate ?? NaN),
    };
  });
  const convertedQuotes = {};
  for (const [symbol, q] of Object.entries(quotes)) {
    const rate = fxRate(fx, q.currency, base);
    if (rate === null) {
      missing.add(`${q.currency}/${base}`);
      continue;
    }
    convertedQuotes[symbol] = {
      ...q,
      nativeCurrency: q.currency,
      nativePrice: q.currentPrice,
      currency: base,
      currentPrice: q.currentPrice * rate,
      history: q.history.flatMap((p) => {
        const r = fxRate(fx, q.currency, base, p.date);
        return r === null ? [] : [{ ...p, price: p.price * r }];
      }),
    };
  }
  return {
    trades: convertedTrades,
    quotes: convertedQuotes,
    missing: [...missing],
  };
}
export function periodMetrics(series) {
  if (!series.length) return null;
  const first = series[0],
    last = series.at(-1),
    base = 1 + first.return / 100;
  const returns = series.slice(1).map((p, i) => {
    const prev = 1 + series[i].return / 100;
    return prev > 0 ? (1 + p.return / 100) / prev - 1 : 0;
  });
  const mean = returns.length
    ? returns.reduce((s, v) => s + v, 0) / returns.length
    : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (returns.length - 1)
      : 0;
  const span = Math.max(
    1,
    (Date.parse(last.date) - Date.parse(first.date)) / 86400000,
  );
  // Calendar-day annualisation supports mixed stock/crypto calendars without
  // pretending every series has 252 observations per year.
  const annualizer = returns.length ? (returns.length * 365.25) / span : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(annualizer) * 100;
  const downside =
    Math.sqrt(
      returns.reduce((s, v) => s + Math.min(0, v) ** 2, 0) /
        (returns.length || 1),
    ) * Math.sqrt(annualizer);
  const totalReturn = base > 0 ? ((1 + last.return / 100) / base - 1) * 100 : 0;
  let peak = base,
    drawdown = 0,
    peakDate = first.date,
    maxDuration = 0;
  const drawdowns = series.map((p) => {
    const value = 1 + p.return / 100;
    if (value >= peak) {
      peak = value;
      peakDate = p.date;
    }
    const dd = peak > 0 ? (value / peak - 1) * 100 : 0;
    drawdown = Math.min(drawdown, dd);
    maxDuration = Math.max(
      maxDuration,
      (Date.parse(p.date) - Date.parse(peakDate)) / 86400000,
    );
    return { date: p.date, value: dd };
  });
  const sorted = [...returns].sort((a, b) => a - b),
    var95 = sorted.length
      ? sorted[Math.floor((sorted.length - 1) * 0.05)] * 100
      : null;
  const best = returns.length ? Math.max(...returns) * 100 : null,
    worst = returns.length ? Math.min(...returns) * 100 : null;
  return {
    start: first.date,
    end: last.date,
    startValue: first.value,
    endValue: last.value,
    flows: last.net - first.net,
    profit: last.value - first.value - (last.net - first.net),
    return: totalReturn,
    drawdown,
    drawdowns,
    volatility,
    sharpe: volatility > 1e-8 ? (mean * annualizer) / (volatility / 100) : null,
    sortino: downside > 1e-12 ? (mean * annualizer) / downside : null,
    annualReturn:
      span >= 365 && totalReturn > -100
        ? ((1 + totalReturn / 100) ** (365.25 / span) - 1) * 100
        : null,
    var95,
    best,
    worst,
    winRate: returns.length
      ? (returns.filter((v) => v > 0).length / returns.length) * 100
      : 0,
    observations: returns.length,
    maxDuration,
  };
}
export function comparisonSeries(quote, dates) {
  if (!quote?.history?.length || !dates.length) return [];
  const first = previousPoint(quote.history, dates[0]);
  if (!first) return [];
  return dates.map((date) => {
    const p = previousPoint(quote.history, date);
    return { date, value: p ? (100 * p.price) / first.price : null };
  });
}
export function monthlyReturns(series) {
  const groups = new Map();
  let previous = 100;
  for (const p of series) {
    const key = p.date.slice(0, 7);
    const group = groups.get(key) || {
      key,
      start: previous,
      end: previous,
      flows: 0,
      profit: 0,
    };
    group.end = 100 + p.return;
    groups.set(key, group);
    previous = 100 + p.return;
  }
  return [...groups.values()].map((g) => ({
    month: g.key,
    return: g.start > 0 ? (g.end / g.start - 1) * 100 : 0,
  }));
}
export function rollingVolatility(series, window = 30) {
  return series.map((p, i) => {
    if (i < window) return { date: p.date, value: null };
    const sample = series.slice(i - window, i + 1);
    return { date: p.date, value: periodMetrics(sample).volatility };
  });
}
export function correlation(a, b) {
  if (a.length !== b.length || a.length < 3) return null;
  const ma = a.reduce((s, v) => s + v, 0) / a.length,
    mb = b.reduce((s, v) => s + v, 0) / b.length;
  let covariance = 0,
    va = 0,
    vb = 0;
  for (let i = 0; i < a.length; i++) {
    covariance += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return va > 0 && vb > 0 ? covariance / Math.sqrt(va * vb) : null;
}
export function correlationMatrix(symbols, quotes, start, end) {
  const dates = [
    ...new Set(
      symbols.flatMap((s) => (quotes[s]?.history || []).map((p) => p.date)),
    ),
  ]
    .filter((d) => d >= start && d <= end)
    .sort();
  const maps = Object.fromEntries(
    symbols.map((s) => [
      s,
      new Map((quotes[s]?.history || []).map((p) => [p.date, p.price])),
    ]),
  );
  const common = dates.filter((d) => symbols.every((s) => maps[s].has(d)));
  const returns = Object.fromEntries(
    symbols.map((s) => [
      s,
      common
        .slice(1)
        .map((d, i) => maps[s].get(d) / maps[s].get(common[i]) - 1),
    ]),
  );
  return {
    observations: Math.max(0, common.length - 1),
    values: symbols.map((a) =>
      symbols.map((b) => correlation(returns[a], returns[b])),
    ),
  };
}
export function simulateRules(trades, quotes, rules, substitute) {
  const active = rules.filter((r) => r.enabled);
  for (const rule of active) {
    if (!trades.some((t) => t.symbol === rule.sourceSymbol))
      throw Error(
        `The source ${rule.sourceSymbol} is not in this portfolio scope.`,
      );
    if (
      !/^[A-Z0-9.^=-]{1,24}$/.test(rule.targetSymbol) ||
      !Number.isFinite(rule.swapPercentage) ||
      rule.swapPercentage < 0 ||
      rule.swapPercentage > 100
    )
      throw Error(
        "Every rule needs a valid target and a percentage from 0 to 100.",
      );
  }
  if (new Set(active.map((r) => r.sourceSymbol)).size !== active.length)
    throw Error("Use one rule per source asset.");
  const output = [];
  // Group by original source, so A→B and B→C rules never cascade.
  for (const symbol of new Set(trades.map((t) => t.symbol))) {
    const group = trades.filter((t) => t.symbol === symbol),
      rule = active.find((r) => r.sourceSymbol === symbol);
    if (!rule) {
      output.push(...group);
      continue;
    }
    const changed = substitute(
      group,
      quotes,
      symbol,
      rule.targetSymbol,
      rule.swapPercentage,
    );
    if (!changed)
      throw Error(`Missing historical prices for ${rule.targetSymbol}.`);
    output.push(...changed);
  }
  return output;
}
export function benchmarkMetrics(series, quote) {
  const comparison = comparisonSeries(
    quote,
    series.map((p) => p.date),
  );
  if (comparison.length !== series.length || series.length < 4) return null;
  const p = [],
    b = [];
  for (let i = 1; i < series.length; i++) {
    const pa = 100 + series[i - 1].return,
      pb = 100 + series[i].return,
      ba = comparison[i - 1].value,
      bb = comparison[i].value;
    if (pa > 0 && ba > 0 && bb !== null) {
      p.push(pb / pa - 1);
      b.push(bb / ba - 1);
    }
  }
  if (p.length < 3) return null;
  const mp = p.reduce((s, v) => s + v, 0) / p.length,
    mb = b.reduce((s, v) => s + v, 0) / b.length;
  const covariance =
      p.reduce((s, v, i) => s + (v - mp) * (b[i] - mb), 0) / (p.length - 1),
    vb = b.reduce((s, v) => s + (v - mb) ** 2, 0) / (b.length - 1);
  const beta = vb > 0 ? covariance / vb : null;
  const excess = p.map((v, i) => v - b[i]),
    mean = mp - mb,
    variance =
      excess.reduce((s, v) => s + (v - mean) ** 2, 0) / (excess.length - 1);
  const span = Math.max(
      1,
      (Date.parse(series.at(-1).date) - Date.parse(series[0].date)) / 86400000,
    ),
    freq = (p.length * 365.25) / span;
  const trackingError = Math.sqrt(variance * freq) * 100;
  return {
    beta,
    correlation: correlation(p, b),
    trackingError,
    informationRatio:
      trackingError > 0 ? (mean * freq) / (trackingError / 100) : null,
    alpha: beta === null ? null : (mp - beta * mb) * freq * 100,
    observations: p.length,
  };
}
