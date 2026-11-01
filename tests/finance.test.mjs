import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ledger,
  timeline,
  validateTrades,
  substitute,
} from "../shared/finance.mjs";
const p = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
];
const trade = (
  id,
  type,
  quantity,
  price,
  date = "2025-01-01",
  portfolioId = "a",
) => ({
  id,
  type,
  quantity,
  unitPrice: price,
  date,
  portfolioId,
  symbol: "AAA",
  name: "Asset",
  currency: "USD",
  fee: 0,
});
test("chronological average cost survives a sale and later repurchase", () => {
  const s = ledger(
    [
      trade("1", "BUY", 10, 10),
      trade("2", "SELL", 5, 20, "2025-01-02"),
      trade("3", "BUY", 5, 30, "2025-01-03"),
    ],
    { AAA: { currentPrice: 25 } },
  );
  assert.equal(s.cost, 200);
  assert.equal(s.realized, 50);
  assert.equal(s.value, 250);
  assert.equal(s.profit, 50);
});
test("cost basis is isolated by portfolio before consolidation", () => {
  const s = ledger(
    [
      trade("1", "BUY", 10, 10),
      trade("2", "BUY", 10, 30, "2025-01-01", "b"),
      trade("3", "SELL", 5, 20, "2025-01-02"),
    ],
    { AAA: { currentPrice: 20 } },
  );
  assert.equal(s.realized, 50);
  assert.equal(s.cost, 350);
});
test("fees enter acquisition basis and reduce sale proceeds", () => {
  const a = { ...trade("1", "BUY", 10, 10), fee: 2 },
    b = { ...trade("2", "SELL", 10, 20, "2025-01-02"), fee: 3 };
  const s = ledger([a, b]);
  assert.equal(s.realized, 95);
  assert.equal(s.cost, 0);
  assert.equal(s.fees, 5);
});
test("missing quotes are incomplete, never fabricated", () => {
  const s = ledger([trade("1", "BUY", 10, 10)]);
  assert.equal(s.complete, false);
  assert.equal(s.holdings[0].value, null);
});
test("oversells and deleting a needed purchase are rejected per portfolio", () => {
  assert.throws(
    () => validateTrades([trade("1", "SELL", 1, 10)], p),
    /Insufficient/,
  );
  assert.throws(
    () =>
      validateTrades(
        [
          trade("1", "BUY", 1, 10),
          trade("2", "SELL", 1, 10, "2025-01-02", "b"),
        ],
        p,
      ),
    /Insufficient/,
  );
});
test("invalid numeric and calendar inputs rejected", () => {
  assert.throws(() => validateTrades([trade("1", "BUY", NaN, 10)], p));
  assert.throws(() =>
    validateTrades([trade("1", "BUY", 1, 10, "2025-02-30")], p),
  );
});
test("external contributions do not appear as investment returns", () => {
  const q = {
    AAA: {
      history: [
        { date: "2025-01-01", price: 10 },
        { date: "2025-01-02", price: 10 },
        { date: "2025-01-03", price: 11 },
      ],
    },
  };
  const h = timeline(
    [trade("1", "BUY", 10, 10), trade("2", "BUY", 10, 10, "2025-01-02")],
    q,
  );
  assert.equal(h[1].return, 0);
  assert.ok(Math.abs(h[2].return - 10) < 1e-8);
  assert.equal(h[2].value, 220);
});
test("history starting after acquisition is withheld", () => {
  assert.deepEqual(
    timeline([trade("1", "BUY", 10, 10)], {
      AAA: { history: [{ date: "2025-01-02", price: 11 }] },
    }),
    [],
  );
});
test("what-if sells proportionally rather than creating negative target shares", () => {
  const q = {
    BBB: {
      history: [
        { date: "2025-01-01", price: 20 },
        { date: "2025-01-02", price: 5 },
      ],
    },
  };
  const s = substitute(
    [trade("1", "BUY", 10, 10), trade("2", "SELL", 10, 20, "2025-01-02")],
    q,
    "AAA",
    "BBB",
    100,
  );
  assert.equal(s[0].quantity, 5);
  assert.equal(s[1].quantity, 5);
  assert.equal(ledger(s).holdings.length, 0);
});
test("zero percent substitution preserves actual transactions", () => {
  const t = [trade("1", "BUY", 10, 10)];
  assert.deepEqual(substitute(t, {}, "AAA", "BBB", 0), t);
});
test("liquidation captures realized return even after all shares are sold", () => {
  const q = {
    AAA: {
      history: [
        { date: "2025-01-01", price: 10 },
        { date: "2025-01-02", price: 20 },
      ],
    },
  };
  const h = timeline(
    [trade("1", "BUY", 10, 10), trade("2", "SELL", 10, 20, "2025-01-02")],
    q,
  );
  assert.equal(h[1].value, 0);
  assert.equal(h[1].return, 100);
});
