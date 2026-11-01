import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDelimited,
  parseXetra,
  parseNasdaq,
  parseCoinbase,
  filterCatalog,
} from "../shared/catalog.mjs";
test("reference CSV supports quoted delimiters and escaped quotes", () => {
  assert.deepEqual(parseDelimited('a;b\n"one; two";"a ""quote"""\r\n'), [
    ["a", "b"],
    ["one; two", 'a "quote"'],
  ]);
});
test("Xetra reference data resolves VVSM with venue, currency and ISIN", () => {
  const csv =
    "Market:;XETR\nDate Last Update:;31.10.2026\nInstrument Status;Instrument;ISIN;WKN;Mnemonic;Currency;Instrument Type\nActive;VanEck Semiconductor UCITS ETF;IE00BMC38736;000A2QC5J;VVSM;EUR;ETF\nInactive;Old fund;IE0000000000;000000000;OLD;EUR;ETF\n";
  const data = parseXetra(csv);
  assert.equal(data.quotes.length, 1);
  assert.equal(data.quotes[0].symbol, "VVSM.DE");
  assert.equal(data.quotes[0].wkn, "A2QC5J");
  assert.equal(data.quotes[0].isin, "IE00BMC38736");
  assert.equal(data.quotes[0].providerSymbolVerified, false);
  assert.equal(filterCatalog(data.quotes, { q: "IE00BMC38736" }).total, 1);
  assert.equal(
    filterCatalog(data.quotes, { q: "vvsm" }).quotes[0].exchange,
    "Xetra",
  );
});
test("US directory excludes test issues and preserves ETF classifications", () => {
  const csv =
    "Nasdaq Traded|Symbol|Security Name|Listing Exchange|ETF|Test Issue\nY|NEWETF|A new fund|P|Y|N\nY|TEST|Test security|Q|N|Y\nY|BRK.B|Berkshire Hathaway|N|N|N\nFile Creation Time: today|||||";
  const data = parseNasdaq(csv);
  assert.equal(data.quotes.length, 2);
  assert.equal(data.quotes[0].type, "ETF");
  assert.equal(data.quotes[1].symbol, "BRK-B");
});
test("browse pagination never truncates the universe to quick picks", () => {
  const quotes = Array.from({ length: 205 }, (_, i) => ({
    symbol: "ASSET" + i,
    name: "Fund " + String(i).padStart(3, "0"),
    type: i % 2 ? "Stock" : "ETF",
    exchange: "Xetra",
    currency: "EUR",
  }));
  const a = filterCatalog(quotes, { offset: 0, limit: 30 }),
    b = filterCatalog(quotes, { offset: 30, limit: 30 });
  assert.equal(a.total, 205);
  assert.equal(a.hasMore, true);
  assert.equal(b.quotes[0].symbol, "ASSET30");
  assert.equal(filterCatalog(quotes, { type: "ETF" }).total, 103);
});
test("crypto directory includes active supported fiat pairs only", () => {
  const data = parseCoinbase([
    {
      id: "SOL-EUR",
      base_currency: "SOL",
      quote_currency: "EUR",
      status: "online",
    },
    { id: "OLD-USD", quote_currency: "USD", status: "delisted" },
    { id: "ABC-BTC", quote_currency: "BTC", status: "online" },
  ]);
  assert.equal(data.quotes.length, 1);
  assert.equal(data.quotes[0].symbol, "SOL-EUR");
});
