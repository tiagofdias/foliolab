import { CURRENCIES } from "./markets.mjs";
export function validateTrades(trades, portfolios) {
  const balances = new Map();
  for (const t of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!portfolios.some((p) => p.id === t.portfolioId))
      throw Error("Select an existing portfolio.");
    if (
      typeof t.id !== "string" ||
      !t.id ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      t.name.length > 200
    )
      throw Error("Each transaction needs an ID and asset name.");
    if (
      !/^[A-Z0-9.^=-]{1,24}$/.test(t.symbol) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(t.date) ||
      !Number.isFinite(Date.parse(t.date)) ||
      new Date(t.date).toISOString().slice(0, 10) !== t.date ||
      t.date > new Date().toISOString().slice(0, 10)
    )
      throw Error("Check the symbol and date.");
    if (!CURRENCIES.includes(t.currency))
      throw Error("Choose a supported transaction currency.");
    if (
      !["BUY", "SELL"].includes(t.type) ||
      ![t.quantity, t.unitPrice, t.fee].every(Number.isFinite) ||
      t.quantity <= 0 ||
      t.unitPrice <= 0 ||
      t.fee < 0
    )
      throw Error("Enter positive quantity and price, and nonnegative fees.");
    const key = `${t.portfolioId}:${t.symbol}`,
      q =
        (balances.get(key) || 0) +
        (t.type === "BUY" ? t.quantity : -t.quantity);
    if (q < -1e-8) throw Error(`Insufficient ${t.symbol} on ${t.date}.`);
    balances.set(key, q);
  }
}
export function validateWorkspace(data) {
  if (
    !data ||
    !Array.isArray(data.portfolios) ||
    !Array.isArray(data.trades) ||
    data.portfolios.length > 100 ||
    data.trades.length > 10000
  )
    throw Error("Invalid workspace.");
  if (
    data.portfolios.some(
      (p) =>
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        p.id.length > 120 ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 100,
    ) ||
    new Set(data.portfolios.map((p) => p.id)).size !== data.portfolios.length
  )
    throw Error("Invalid or duplicate portfolios.");
  if (
    data.trades.some((t) => !t) ||
    new Set(data.trades.map((t) => t.id)).size !== data.trades.length
  )
    throw Error("Invalid or duplicate transactions.");
  const symbol = (s) => typeof s === "string" && /^[A-Z0-9.^=-]{1,24}$/.test(s);
  if (
    data.preferences &&
    (!CURRENCIES.includes(data.preferences.currency) ||
      !Array.isArray(data.preferences.benchmarks) ||
      data.preferences.benchmarks.length > 8 ||
      !data.preferences.benchmarks.every(symbol) ||
      new Set(data.preferences.benchmarks).size !==
        data.preferences.benchmarks.length)
  )
    throw Error("Invalid currency or benchmark preferences.");
  if (
    data.scenarios &&
    (!Array.isArray(data.scenarios) ||
      data.scenarios.length > 20 ||
      data.scenarios.some(
        (s) =>
          !s ||
          typeof s.id !== "string" ||
          typeof s.name !== "string" ||
          !s.name.trim() ||
          s.name.length > 80 ||
          typeof s.scope !== "string" ||
          !Array.isArray(s.rules) ||
          s.rules.length > 8 ||
          s.rules.some(
            (r) =>
              !r ||
              typeof r.id !== "string" ||
              !symbol(r.sourceSymbol) ||
              !symbol(r.targetSymbol) ||
              typeof r.enabled !== "boolean" ||
              !Number.isFinite(r.swapPercentage) ||
              r.swapPercentage < 0 ||
              r.swapPercentage > 100,
          ),
      ))
  )
    throw Error("Invalid saved scenarios.");
  validateTrades(data.trades, data.portfolios);
}
// Retain the same proportion of the hypothetical holding on each sale.
export function substitute(trades, quotes, source, target, percentage) {
  const inventory = new Map(),
    output = [];
  const fraction = percentage / 100;
  for (const t of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.symbol !== source || source === target || fraction === 0) {
      output.push(t);
      continue;
    }
    const price = quotes[target]?.history?.findLast(
      (p) => p.date <= t.date,
    )?.price;
    if (!price) return null;
    const key = t.portfolioId + ":" + source,
      p = inventory.get(key) || { actual: 0, hypothetical: 0 };
    let quantity;
    if (t.type === "BUY") {
      quantity = (t.quantity * t.unitPrice * fraction) / price;
      p.actual += t.quantity;
      p.hypothetical += quantity;
    } else {
      quantity = p.actual ? (p.hypothetical * t.quantity) / p.actual : 0;
      p.actual -= t.quantity;
      p.hypothetical -= quantity;
    }
    inventory.set(key, p);
    if (fraction < 1)
      output.push({
        ...t,
        quantity: t.quantity * (1 - fraction),
        fee: t.fee * (1 - fraction),
      });
    output.push({
      ...t,
      symbol: target,
      quantity,
      unitPrice: price,
      fee: t.fee * fraction,
    });
  }
  return output;
}
export function ledger(trades, quotes = {}) {
  const lots = new Map();
  let realized = 0,
    contributions = 0,
    fees = 0;
  for (const t of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${t.portfolioId}:${t.symbol}`,
      p = lots.get(key) || {
        symbol: t.symbol,
        name: t.name,
        quantity: 0,
        cost: 0,
      };
    fees += t.fee;
    if (t.type === "BUY") {
      p.quantity += t.quantity;
      p.cost += t.quantity * t.unitPrice + t.fee;
      contributions += t.quantity * t.unitPrice + t.fee;
    } else {
      const basis = p.quantity ? (p.cost * t.quantity) / p.quantity : 0;
      p.quantity -= t.quantity;
      p.cost -= basis;
      realized += t.quantity * t.unitPrice - t.fee - basis;
      contributions -= t.quantity * t.unitPrice - t.fee;
    }
    lots.set(key, p);
  }
  const merged = new Map();
  for (const p of lots.values()) {
    const a = merged.get(p.symbol) || { ...p, quantity: 0, cost: 0 };
    a.quantity += p.quantity;
    a.cost += p.cost;
    merged.set(p.symbol, a);
  }
  const holdings = [...merged.values()]
    .filter((p) => p.quantity > 1e-8)
    .map((p) => ({
      ...p,
      price: quotes[p.symbol]?.currentPrice ?? null,
      value: quotes[p.symbol]
        ? p.quantity * quotes[p.symbol].currentPrice
        : null,
    }));
  const value = holdings.reduce((s, p) => s + (p.value || 0), 0),
    cost = holdings.reduce((s, p) => s + p.cost, 0);
  return {
    holdings,
    value,
    cost,
    realized,
    contributions,
    fees,
    complete: holdings.every((p) => p.value !== null),
    profit: value - cost,
  };
}
export function timeline(trades, quotes) {
  if (!trades.length) return [];
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date)),
    symbols = [...new Set(sorted.map((t) => t.symbol))];
  if (
    symbols.some(
      (s) =>
        !quotes[s]?.history?.length ||
        quotes[s].history[0].date > sorted.find((t) => t.symbol === s).date,
    )
  )
    return [];
  const dates = [
    ...new Set(
      symbols
        .flatMap((s) => quotes[s].history.map((p) => p.date))
        .concat(sorted.map((t) => t.date)),
    ),
  ]
    .filter(
      (d) => d >= sorted[0].date && d <= new Date().toISOString().slice(0, 10),
    )
    .sort();
  const quantities = {},
    prices = {},
    cursors = {};
  let ti = 0,
    net = 0,
    previous = 0,
    index = 100,
    peak = 100;
  return dates.map((date) => {
    for (const s of symbols) {
      let i = cursors[s] || 0;
      const h = quotes[s].history;
      while (i < h.length && h[i].date <= date) {
        prices[s] = h[i].price;
        i++;
      }
      cursors[s] = i;
    }
    let flow = 0;
    while (ti < sorted.length && sorted[ti].date <= date) {
      const t = sorted[ti++];
      quantities[t.symbol] =
        (quantities[t.symbol] || 0) +
        (t.type === "BUY" ? t.quantity : -t.quantity);
      flow +=
        t.type === "BUY"
          ? t.quantity * t.unitPrice + t.fee
          : -(t.quantity * t.unitPrice - t.fee);
    }
    const value = symbols.reduce(
      (sum, s) => sum + (quantities[s] || 0) * (prices[s] || 0),
      0,
    );
    net += flow;
    // End-of-day external flows: a complete sale still captures its gain/loss.
    if (previous > 0) index *= Math.max(0, (value - flow) / previous);
    else if (flow > 0) index *= value / flow;
    peak = Math.max(peak, index);
    previous = value;
    return {
      date,
      value,
      net,
      return: (index / 100 - 1) * 100,
      drawdown: (index / peak - 1) * 100,
    };
  });
}
