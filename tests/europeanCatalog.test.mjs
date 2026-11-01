import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLondon,
  parseEuronext,
  parseSwiss,
  parseNordic,
  parseWarsaw,
} from "../shared/europeanCatalog.mjs";
import {
  CURRENCIES,
  marketForSymbol,
  europeanCoverage,
} from "../shared/markets.mjs";
import { filterCatalog } from "../shared/catalog.mjs";
import { fxRate } from "../shared/analytics.mjs";
import { validateTrades } from "../shared/finance.mjs";
import { quoteQuality } from "../shared/quoteQuality.mjs";
test("Warsaw table preserves local ticker, ISIN and PLN while excluding layout rows", () => {
  const data = parseWarsaw(
    '<table><tr><td>Header</td></tr><tr><td id="id_Nazwa"><a><b>ETFBW20TR </b></a></td><td id="id_ISIN">PLBTETF00015</td><td id="id_Waluta">PLN</td></tr></table>',
  );
  assert.equal(data.quotes.length, 1);
  assert.equal(data.quotes[0].symbol, "ETFBW20TR.WA");
  assert.equal(data.quotes[0].currency, "PLN");
  const etc = parseWarsaw(
    '<tr><td id="id_Nazwa">ETCGLDRMAU</td><td id="id_ISIN">XS2115336336</td><td id="id_Waluta">PLN</td></tr>',
  );
  assert.equal(etc.quotes[0].type, "ETC");
  assert.throws(() => parseWarsaw("<html>Unavailable</html>"));
});

test("London directory preserves pence and distinguishes ETFs from debt ETPs", () => {
  const rows = [
    ["Disclaimer"],
    ["ISIN Code", "TIDM", "Currency", "Instrument Name", "Mifir Identifier"],
    ["IE00BMC38736", "SMH", "USD", "VanEck Semiconductor UCITS ETF", "ETFS"],
    ["XS0000000001", "GOLD", "GBX", "Gold ETC", "ETCS"],
  ];
  const { quotes } = parseLondon(rows);
  assert.equal(quotes[0].symbol, "SMH.L");
  assert.equal(quotes[0].country, "GB");
  assert.equal(quotes[1].currency, "GBX");
  assert.equal(quotes[1].type, "ETC");
  assert.throws(() => parseLondon([["Unknown format"]]));
});
test("Euronext expands shared national listings, handles ETF Plus and excludes ambiguous currency segments", () => {
  const csv =
    "Instrument Fullname;ISIN;Symbol;Market;Currency\nEuropean Trackers\n31 Oct 2026\nEnd of day\nWorld UCITS ETF;IE00BK5BQT80;VWCE;ETF Plus;EUR\nBond UCITS ETF;IE00BMC38736;BOND;Euronext Paris, Amsterdam;EUR\nBond UCITS ETF;IE00BMC38736;BOND;Euronext Paris - Multi-currency Trading;USD\n";
  const data = parseEuronext(csv);
  assert.deepEqual(
    data.quotes.map((q) => q.symbol),
    ["VWCE.MI", "BOND.AS", "BOND.PA"],
  );
  assert.equal(data.skipped, 1);
  assert.equal(data.sourceDate, "31 Oct 2026");
  assert.equal(
    filterCatalog(data.quotes, { country: "IT", type: "ETF" }).total,
    1,
  );
});
test("Swiss currency-line mapping uses Reuters identity and rejects truncated directories", () => {
  const raw = {
    colNames: [
      "FundLongName",
      "ValorSymbol",
      "FundReutersTicker",
      "ISIN",
      "TradingBaseCurrency",
    ],
    totalRows: 2,
    rowData: [
      ["Fund UCITS ETF", "FUND", "FUNDC.S", "IE00BMC38736", "CHF"],
      ["Fund UCITS ETF", "FUND", "FUND.S", "IE00BMC38736", "USD"],
    ],
  };
  const { quotes } = parseSwiss(raw);
  assert.deepEqual(
    quotes.map((q) => q.symbol),
    ["FUNDC.SW", "FUND.SW"],
  );
  assert.equal(quotes[0].currency, "CHF");
  assert.throws(() => parseSwiss({ ...raw, totalRows: 3 }), /incomplete/);
});
test("Nordic venue comes from explicit source market, never from the trading currency", () => {
  const raw = {
    data: {
      instrumentListing: {
        rows: [
          {
            symbol: "XACT WORLD",
            fullName: "World ETF",
            currency: "EUR",
            isin: "IE00BMC38736",
          },
        ],
      },
      pagination: { total: 1 },
    },
  };
  const { quotes } = parseNordic(raw, "STO");
  assert.equal(quotes[0].symbol, "XACT-WORLD.ST");
  assert.equal(quotes[0].country, "SE");
  assert.throws(() => parseNordic(raw));
  assert.throws(
    () =>
      parseNordic({ data: { ...raw.data, pagination: { total: 2 } } }, "STO"),
    /pagination/,
  );
});
test("published delays distinguish 15, 20 and 30 minute venues without implying universal coverage", () => {
  assert.equal(marketForSymbol("VVSM.DE").delayMinutes, 15);
  assert.equal(marketForSymbol("SMH.L").delayMinutes, 20);
  assert.equal(marketForSymbol("VWCE.MI").delayMinutes, 20);
  assert.equal(marketForSymbol("CSSPX.SW").delayMinutes, 30);
  const coverage = europeanCoverage([]);
  assert.equal(
    coverage.find((m) => m.country === "HR").directoryStatus,
    "Coverage gap",
  );
  assert.equal(
    coverage.find((m) => m.mic === "XWAR").directoryStatus,
    "Global lookup only",
  );
  assert.equal(
    quoteQuality({
      source: "Yahoo Finance (unofficial)",
      documentedDelay: 30,
      delay: 0,
    }).label,
    "30 min delayed",
  );
  assert.equal(
    quoteQuality({
      source: "Yahoo Finance (unofficial)",
      documentedDelay: 0,
      delay: 0,
    }).kind,
    "unverified",
  );
});
test("European local currencies validate and use historical cross rates", () => {
  for (const currency of [
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "ISK",
    "RON",
    "TRY",
  ]) {
    assert.ok(CURRENCIES.includes(currency));
    assert.doesNotThrow(() =>
      validateTrades(
        [
          {
            id: currency,
            portfolioId: "p",
            symbol: "ETF.ST",
            name: "ETF",
            date: "2026-01-01",
            type: "BUY",
            quantity: 1,
            unitPrice: 100,
            fee: 0,
            currency,
          },
        ],
        [{ id: "p" }],
      ),
    );
  }
  assert.equal(
    fxRate(
      {
        SEK: [
          { date: "2026-01-01", rate: 10 },
          { date: "2026-01-03", rate: 20 },
        ],
      },
      "SEK",
      "EUR",
      "2026-01-02",
    ),
    0.1,
  );
});
