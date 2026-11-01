import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteQuality, validateLiveTick } from "../shared/quoteQuality.mjs";
const now = Date.parse("2026-10-30T12:00:00Z");
test("zero reported delay on an unofficial snapshot is not called verified live", () => {
  assert.equal(
    quoteQuality(
      {
        source: "Yahoo Finance (unofficial)",
        delay: 0,
        fetchedAt: new Date(now).toISOString(),
      },
      now,
    ).kind,
    "unverified",
  );
  assert.equal(
    quoteQuality(
      {
        source: "Yahoo Finance (unofficial)",
        delay: 15,
        fetchedAt: new Date(now).toISOString(),
      },
      now,
    ).label,
    "15 min delayed",
  );
});
test("closed sessions and aged snapshots are distinguishable", () => {
  assert.equal(
    quoteQuality(
      {
        source: "Yahoo Finance (unofficial)",
        sessionStart: (now - 86400000) / 1000,
        sessionEnd: (now - 3600000) / 1000,
      },
      now,
    ).kind,
    "closed",
  );
  assert.equal(
    quoteQuality(
      {
        source: "Yahoo Finance (unofficial)",
        fetchedAt: new Date(now - 600000).toISOString(),
      },
      now,
    ).kind,
    "stale",
  );
});
test("live trades require valid price, pair and provider timestamp", () => {
  const raw = {
    type: "ticker",
    product_id: "BTC-EUR",
    price: "80000",
    time: new Date(now).toISOString(),
    best_bid: "79999",
    best_ask: "80001",
  };
  const tick = validateLiveTick(raw, now);
  assert.equal(tick.price, 80000);
  assert.equal(tick.source, "Coinbase Exchange");
  assert.equal(validateLiveTick({ ...raw, price: "NaN" }, now), null);
  assert.equal(
    validateLiveTick(
      { ...raw, time: new Date(now + 60000).toISOString() },
      now,
    ),
    null,
  );
  assert.equal(validateLiveTick({ ...raw, product_id: "BTC-ABC" }, now), null);
});
test("stream reconnect and stale ticks cannot remain labeled live", () => {
  const q = {
    quality: "real-time",
    source: "Coinbase Exchange",
    asOf: new Date(now).toISOString(),
    receivedAt: new Date(now).toISOString(),
    liveStatus: "connected",
  };
  assert.equal(quoteQuality(q, now).kind, "live");
  assert.equal(
    quoteQuality({ ...q, liveStatus: "reconnecting" }, now).kind,
    "stale",
  );
  assert.equal(quoteQuality(q, now + 100000).kind, "stale");
  assert.equal(
    quoteQuality({ source: "Illustrative demo" }, now).kind,
    "illustrative",
  );
});
