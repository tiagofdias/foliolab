import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fxRate,
  convertData,
  periodMetrics,
  comparisonSeries,
  monthlyReturns,
  simulateRules,
  correlationMatrix,
  benchmarkMetrics,
} from "../shared/analytics.mjs";
import {
  ledger,
  timeline,
  substitute,
  validateTrades,
  validateWorkspace,
} from "../shared/finance.mjs";
const fx = {
  USD: [
    { date: "2024-01-01", rate: 2 },
    { date: "2024-01-03", rate: 4 },
  ],
  GBP: [{ date: "2024-01-01", rate: 0.8 }],
  CHF: [{ date: "2024-01-01", rate: 0.9 }],
};
const trade = {
  id: "1",
  symbol: "AAA",
  name: "Asset",
  portfolioId: "p",
  type: "BUY",
  quantity: 10,
  unitPrice: 20,
  fee: 2,
  date: "2024-01-01",
  currency: "USD",
};
test("EUR/USD cross rates use historical rates, never future observations", () => {
  assert.equal(fxRate(fx, "USD", "EUR", "2024-01-02"), 0.5);
  assert.equal(fxRate(fx, "USD", "EUR", "2024-01-03"), 0.25);
  assert.equal(fxRate(fx, "EUR", "USD", "2024-01-02"), 2);
  assert.equal(fxRate(fx, "USD", "EUR", "2023-12-31"), null);
  assert.equal(fxRate(fx, "EUR", "EUR", "1900-01-01"), 1);
});
test("British pence are scaled before currency conversion", () => {
  assert.equal(fxRate(fx, "GBp", "GBP", "2024-01-01"), 0.01);
  assert.equal(fxRate(fx, "GBp", "EUR", "2024-01-01"), 0.0125);
});
test("foreign acquisition costs use trade-date FX; holdings use current FX", () => {
  const q = {
    AAA: {
      currency: "USD",
      currentPrice: 40,
      history: [
        { date: "2024-01-01", price: 20 },
        { date: "2024-01-03", price: 40 },
      ],
    },
  };
  const data = convertData([trade], q, fx, "EUR");
  assert.equal(data.trades[0].unitPrice, 10);
  assert.equal(data.trades[0].fee, 1);
  assert.equal(data.quotes.AAA.currentPrice, 10);
  assert.equal(data.quotes.AAA.history[0].price, 10);
  const s = ledger(data.trades, data.quotes);
  assert.equal(s.cost, 101);
  assert.equal(s.value, 100);
  assert.equal(s.profit, -1);
});
test("a changing FX rate contributes to reporting-currency returns", () => {
  const q = {
    AAA: {
      currency: "USD",
      currentPrice: 40,
      history: [
        { date: "2024-01-01", price: 20 },
        { date: "2024-01-03", price: 40 },
      ],
    },
  };
  const data = convertData([{ ...trade, fee: 0 }], q, fx, "EUR");
  const h = timeline(data.trades, data.quotes);
  assert.equal(h.at(-1).return, 0);
});
test("missing conversion rates are explicit instead of 1:1 defaults", () => {
  const d = convertData([trade], {}, {}, "EUR");
  assert.equal(d.missing.length, 1);
  assert.ok(Number.isNaN(d.trades[0].unitPrice));
});
test("EUR trades pass server-side validation", () => {
  validateTrades([{ ...trade, currency: "EUR" }], [{ id: "p" }]);
});
test("selected-period results exclude external flows and reset drawdown peak", () => {
  const h = [
    { date: "2024-01-01", value: 100, net: 100, return: 0, drawdown: 0 },
    { date: "2024-01-02", value: 210, net: 200, return: 10, drawdown: 0 },
    { date: "2024-01-03", value: 189, net: 200, return: -1, drawdown: -10 },
  ];
  const s = periodMetrics(h);
  assert.equal(s.profit, -11);
  assert.equal(s.flows, 100);
  assert.ok(Math.abs(s.return + 1) < 1e-8);
  assert.ok(Math.abs(s.drawdown + 10) < 1e-8);
  const selected = periodMetrics(h.slice(1));
  assert.ok(Math.abs(selected.return + 10) < 1e-8);
  assert.equal(selected.flows, 0);
  assert.equal(selected.profit, -21);
  assert.equal(selected.annualReturn, null);
});
test("benchmarks with insufficient history remain unavailable", () => {
  assert.deepEqual(
    comparisonSeries({ history: [{ date: "2024-01-02", price: 10 }] }, [
      "2024-01-01",
    ]),
    [],
  );
  const b = comparisonSeries(
    {
      history: [
        { date: "2024-01-01", price: 10 },
        { date: "2024-01-03", price: 12 },
      ],
    },
    ["2024-01-01", "2024-01-02", "2024-01-03"],
  );
  assert.deepEqual(
    b.map((p) => p.value),
    [100, 100, 120],
  );
});
test("monthly returns chain geometrically rather than adding percentages", () => {
  const h = [
    { date: "2024-01-01", return: 10 },
    { date: "2024-02-01", return: 21 },
  ];
  const rows = monthlyReturns(h);
  assert.ok(Math.abs(rows[0].return - 10) < 1e-8);
  assert.ok(Math.abs(rows[1].return - 10) < 1e-8);
});
test("multiple substitution rules do not cascade from A to B to C", () => {
  const quotes = {
    BBB: { history: [{ date: "2024-01-01", price: 10 }] },
    CCC: { history: [{ date: "2024-01-01", price: 10 }] },
  };
  const rules = [
    {
      sourceSymbol: "AAA",
      targetSymbol: "BBB",
      swapPercentage: 100,
      enabled: true,
    },
    {
      sourceSymbol: "BBB",
      targetSymbol: "CCC",
      swapPercentage: 100,
      enabled: true,
    },
  ];
  const t = [
    { ...trade, fee: 0 },
    { ...trade, id: "2", symbol: "BBB", fee: 0 },
  ];
  const output = simulateRules(t, quotes, rules, substitute);
  assert.equal(output.find((t) => t.id === "1").symbol, "BBB");
  assert.equal(output.find((t) => t.id === "2").symbol, "CCC");
  assert.throws(
    () => simulateRules(t, quotes, [rules[0], rules[0]], substitute),
    /one rule/,
  );
});
test("correlation uses common dates and rejects undersized samples", () => {
  const q = {
    A: {
      history: [
        { date: "2024-01-01", price: 10 },
        { date: "2024-01-02", price: 11 },
      ],
    },
    B: {
      history: [
        { date: "2024-01-01", price: 10 },
        { date: "2024-01-03", price: 12 },
      ],
    },
  };
  const r = correlationMatrix(["A", "B"], q, "2024-01-01", "2024-01-04");
  assert.equal(r.observations, 0);
  assert.equal(r.values[0][1], null);
});
test("identical benchmark and portfolio return series have beta one", () => {
  const dates = [
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      "2024-01-04",
      "2024-01-05",
    ],
    prices = [100, 110, 99, 108.9, 105];
  const series = dates.map((date, i) => ({
    date,
    value: prices[i],
    net: 100,
    return: prices[i] - 100,
    drawdown: 0,
  }));
  const stats = benchmarkMetrics(series, {
    history: dates.map((date, i) => ({ date, price: prices[i] })),
  });
  assert.ok(Math.abs(stats.beta - 1) < 1e-10);
  assert.ok(Math.abs(stats.correlation - 1) < 1e-10);
  assert.ok(stats.trackingError < 1e-8);
});
test("malformed saved scenarios and duplicate benchmarks cannot be imported", () => {
  const base = {
    portfolios: [{ id: "p", name: "Portfolio" }],
    trades: [trade],
  };
  assert.throws(() =>
    validateWorkspace({
      ...base,
      preferences: { currency: "EUR", benchmarks: ["^GSPC", "^GSPC"] },
    }),
  );
  assert.throws(() =>
    validateWorkspace({
      ...base,
      scenarios: [
        {
          id: "s",
          name: "S",
          scope: "ALL",
          rules: [
            {
              id: "r",
              sourceSymbol: "AAA",
              targetSymbol: "BBB",
              enabled: true,
              swapPercentage: 101,
            },
          ],
        },
      ],
    }),
  );
  validateWorkspace({
    ...base,
    preferences: { currency: "EUR", benchmarks: ["^GSPC", "VWCE.DE"] },
    scenarios: [],
  });
});
